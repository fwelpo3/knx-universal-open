/** Canonical three-level KNX group address. */
export interface GroupAddress3Level {
  main: number;
  middle: number;
  sub: number;
}

/**
 * Parse a three-level KNX group address without applying project policy.
 * Invalid/missing numeric segments intentionally fall back to 0 to preserve
 * the legacy 1.24.0 parser behavior during extraction.
 */
export function parseGroupAddress(address: string): GroupAddress3Level {
  const parts = String(address).split('/').map(Number);
  return {
    main: parts[0] || 0,
    middle: parts[1] || 0,
    sub: parts[2] || 0,
  };
}

/** Convert a three-level KNX group address to the raw 16-bit KNX value. */
export function groupAddressToRaw(address: string | GroupAddress3Level): number {
  const parsed = typeof address === 'string' ? parseGroupAddress(address) : address;
  return ((parsed.main & 31) << 11) | ((parsed.middle & 7) << 8) | (parsed.sub & 255);
}

/** Raw address range occupied by one main group. */
export function mainGroupRange(main: number): { start: number; end: number } {
  const start = main * 2048;
  return { start, end: start + 2047 };
}

/** Raw address range occupied by one middle group. */
export function middleGroupRange(main: number, middle: number): { start: number; end: number } {
  const start = main * 2048 + middle * 256;
  return { start, end: start + 255 };
}

/** Convert a raw 16-bit KNX group address into canonical three-level notation. */
export function rawToGroupAddress3Level(value: number): GroupAddress3Level {
  const raw = Number(value);
  return {
    main: (raw >> 11) & 31,
    middle: (raw >> 8) & 7,
    sub: raw & 255,
  };
}

export function rawToGroupAddressString(value: number | string): string {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return String(value);
  const parsed = rawToGroupAddress3Level(raw);
  return `${parsed.main}/${parsed.middle}/${parsed.sub}`;
}
