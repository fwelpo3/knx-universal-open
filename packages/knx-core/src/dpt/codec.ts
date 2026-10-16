import { decodeFields, encodeFields } from './layout.ts';
import { fieldBitWidth } from './mapping.ts';
import {
  applyValidityRelations,
  evaluateCrossFieldRules,
  filterInvalidatedIssues,
} from './relations.ts';
import { resultDisposition } from './dispositions.ts';
import { getDptDefinition, parseDptWidth } from './registry.ts';
import { applyZ8MainSemantics, encodeZ8, z8Catalog } from './z8.ts';
import type {
  DptDecodeOptions, DptDecodeResult, DptDefinition, DptEncodeOptions, DptIssue,
} from './types.ts';

export function decodeDpt(
  id: string,
  input: Uint8Array | ArrayLike<number>,
  options: DptDecodeOptions = {},
): DptDecodeResult {
  const definition = requireDefinition(id);
  assertContext(definition, options);
  const raw = input instanceof Uint8Array ? input : Uint8Array.from(input);
  assertPayloadSize(definition, raw);
  const issues: DptIssue[] = [];
  const details: DptDecodeResult['details'] = [];
  const width = parseDptWidth(definition.width);
  const base = width.kind === 'bits' ? 8 - (width.value || 0) : 0;
  const [fields, end] = decodeFields(definition.fields, { bytes: raw, issues, details, options }, base);
  if (width.kind === 'variable' && end !== raw.length * 8) {
    throw new RangeError(`${definition.id} has ${raw.length * 8 - end} trailing payload bit(s)`);
  }

  if (definition.context === 'service-selected') {
    applyZ8MainSemantics(definition, fields, details, issues, options.z8Mode!);
  }
  const invalidPaths = applyValidityRelations(definition, fields, details);
  filterInvalidatedIssues(issues, invalidPaths);
  evaluateCrossFieldRules(definition, fields, issues, invalidPaths, 'receive');

  return {
    definition,
    value: simplifiedValue(definition, fields),
    fields,
    details,
    issues,
    disposition: resultDisposition(issues),
    raw: raw.slice(),
  };
}

export function encodeDpt(id: string, value: unknown, options: DptEncodeOptions = {}): Uint8Array {
  const definition = requireDefinition(id);
  assertContext(definition, options);
  const values = prepareServiceValues(definition, normalizeInput(definition, value), options);
  const size = encodedSize(definition, values);
  const bytes = new Uint8Array(size);
  const width = parseDptWidth(definition.width);
  const base = width.kind === 'bits' ? 8 - (width.value || 0) : 0;
  encodeFields(definition.fields, values, bytes, base, options.z8Mode);
  checkTransmitObligations(definition, bytes, options, base);
  const checked = decodeDpt(definition.id, bytes, options);
  const error = checked.issues.find((issue) => issue.level === 'error');
  if (error) throw new RangeError(error.message);
  return bytes;
}

export function validateDptValue(id: string, value: unknown, options: DptEncodeOptions = {}): DptIssue[] {
  try {
    const bytes = encodeDpt(id, value, options);
    return decodeDpt(id, bytes, options).issues;
  } catch (error) {
    return [{ level: 'error', code: 'encode', message: error instanceof Error ? error.message : String(error) }];
  }
}

function checkTransmitObligations(
  definition: DptDefinition,
  bytes: Uint8Array,
  options: DptEncodeOptions,
  base: number,
): void {
  const issues: DptIssue[] = [];
  const details: DptDecodeResult['details'] = [];
  const [fields] = decodeFields(definition.fields, { bytes, issues, details, options }, base);
  const forbidden = issues.find((issue) => issue.disposition === 'ignore-message');
  if (forbidden) throw new RangeError(`${forbidden.path || forbidden.field}: composing an ignore-message value`);
  evaluateCrossFieldRules(definition, fields, issues, new Set(), 'transmit');
}

