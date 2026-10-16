export function stableEtsText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function etsSignaturePart(value: unknown): string {
  return stableEtsText(value).toUpperCase();
}

export function hashEtsText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** Legacy-compatible object label cleanup used while parser extraction is incremental. */
export function cleanEtsObjectText(value: unknown): string {
  return stableEtsText(value)
    .replace(/\{\{\s*\d+\s*:\s*([^}]+)\}\}/g, '$1')
    .replace(/\{\{\s*\d+\s*\}\}/g, '')
    .replace(/\{\s*\d+\s*\}/g, '')
    .replace(/\{\s*\}/g, '')
    .replace(/\bChannel\b/gi, 'Kanal')
    .replace(/\bSwitch\b/gi, 'Schalten')
    .replace(/\s*[-–—:]\s*$/, '')
    .trim();
}
