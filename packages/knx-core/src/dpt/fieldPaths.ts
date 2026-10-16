import type { DptDefinition, DptFieldDefinition } from './types.ts';

export function listDefinitionFieldPaths(definition: DptDefinition): string[] {
  return walk(definition.fields);
}

export function getDefinitionFieldByPath(
  definition: DptDefinition,
  inputPath: string,
): DptFieldDefinition | undefined {
  const tokens = normalizeFieldPath(inputPath).split('.').filter(Boolean);
  return find(definition.fields, tokens, 0);
}

export function normalizeFieldPath(path: string): string {
  return path.replace(/\[\d+\]/g, '[*]');
}

function walk(fields: DptFieldDefinition[], prefix = ''): string[] {
  const out: string[] = [];
  for (const field of fields) {
    if (field.shape.startsWith('reserved:')) continue;
    const repeated = field.shape.startsWith('repeat:');
    const segment = repeated ? `${field.name}[*]` : field.name;
    const path = prefix ? `${prefix}.${segment}` : segment;
    out.push(path);
    if (field.children?.length) out.push(...walk(field.children, path));
    if (field.shape.startsWith('bits:')) {
      for (const bit of field.bitSet?.bits || []) out.push(`${path}.${bit.name}`);
    }
  }
  return out;
}

function find(fields: DptFieldDefinition[], tokens: string[], index: number): DptFieldDefinition | undefined {
  const token = tokens[index]?.replace(/\[\*\]$/, '');
  const field = fields.find((item) => item.name === token);
  if (!field) return undefined;
  if (index === tokens.length - 1) return field;
  if (field.shape.startsWith('bits:') && field.bitSet?.bits.some((bit) => bit.name === tokens[index + 1])) return field;
  return field.children ? find(field.children, tokens, index + 1) : undefined;
}