function prepareServiceValues(
  definition: DptDefinition,
  input: Record<string, unknown>,
  options: DptEncodeOptions,
): Record<string, unknown> {
  if (definition.context !== 'service-selected') return input;
  const values = { ...input };
  const z8Field = definition.fields.find((field) => field.shape === 'z8');
  const mainField = definition.fields.find((field) => field.role === 'main')
    || definition.fields.find((field) => field !== z8Field && !field.shape.startsWith('reserved:'));
  if (!z8Field || !mainField || values[z8Field.name] == null) return values;
  const raw = encodeZ8(values[z8Field.name], options.z8Mode!);
  if (options.z8Mode === 'command') {
    const command = z8Catalog.commands.find((item) => item.code === raw);
    if (command?.mainValue === 'dont-care' && values[mainField.name] == null) values[mainField.name] = 0;
  } else {
    const outOfService = Boolean(raw & 0x01);
    const faultWithoutOverride = Boolean(raw & 0x02) && !Boolean(raw & 0x04);
    if ((outOfService || faultWithoutOverride) && values[mainField.name] == null) values[mainField.name] = 0;
  }
  return values;
}

function requireDefinition(id: string): DptDefinition {
  const definition = getDptDefinition(id);
  if (!definition) throw new Error(`Unknown DPT: ${id}`);
  return definition;
}

function assertContext(definition: DptDefinition, options: DptDecodeOptions | DptEncodeOptions): void {
  if (definition.context === 'service-selected' && !options.z8Mode) {
    throw new Error(`${definition.id} requires z8Mode 'status' or 'command'`);
  }
}

function assertPayloadSize(definition: DptDefinition, bytes: Uint8Array): void {
  const width = parseDptWidth(definition.width);
  if (width.kind === 'variable') {
    if (!bytes.length) throw new RangeError('Variable DPT payload is empty');
    return;
  }
  const expected = width.kind === 'bits' ? 1 : width.value || 0;
  if (bytes.length !== expected) throw new RangeError(`${definition.id} expects ${expected} byte(s), got ${bytes.length}`);
}

function normalizeInput(definition: DptDefinition, value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Uint8Array)) {
    const object = value as Record<string, unknown>;
    const fields = semanticFields(definition.fields);
    if (fields.length === 1 && isSemanticWrapper(object)) return { [fields[0].name]: value };
    return object;
  }
  const fields = semanticFields(definition.fields);
  if (fields.length !== 1) throw new TypeError(`${definition.id} requires a field object`);
  return { [fields[0].name]: value };
}

function isSemanticWrapper(value: Record<string, unknown>): boolean {
  return value.kind === 'code' || value.kind === 'special' || value.kind === 'state' || value.kind === 'decimal';
}
function semanticFields(fields: DptDefinition['fields']): DptDefinition['fields'] {
  return fields.filter((field) => !field.shape.startsWith('reserved:'));
}
function simplifiedValue(definition: DptDefinition, fields: Record<string, unknown>): unknown {
  const visible = semanticFields(definition.fields);
  return visible.length === 1 ? fields[visible[0].name] : fields;
}

function encodedSize(definition: DptDefinition, values: Record<string, unknown>): number {
  const width = parseDptWidth(definition.width);
  if (width.kind === 'bits') return 1;
  if (width.kind === 'octets') return width.value || 0;
  let fixedBits = 0; let variableBytes = 0;
  for (const field of definition.fields) {
    if (field.shape.startsWith('char-variable:')) {
      const text = String(values[field.name] ?? '');
      variableBytes += field.ref === '28.001' || (field.ref === 'self' && definition.id === '28.001')
        ? new TextEncoder().encode(text).length + 1 : text.length + 1;
    } else fixedBits += fieldBitWidth(field) || 0;
  }
  if (fixedBits % 8) throw new Error(`${definition.id} has unaligned variable prefix`);
  return fixedBits / 8 + variableBytes;
}
