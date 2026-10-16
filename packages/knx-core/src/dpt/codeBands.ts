import type { DptCodeBandKind } from './types.ts';

export function codeBandKind(label: string): DptCodeBandKind {
  const text = label.toLowerCase();
  if (text.includes('manufacturer specific')) return 'manufacturer-specific';
  if (text.includes('reserv') || text.includes('not used')) return 'reserved';
  return 'other';
}
