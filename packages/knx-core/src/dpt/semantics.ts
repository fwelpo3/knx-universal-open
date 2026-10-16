import { codeBandKind } from './codeBands.ts';
import { normalizeDisposition } from './dispositions.ts';
import { intervalCountForStepCode, intervalInputToCode } from './interval.ts';
import { compareExactToLiteral, isExactDecimal } from './exactDecimal.ts';
import { decodeScalar, encodeScalar } from './mapping.ts';
import type {
  DptCodeBand, DptCodeValue, DptDecodedField, DptFieldDefinition,
  DptIntervalValue, DptIssue, DptSpecialValue, DptAbsentValue, DptNumericMode,
} from './types.ts';

type Carrier = 'b' | 'n' | 'u' | 'v' | 'f16' | 'f32' | string;

export function scalarCarrier(field: DptFieldDefinition): Carrier {
  return field.shape.match(/^scalar:([^:]+)/)?.[1] || '';
}

export function decodeScalarSemantic(
  field: DptFieldDefinition,
  raw: bigint,
  issues: DptIssue[],
  path?: string,
  numericMode: DptNumericMode = 'native',
): DptDecodedField {
  const special = field.specials?.find((item) => BigInt(item.raw) === raw);
  if (special?.kind === 'value-state') {
    const value: DptSpecialValue = { kind: 'special', state: 'invalid', raw, specialKind: special.kind };
    return { name: field.name, path, raw, value, unit: field.unit, state: 'invalid', special };
  }
  if (special?.kind === 'receiver-disposition') {
    const value: DptSpecialValue = {
      kind: 'special', state: 'receiver-disposition', raw,
      specialKind: special.kind, disposition: special.disposition,
    };
    issues.push({
      level: 'error', code: special.disposition || 'receiver-disposition', field: field.name, path,
      disposition: special.disposition === 'ignore-message' || special.disposition === 'accept-without-action' ? special.disposition : undefined,
      message: `${field.name}: receiver disposition ${special.disposition || 'declared'}`,
    });
    return { name: field.name, path, raw, value, unit: field.unit, state: 'receiver-disposition', special };
  }

  const decoded = decodeScalar(field, raw, numericMode);
  const code = field.codes?.find((item) => BigInt(item.code) === raw);
  const band = findCodeBand(field, Number(raw));
  validateCodeDomain(field, raw, code, band, issues, path);
  validateRange(field, decoded, issues, path, raw);

  if (field.mapping === 'interval-exponential') {
    const numeric = Number(raw);
    const value: DptIntervalValue = {
      kind: 'code', code: numeric, label: code?.label || band?.label,
      band: !code && Boolean(band),
      ...(band && codeBandKind(band.label) !== 'other' ? { bandKind: codeBandKind(band.label) } : {}),
      disposition: normalizeDisposition(band?.disposition),
      intervals: intervalCountForStepCode(numeric), break: numeric === 0,
    };
    return {
      name: field.name, path, raw, value, label: value.label, unit: field.unit,
      state: 'value', intervals: value.intervals, special,
    };
  }

  if (scalarCarrier(field) === 'n') {
    const value: DptCodeValue = {
      kind: 'code', code: Number(raw), label: code?.label || band?.label,
      band: !code && Boolean(band),
      ...(band && codeBandKind(band.label) !== 'other' ? { bandKind: codeBandKind(band.label) } : {}),
      disposition: normalizeDisposition(band?.disposition),
    };
    return { name: field.name, path, raw, value, label: value.label, unit: field.unit, state: 'value', special };
  }

  return { name: field.name, path, raw, value: decoded, label: code?.label || band?.label, unit: field.unit, state: 'value', special };
}

export function encodeScalarSemantic(field: DptFieldDefinition, value: unknown): bigint {
  if (isSpecialValue(value)) {
    const specialRaw = typeof value.raw === 'bigint' ? value.raw : BigInt(value.raw);
    const special = field.specials?.find((item) => BigInt(item.raw) === specialRaw);
    if (!special || special.kind !== value.specialKind) throw new RangeError(`${field.name}: undeclared special value`);
    if (special.kind === 'receiver-disposition') throw new RangeError(`${field.name}: ${special.disposition || 'receiver disposition'} is not sender-encodable`);
    return BigInt(special.raw);
  }
  if (isAbsentValue(value)) {
    if (value.raw == null) return 0n;
    return typeof value.raw === 'bigint' ? value.raw : BigInt(value.raw);
  }
  if (field.mapping === 'interval-exponential') value = intervalInputToCode(value);
  else if (isCodeValue(value)) value = value.code;
  if (scalarCarrier(field) === 'n' && (typeof value === 'number' || typeof value === 'bigint')) {
    validateEncodedCode(field, BigInt(value));
  }
  const raw = encodeScalar(field, value);
  validateEncodedCode(field, raw);
  return raw;
}

