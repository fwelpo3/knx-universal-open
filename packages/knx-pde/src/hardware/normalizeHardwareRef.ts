/**
 * Project Data Exchange expects Hardware2ProgramRefId fingerprints as 0000.
 * ETS project IDs store HP tuples as <program>-<version>-<fingerprint>.
 */
export function normalizePdeHardware2ProgramRefId(value: string): string {
  const raw = String(value || '').trim();
  const marker = '_HP-';
  const at = raw.indexOf(marker);
  if (at < 0) return raw;

  const prefix = raw.slice(0, at + marker.length);
  const parts = raw.slice(at + marker.length).split('-');
  for (let index = 2; index < parts.length; index += 3) {
    if (/^[0-9a-f]{4}$/i.test(parts[index])) parts[index] = '0000';
  }
  return `${prefix}${parts.join('-')}`;
}
