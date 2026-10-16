export function intervalCountForStepCode(code: number): number {
  if (!Number.isInteger(code) || code < 0 || code > 7) throw new RangeError('StepCode must be 0..7');
  return code === 0 ? 0 : 2 ** (code - 1);
}

export function stepCodeForIntervalCount(intervals: number): number {
  if (intervals === 0) return 0;
  if (!Number.isInteger(intervals) || intervals < 1 || intervals > 64 || (intervals & (intervals - 1)) !== 0) {
    throw new RangeError('Intervals must be 0 or a power of two from 1..64');
  }
  return Math.log2(intervals) + 1;
}

export function intervalInputToCode(value: unknown): unknown {
  if (typeof value === 'string' && value.toLowerCase() === 'break') return 0;
  if (!value || typeof value !== 'object') return value;
  const input = value as Record<string, unknown>;
  if (input.break === true) return 0;
  if (typeof input.code === 'number') return input.code;
  if (typeof input.intervals === 'number') return stepCodeForIntervalCount(input.intervals);
  return value;
}
