import { GENERATED_DPT_CATALOG } from './catalog/generated.ts';
import { getDptExtension, listDptExtensions } from './extensions.ts';
import { getDefinitionFieldByPath, listDefinitionFieldPaths } from './fieldPaths.ts';
import type { DptDefinition, DptWidth } from './types.ts';
const standardCatalog = GENERATED_DPT_CATALOG as unknown as DptDefinition[];
const standardById = new Map(standardCatalog.map((item) => [item.id, item]));
export function canonicalDptId(value?: string): string {
  const raw = String(value || '').trim().toUpperCase(); if (!raw) return '';
  const token = raw.split(/\s+/).find(Boolean) || '';
  const match = token.match(/^(?:DPST-|DPT-)?(\d+)[.\-](\d+)$/);
  if (!match) return token;
  const main = Number(match[1]), sub = Number(match[2]);
  return `${main}.${sub < 1000 ? String(sub).padStart(3, '0') : sub}`;
}
export function getDptDefinition(id: string): DptDefinition | undefined {
  const key = canonicalDptId(id); return standardById.get(key) || getDptExtension(key)?.definition;
}
export function listStandardDptDefinitions(): readonly DptDefinition[] { return standardCatalog; }
export function listDptDefinitions(): readonly DptDefinition[] { return [...standardCatalog, ...listDptExtensions().map((x) => x.definition)]; }
export function getDptOrigin(id: string): 'standard' | 'extension' | undefined {
  const key = canonicalDptId(id); if (standardById.has(key)) return 'standard'; if (getDptExtension(key)) return 'extension'; return undefined;
}
export function getDptProvenance(id: string): { source: string; version?: string; vendor?: string; note?: string } | undefined {
  const key = canonicalDptId(id);
  if (standardById.has(key)) return { source: 'KNXyz catalog / KNX Standard' };
  return getDptExtension(key)?.metadata;
}
export function parseDptWidth(width: string): DptWidth {
  if (width === 'variable') return { kind: 'variable' };
  const [kind, raw] = width.split(':'); return { kind: kind as 'bits' | 'octets', value: Number(raw) };
}
export function dptPayloadBytes(id: string): number | undefined {
  const def = getDptDefinition(id); if (!def) return undefined;
  const width = parseDptWidth(def.width); if (width.kind === 'variable') return undefined;
  return width.kind === 'bits' ? 1 : width.value;
}
export function listDptFieldPaths(id: string): string[] { const def = getDptDefinition(id); return def ? listDefinitionFieldPaths(def) : []; }
export function getDptFieldByPath(id: string, path: string) { const def = getDptDefinition(id); return def ? getDefinitionFieldByPath(def, path) : undefined; }
