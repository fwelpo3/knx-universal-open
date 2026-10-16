import { extractBits, insertBits } from './bits.ts';
import { fieldBitWidth } from './mapping.ts';
import { decodeScalarSemantic, encodeScalarSemantic } from './semantics.ts';
import { decodeChars, encodeChars } from './text.ts';
import { decodeZ8, encodeZ8 } from './z8.ts';
import type { DptDecodeOptions, DptDecodedField, DptFieldDefinition, DptIssue } from './types.ts';

export type DecodeState = {
  bytes: Uint8Array;
  issues: DptIssue[];
  details: DptDecodedField[];
  options: DptDecodeOptions;
};

export function decodeFields(
  fields: DptFieldDefinition[],
  state: DecodeState,
  start = 0,
  prefix = '',
): [Record<string, unknown>, number] {
  const out: Record<string, unknown> = {};
  let offset = start;
  for (const field of fields) {
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    const [value, next] = decodeField(field, state, offset, path);
    offset = next;
    if (!field.shape.startsWith('reserved:')) out[field.name] = value;
  }
  return [out, offset];
}

function decodeField(
  field: DptFieldDefinition,
  state: DecodeState,
  offset: number,
  path: string,
): [unknown, number] {
  const bits = fieldBitWidth(field);
  if (field.shape.startsWith('scalar:')) {
    const raw = extractBits(state.bytes, offset, bits!);
    const detail = decodeScalarSemantic(field, raw, state.issues, path, state.options.numericMode || 'native');
    state.details.push(detail);
    return [detail.value, offset + bits!];
  }
  if (field.shape.startsWith('reserved:')) {
    const raw = extractBits(state.bytes, offset, bits!);
    if (raw !== 0n && !field.shape.endsWith(':ignore')) {
      state.issues.push({
        level: 'error', code: 'reserved-bits', field: field.name, path,
        message: `${path}: reserved bits are non-zero`,
      });
    }
    return [undefined, offset + bits!];
  }
  if (field.shape.startsWith('bits:')) {
    const raw = extractBits(state.bytes, offset, bits!);
    const value: Record<string, unknown> = { $raw: Number(raw) };
    state.details.push({ name: field.name, path, raw, value, state: 'value' });
    for (const bit of field.bitSet?.bits || []) {
      const active = Number((raw >> BigInt(bit.bit)) & 1n) === bit.activeValue;
      value[bit.name] = active;
      state.details.push({
        name: bit.name, path: `${path}.${bit.name}`,
        raw: BigInt(active ? 1 : 0), value: active, state: 'value',
      });
    }
    if (field.bitSet && (Number(raw) & field.bitSet.reservedMask) !== 0) {
      state.issues.push({
        level: 'error', code: 'reserved-bits', field: field.name, path,
        message: `${path}: reserved bits are non-zero`,
      });
    }
    return [value, offset + bits!];
  }
  if (field.shape === 'z8') {
    const raw = Number(extractBits(state.bytes, offset, 8));
    const mode = state.options.z8Mode;
    if (!mode) throw new Error(`${field.name}: z8Mode is required`);
    const value = decodeZ8(raw, mode, state.issues, path);
    state.details.push({ name: field.name, path, raw: BigInt(raw), value, state: 'value' });
    return [value, offset + 8];
  }
  if (field.shape.startsWith('char-')) {
    const [value, consumed] = decodeChars(field, state.bytes, offset);
    state.details.push({ name: field.name, path, value, state: 'value' });
    return [value, offset + consumed];
  }
  if (field.shape.startsWith('embed:')) {
    const [value, next] = decodeFields(field.children || [], state, offset, path);
    return [value, next];
  }
  if (field.shape.startsWith('repeat:')) {
    const count = repeatCount(field);
    const values = [];
    let next = offset;
    for (let index = 0; index < count; index += 1) {
      const [value, end] = decodeFields(field.children || [], state, next, `${path}[${index}]`);
      values.push(value);
      next = end;
    }
    return [values, next];
  }
  throw new Error(`Unsupported DPT field shape: ${field.shape}`);
}

export function encodeFields(
  fields: DptFieldDefinition[],
  values: Record<string, unknown>,
  bytes: Uint8Array,
  start = 0,
  z8Mode?: 'status' | 'command',
): number {
  let offset = start;
  for (const field of fields) offset = encodeField(field, values[field.name], bytes, offset, z8Mode);
  return offset;
}

function encodeField(
  field: DptFieldDefinition,
  value: unknown,
  bytes: Uint8Array,
  offset: number,
  z8Mode?: 'status' | 'command',
): number {
  const bits = fieldBitWidth(field);
  if (field.shape.startsWith('scalar:')) {
    insertBits(bytes, offset, bits!, encodeScalarSemantic(field, value));
    return offset + bits!;
  }
  if (field.shape.startsWith('reserved:')) return offset + bits!;
  if (field.shape.startsWith('bits:')) {
    insertBits(bytes, offset, bits!, encodeBitGroup(field, value));
    return offset + bits!;
  }
  if (field.shape === 'z8') {
    if (!z8Mode) throw new Error(`${field.name}: z8Mode is required`);
    insertBits(bytes, offset, 8, BigInt(encodeZ8(value, z8Mode)));
    return offset + 8;
  }
  if (field.shape.startsWith('char-')) return offset + encodeChars(field, value, bytes, offset);
  if (field.shape.startsWith('embed:')) return encodeFields(field.children || [], asObject(value), bytes, offset, z8Mode);
  if (field.shape.startsWith('repeat:')) {
    const count = repeatCount(field);
    if (!Array.isArray(value) || value.length !== count) {
      throw new RangeError(`${field.name} requires exactly ${count} repeated value(s)`);
    }
    let next = offset;
    for (const row of value) next = encodeFields(field.children || [], asObject(row), bytes, next, z8Mode);
    return next;
  }
  throw new Error(`Unsupported DPT field shape: ${field.shape}`);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function repeatCount(field: DptFieldDefinition): number {
  const count = Number(field.shape.match(/^repeat:(\d+)$/)?.[1]);
  if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid repeat shape: ${field.shape}`);
  return count;
}

function encodeBitGroup(field: DptFieldDefinition, value: unknown): bigint {
  if (typeof value === 'number' || typeof value === 'bigint') return BigInt(value);
  const obj = asObject(value);
  if ('$raw' in obj) return BigInt(obj.$raw as number);
  let raw = 0n;
  for (const bit of field.bitSet?.bits || []) {
    if (Boolean(obj[bit.name]) === Boolean(bit.activeValue)) raw |= 1n << BigInt(bit.bit);
  }
  return raw;
}
