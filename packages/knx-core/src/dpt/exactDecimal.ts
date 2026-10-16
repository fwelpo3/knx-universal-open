import type { DptExactDecimal } from './types.ts';

export function exactDecimal(coefficient: bigint, scale = 0): DptExactDecimal {
  if (!Number.isInteger(scale) || scale < 0) throw new RangeError('decimal scale');
  let c = coefficient;
  let s = scale;
  while (s > 0 && c % 10n === 0n) { c /= 10n; s -= 1; }
  return { kind: 'decimal', coefficient: c, scale: s, text: decimalText(c, s) };
}

export function parseExactDecimal(value: unknown): DptExactDecimal {
  if (isExactDecimal(value)) return exactDecimal(value.coefficient, value.scale);
  if (typeof value === 'bigint') return exactDecimal(value, 0);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('finite decimal required');
    return parseDecimalText(String(value));
  }
  if (typeof value === 'string') return parseDecimalText(value);
  throw new TypeError('decimal value required');
}

export function multiplyExactInteger(value: bigint, factor: string): DptExactDecimal {
  const parsed = parseDecimalText(factor);
  return exactDecimal(value * parsed.coefficient, parsed.scale);
}

export function divideExactByFactor(value: unknown, factor: string): bigint {
  const left = parseExactDecimal(value);
  const right = parseDecimalText(factor);
  if (right.coefficient === 0n) throw new RangeError('zero resolution');
  const numerator = left.coefficient * pow10(right.scale);
  const denominator = right.coefficient * pow10(left.scale);
  if (numerator % denominator !== 0n) {
    throw new RangeError(`${left.text} is not an exact multiple of ${right.text}`);
  }
  return numerator / denominator;
}

export function compareExactToLiteral(value: DptExactDecimal, literal: string): number {
  const right = parseDecimalText(literal);
  const scale = Math.max(value.scale, right.scale);
  const a = value.coefficient * pow10(scale - value.scale);
  const b = right.coefficient * pow10(scale - right.scale);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isExactDecimal(value: unknown): value is DptExactDecimal {
  const obj = value as Partial<DptExactDecimal> | null;
  return Boolean(obj && typeof obj === 'object' && obj.kind === 'decimal' && typeof obj.coefficient === 'bigint' && Number.isInteger(obj.scale));
}

function parseDecimalText(input: string): DptExactDecimal {
  const text = input.trim();
  const match = text.match(/^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new RangeError(`invalid decimal: ${input}`);
  const sign = match[1] === '-' ? -1n : 1n;
  const whole = match[2];
  const fraction = match[3] || '';
  const exponent = Number(match[4] || 0);
  let coefficient = sign * BigInt(`${whole}${fraction}`);
  let scale = fraction.length - exponent;
  if (scale < 0) { coefficient *= pow10(-scale); scale = 0; }
  return exactDecimal(coefficient, scale);
}

function decimalText(coefficient: bigint, scale: number): string {
  const negative = coefficient < 0n;
  const digits = (negative ? -coefficient : coefficient).toString().padStart(scale + 1, '0');
  const value = scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return negative ? `-${value}` : value;
}

function pow10(n: number): bigint { return 10n ** BigInt(n); }
