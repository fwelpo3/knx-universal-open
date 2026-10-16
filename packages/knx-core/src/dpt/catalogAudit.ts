import { fieldBitWidth } from './mapping.ts';
import type { DptDefinition, DptFieldDefinition, DptIssue } from './types.ts';

const SHAPES = ['scalar:', 'reserved:', 'bits:', 'z8', 'char-array:', 'char-terminated:', 'char-variable:', 'embed:', 'repeat:'];
const MAPPINGS = ['identity', 'resolution', 'linear', 'interval-exponential', 'century'];
const CARRIERS = new Set(['b', 'u', 'v', 'n', 'f16', 'f32']);

export function auditDptDefinition(def: DptDefinition): DptIssue[] {
  const issues: DptIssue[] = [];
  if (!/^\d+\.\d+$/.test(def.id)) issues.push(error('invalid-id', `Invalid DPT id ${def.id}`));
  if (!def.fields?.length) issues.push(error('no-fields', `${def.id} has no fields`));
  for (const field of def.fields || []) auditField(def, field, issues, field.name);
  return issues;
}

export function auditDptCatalog(definitions: readonly DptDefinition[]): DptIssue[] {
  const issues: DptIssue[] = [];
  const ids = new Set<string>();
  for (const def of definitions) {
    if (ids.has(def.id)) issues.push(error('duplicate-id', `Duplicate DPT ${def.id}`));
    ids.add(def.id);
    issues.push(...auditDptDefinition(def));
  }
  return issues;
}

function auditField(def: DptDefinition, field: DptFieldDefinition, issues: DptIssue[], path: string): void {
  if (!SHAPES.some((shape) => field.shape === shape || field.shape.startsWith(shape))) {
    issues.push(error('unsupported-shape', `${def.id} ${path}: ${field.shape}`, path));
  }
  const scalar = field.shape.match(/^scalar:([^:]+)(?::\d+)?$/);
  if (scalar && !CARRIERS.has(scalar[1])) issues.push(error('unsupported-carrier', `${def.id} ${path}: ${scalar[1]}`, path));
  if (field.mapping) {
    const kind = field.mapping.startsWith('offset:') ? 'offset' : field.mapping;
    if (kind !== 'offset' && !MAPPINGS.includes(kind)) issues.push(error('unsupported-mapping', `${def.id} ${path}: ${field.mapping}`, path));
  }
  if (!field.shape.startsWith('char-variable:') && !field.shape.startsWith('embed:') && !field.shape.startsWith('repeat:')) {
    try { if (fieldBitWidth(field) == null) issues.push(error('unknown-width', `${def.id} ${path}`, path)); }
    catch (cause) { issues.push(error('invalid-width', `${def.id} ${path}: ${String(cause)}`, path)); }
  }
  for (const child of field.children || []) auditField(def, child, issues, `${path}.${child.name}`);
}

function error(code: string, message: string, path?: string): DptIssue {
  return { level: 'error', code, path, message };
}
