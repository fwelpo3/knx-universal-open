import { GENERATED_Z8 } from './catalog/generated-z8.ts';
import type {
  DptAbsentValue, DptDecodedField, DptDefinition, DptIssue,
  DptZ8Command, DptZ8Status,
} from './types.ts';

export const z8Catalog = GENERATED_Z8;

export function decodeZ8(raw: number, mode: 'status' | 'command', issues: DptIssue[], field: string): DptZ8Status | DptZ8Command {
  if (mode === 'command') return decodeCommand(raw, issues, field);
  return decodeStatus(raw, issues, field);
}

export function encodeZ8(value: unknown, mode: 'status' | 'command'): number {
  return mode === 'command' ? encodeCommand(value) : encodeStatus(value);
}

export function applyZ8MainSemantics(
  definition: DptDefinition,
  fields: Record<string, unknown>,
  details: DptDecodedField[],
  issues: DptIssue[],
  mode: 'status' | 'command',
): void {
  const z8Field = definition.fields.find((field) => field.shape === 'z8');
  if (!z8Field) return;
  const main = findMainField(definition, z8Field.name);
  if (!main) return;
  const z8 = fields[z8Field.name] as DptZ8Status | DptZ8Command;
  const detail = details.find((item) => item.name === main.name);
  if (!detail || !z8) return;

  if (mode === 'command' && z8.kind === 'command' && z8.mainValue === 'dont-care') {
    exemptMain(issues, main.name);
    const state: DptAbsentValue = { kind: 'state', state: 'dont-care', reason: z8.label, raw: detail.raw };
    fields[main.name] = state; Object.assign(detail, { value: state, state: 'dont-care' });
    return;
  }
  if (mode !== 'status' || z8.kind !== 'status') return;
  if (z8.OutOfService) {
    exemptMain(issues, main.name);
    const state: DptAbsentValue = { kind: 'state', state: 'absent', reason: 'OutOfService', raw: detail.raw };
    fields[main.name] = state; Object.assign(detail, { value: state, state: 'absent', valid: false });
    return;
  }
  if (z8.Fault && !z8.Overridden) {
    exemptMain(issues, main.name);
    const raw = Number(detail.raw ?? 0n);
    const meaning = z8Catalog.faultInfo.entries.find((item) => item.code === raw)?.label;
    const state: DptAbsentValue = { kind: 'state', state: 'fault-info', reason: 'Fault', raw, meaning };
    fields[main.name] = state; Object.assign(detail, { value: state, state: 'fault-info', valid: false });
  }
}

function decodeStatus(raw: number, issues: DptIssue[], field: string): DptZ8Status {
  const bits = z8Catalog.statusBits;
  if ((raw & bits.reservedMask) !== 0) issues.push({
    level: 'error', code: 'z8-reserved', field,
    message: `${field}: reserved Z8 status bits set (0x${(raw & bits.reservedMask).toString(16).toUpperCase()})`,
  });
  const out = { kind: 'status', raw } as DptZ8Status;
  for (const bit of bits.bits) (out as unknown as Record<string, unknown>)[bit.name] = ((raw >> bit.bit) & 1) === bit.activeValue;
  if (out.OutOfService && out.Fault) illegal(issues, field, 'OutOfService', 'Fault');
  if (out.OutOfService && out.Overridden) illegal(issues, field, 'OutOfService', 'Overridden');
  return out;
}

function decodeCommand(raw: number, issues: DptIssue[], field: string): DptZ8Command {
  const command = z8Catalog.commands.find((item) => item.code === raw);
  if (!command) {
    issues.push({ level: 'error', code: 'z8-unknown-command', field, message: `${field}: unknown Z8 command ${raw}` });
    return { kind: 'command', code: raw, label: 'reserved', mainValue: 'dont-care' };
  }
  return { kind: 'command', code: command.code, label: command.label, mainValue: command.mainValue };
}

function encodeStatus(value: unknown): number {
  if (typeof value === 'number') return checkedByte(value);
  const input = objectValue(value); if (typeof input.raw === 'number') return checkedByte(input.raw);
  let raw = 0;
  for (const bit of z8Catalog.statusBits.bits) if (Boolean(input[bit.name]) === Boolean(bit.activeValue)) raw |= 1 << bit.bit;
  if ((raw & z8Catalog.statusBits.reservedMask) !== 0) throw new RangeError('Reserved Z8 status bits must be zero');
  if ((raw & 0x01) && (raw & 0x02)) throw new RangeError('Illegal Z8 status: OutOfService with Fault');
  if ((raw & 0x01) && (raw & 0x04)) throw new RangeError('Illegal Z8 status: OutOfService with Overridden');
  return raw;
}

function encodeCommand(value: unknown): number {
  if (typeof value === 'number') return requireCommand(value).code;
  if (typeof value === 'string') {
    const found = z8Catalog.commands.find((item) => item.label.toLowerCase() === value.toLowerCase());
    if (!found) throw new RangeError(`Unknown Z8 command '${value}'`); return found.code;
  }
  const input = objectValue(value);
  if (typeof input.code === 'number') return requireCommand(input.code).code;
  if (typeof input.label === 'string') return encodeCommand(input.label);
  throw new TypeError('Z8 command requires code or label');
}

function requireCommand(code: number) {
  const found = z8Catalog.commands.find((item) => item.code === code);
  if (!found) throw new RangeError(`Unknown Z8 command ${code}`); return found;
}
function checkedByte(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new RangeError('Z8 value must be 0..255'); return value;
}
function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
function illegal(issues: DptIssue[], field: string, first: string, second: string): void {
  issues.push({ level: 'error', code: 'z8-illegal-combination', field, message: `${field}: illegal ${first} + ${second}` });
}
function findMainField(definition: DptDefinition, z8Name: string) {
  return definition.fields.find((field) => field.role === 'main')
    || definition.fields.find((field) => field.name !== z8Name && !field.shape.startsWith('reserved:'));
}
function exemptMain(issues: DptIssue[], field: string): void {
  for (let index = issues.length - 1; index >= 0; index -= 1) if (issues[index].field === field) issues.splice(index, 1);
}