export function getCodeInfo(field: DptFieldDefinition, raw: number): DptCodeValue | undefined {
  const code = field.codes?.find((item) => item.code === raw);
  if (code) return { kind: 'code', code: raw, label: code.label };
  const band = findCodeBand(field, raw);
  if (!band) return undefined;
  const kind = codeBandKind(band.label);
  return { kind: 'code', code: raw, label: band.label, band: true, ...(kind !== 'other' ? { bandKind: kind } : {}), disposition: normalizeDisposition(band.disposition) };
}

function validateCodeDomain(
  field: DptFieldDefinition, raw: bigint, code: { code: number; label: string } | undefined,
  band: DptCodeBand | undefined, issues: DptIssue[], path?: string,
): void {
  if (!field.codes?.length && !field.codeBands?.length) return;
  if (code) return;
  const carrier = scalarCarrier(field);
  if (band?.disposition === 'accept-without-action') {
    issues.push({ level: 'warning', code: 'accept-without-action', field: field.name, path, disposition: 'accept-without-action', message: `${field.name}: ${band.label}` });
    return;
  }
  if (band && carrier !== 'n' && !band.disposition) return;
  if (band?.disposition) {
    issues.push({ level: 'error', code: band.disposition, field: field.name, path, disposition: normalizeDisposition(band.disposition), message: `${field.name}: ${band.label}` });
    return;
  }
  if (carrier === 'f16' || carrier === 'f32') return;
  issues.push({
    level: 'error', code: 'unknown-code', field: field.name, path,
    message: `${field.name}: code ${raw}${band ? ` is in band '${band.label}'` : ' is not declared'}`,
  });
}

function validateEncodedCode(field: DptFieldDefinition, raw: bigint): void {
  if (!field.codes?.length && !field.codeBands?.length) return;
  const code = field.codes?.find((item) => BigInt(item.code) === raw);
  if (code) return;
  const band = findCodeBand(field, Number(raw));
  const carrier = scalarCarrier(field);
  if (band?.disposition === 'accept-without-action') return;
  if (band && carrier !== 'n' && !band.disposition) return;
  if (carrier === 'f16' || carrier === 'f32') return;
  if (band?.disposition) throw new RangeError(`${field.name}: ${band.disposition}`);
  throw new RangeError(`${field.name}: code ${raw} is not an encodable declared value`);
}

function validateRange(
  field: DptFieldDefinition,
  value: unknown,
  issues: DptIssue[],
  path?: string,
  raw?: bigint,
): void {
  const min = field.rangeMin; const max = field.rangeMax;
  if (min == null && max == null) return;
  if (field.mapping?.startsWith('offset:') || field.mapping === 'century') {
    const compared = raw ?? 0n;
    if (min != null && compared < BigInt(min) || max != null && compared > BigInt(max)) {
      issues.push({ level: 'error', code: 'range', field: field.name, path, message: `${field.name}: raw ${compared} outside ${min ?? '-∞'}..${max ?? '∞'}` });
    }
    return;
  }
  if (isExactDecimal(value)) {
    if (min != null && compareExactToLiteral(value, min) < 0 || max != null && compareExactToLiteral(value, max) > 0) {
      issues.push({ level: 'error', code: 'range', field: field.name, path, message: `${field.name}: ${value.text} outside ${min ?? '-∞'}..${max ?? '∞'}` });
    }
    return;
  }
  if (typeof value === 'bigint') {
    if (min != null && value < BigInt(min) || max != null && value > BigInt(max)) {
      issues.push({ level: 'error', code: 'range', field: field.name, path, message: `${field.name}: ${value} outside ${min ?? '-∞'}..${max ?? '∞'}` });
    }
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  const minN = min == null ? undefined : Number(min); const maxN = max == null ? undefined : Number(max);
  if (minN != null && value < minN || maxN != null && value > maxN) {
    issues.push({ level: 'error', code: 'range', field: field.name, path, message: `${field.name}: ${value} outside ${minN ?? '-∞'}..${maxN ?? '∞'}` });
  }
}

function findCodeBand(field: DptFieldDefinition, raw: number): DptCodeBand | undefined {
  return field.codeBands?.find((item) => raw >= item.start && raw <= item.end);
}
function isCodeValue(value: unknown): value is DptCodeValue {
  return Boolean(value && typeof value === 'object' && (value as Record<string, unknown>).kind === 'code' && typeof (value as Record<string, unknown>).code === 'number');
}
function isSpecialValue(value: unknown): value is DptSpecialValue {
  return Boolean(value && typeof value === 'object' && (value as Record<string, unknown>).kind === 'special');
}

function isAbsentValue(value: unknown): value is DptAbsentValue {
  return Boolean(value && typeof value === 'object' && (value as Record<string, unknown>).kind === 'state');
}
