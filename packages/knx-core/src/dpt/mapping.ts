import { rawFromSigned, signedFromRaw } from './bits.ts';
import { compareExactToLiteral, divideExactByFactor, isExactDecimal, multiplyExactInteger, parseExactDecimal } from './exactDecimal.ts';
import type { DptFieldDefinition, DptNumericMode } from './types.ts';

export function scalarCarrier(field: DptFieldDefinition): string {
  return scalarShape(field).carrier;
}

function scalarShape(field: DptFieldDefinition): { carrier: string; bits: number } {
  const match = field.shape.match(/^scalar:([^:]+)(?::(\d+))?$/);
  if (!match) throw new Error(`not scalar: ${field.name}`);
  const carrier = match[1];
  const bits = carrier === 'f16' ? 16 : carrier === 'f32' ? 32 : Number(match[2]);
  return { carrier, bits };
}

function decimal(value?: string): number | undefined { return value == null ? undefined : Number(value); }
function resolutionLiteral(field: DptFieldDefinition): string {
  return field.resolution?.replace(/^(?:exact|approx):/, '') || '1';
}

export function decodeScalar(field: DptFieldDefinition, raw: bigint, numericMode: DptNumericMode = 'native'): unknown {
  const { carrier, bits } = scalarShape(field);
  if (carrier === 'f16') return decodeF16(Number(raw));
  if (carrier === 'f32') {
    const b = new ArrayBuffer(4); const v = new DataView(b);
    v.setUint32(0, Number(raw), false); return v.getFloat32(0, false);
  }
  const signed = carrier === 'v' ? signedFromRaw(raw, bits) : raw;
  const base = typeof signed === 'bigint' ? signed : BigInt(signed);
  const mapping = field.mapping;
  if (mapping?.startsWith('offset:')) return Number(base) + Number(mapping.slice(7));
  if (mapping === 'century') { const n = Number(base); return n >= 90 ? 1900 + n : 2000 + n; }
  if (mapping === 'resolution') {
    const exact = multiplyExactInteger(base, resolutionLiteral(field));
    return numericMode === 'exact' ? exact : Number(exact.text);
  }
  if (mapping === 'linear') {
    const min = decimal(field.rangeMin) ?? 0, max = decimal(field.rangeMax) ?? 0;
    const span = Number((1n << BigInt(bits)) - 1n);
    return min + Number(raw) * (max - min) / span;
  }
  if (bits > 53) return base;
  return Number(base);
}

export function encodeScalar(field: DptFieldDefinition, value: unknown): bigint {
  const { carrier, bits } = scalarShape(field);
  if (typeof value === 'string' && field.codes?.length) {
    const label = value.toLowerCase();
    const found = field.codes.find((c) => c.label.toLowerCase() === label);
    if (found) value = found.code;
  }
  if (carrier === 'f16') return BigInt(encodeF16(Number(value)));
  if (carrier === 'f32') {
    const b = new ArrayBuffer(4); const v = new DataView(b);
    v.setFloat32(0, Number(value), false); return BigInt(v.getUint32(0, false));
  }

  const mapping = field.mapping;
  let numeric: bigint;
  if (mapping?.startsWith('offset:')) {
    numeric = exactInteger(Number(value) - Number(mapping.slice(7)));
  } else if (mapping === 'century') {
    const n = Number(value);
    numeric = BigInt(n >= 1990 && n <= 1999 ? n - 1900 : n >= 2000 && n <= 2089 ? n - 2000 : NaN);
  } else if (mapping === 'resolution') {
    numeric = divideExactByFactor(value, resolutionLiteral(field));
  } else if (mapping === 'linear') {
    const min = decimal(field.rangeMin) ?? 0, max = decimal(field.rangeMax) ?? 0;
    const span = Number((1n << BigInt(bits)) - 1n);
    numeric = BigInt(Math.round((Number(value) - min) * span / (max - min)));
  } else {
    numeric = toInteger(value);
  }

  validateInputRange(field, value, numeric);
  return carrier === 'v' ? rawFromSigned(numeric, bits) : numeric;
}

export function fieldBitWidth(field: DptFieldDefinition): number | undefined {
  const s = field.shape;
  let m = s.match(/^scalar:(?:[^:]+)(?::(\d+))?$/);
  if (m) return s.includes(':f16') ? 16 : s.includes(':f32') ? 32 : Number(m[1]);
  m = s.match(/^(?:reserved|bits):(\d+)/); if (m) return Number(m[1]);
  m = s.match(/^char-array:(\d+):/); if (m) return Number(m[1]) * 8;
  m = s.match(/^char-terminated:(\d+):/); if (m) return Number(m[1]) * 8;
  if (s === 'z8') return 8;
  if (s.startsWith('embed:')) return sumChildren(field);
  m = s.match(/^repeat:(\d+)$/); if (m) { const one = sumChildren(field); return one == null ? undefined : one * Number(m[1]); }
  return undefined;
}

function sumChildren(field: DptFieldDefinition): number | undefined {
  let sum = 0;
  for (const child of field.children || []) { const n = fieldBitWidth(child); if (n == null) return undefined; sum += n; }
  return sum;
}

function validateInputRange(field: DptFieldDefinition, value: unknown, rawValue: bigint): void {
  if (field.rangeMin == null && field.rangeMax == null) return;
  if (field.mapping?.startsWith('offset:') || field.mapping === 'century') {
    if (field.rangeMin != null && rawValue < BigInt(field.rangeMin) || field.rangeMax != null && rawValue > BigInt(field.rangeMax)) {
      throw new RangeError(`${field.name} outside raw range`);
    }
    return;
  }
  if (field.mapping === 'resolution' || isExactDecimal(value) || typeof value === 'bigint' || typeof value === 'string') {
    const exact = parseExactDecimal(value);
    if (field.rangeMin != null && compareExactToLiteral(exact, field.rangeMin) < 0 || field.rangeMax != null && compareExactToLiteral(exact, field.rangeMax) > 0) {
      throw new RangeError(`${field.name} outside range`);
    }
    return;
  }
  const n = Number(value);
  const min = decimal(field.rangeMin), max = decimal(field.rangeMax);
  if (min != null && n < min || max != null && n > max) throw new RangeError(`${field.name} outside range`);
}

function toInteger(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string') {
    if (!/^[+-]?\d+$/.test(value.trim())) throw new RangeError('integer string required');
    return BigInt(value.trim());
  }
  if (isExactDecimal(value)) {
    if (value.scale !== 0) throw new RangeError('integer value required');
    return value.coefficient;
  }
  return exactInteger(value);
}

function exactInteger(value: unknown): bigint {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new RangeError('integer value required');
  if (!Number.isSafeInteger(n)) throw new RangeError('unsafe integer: use bigint or decimal string');
  return BigInt(n);
}

function decodeF16(raw: number): number {
  const sign = raw & 0x8000 ? -1 : 1, exponent = (raw >> 11) & 0x0f;
  let mantissa = raw & 0x07ff; if (sign < 0) mantissa -= 0x0800;
  return 0.01 * mantissa * 2 ** exponent;
}
function encodeF16(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('F16 value');
  let centi = Math.round(value * 100), exponent = 0;
  while ((centi < -2048 || centi > 2047) && exponent < 15) { centi = Math.round(centi / 2); exponent += 1; }
  if (centi < -2048 || centi > 2047) throw new RangeError('F16 range');
  return (centi < 0 ? 0x8000 | ((centi + 0x0800) & 0x07ff) : centi & 0x07ff) | (exponent << 11);
}
