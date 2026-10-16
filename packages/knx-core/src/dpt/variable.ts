import { getDptDefinition, listDptDefinitions, parseDptWidth } from './registry.ts';
import { fieldBitWidth } from './mapping.ts';

export type DptVariableInfo = { id: string; minimumBytes: number; variableFields: string[] };

export function isVariableDpt(id: string): boolean {
  const definition = getDptDefinition(id);
  return Boolean(definition && parseDptWidth(definition.width).kind === 'variable');
}

export function listVariableDpts(): string[] {
  return listDptDefinitions().filter((definition) => parseDptWidth(definition.width).kind === 'variable').map((definition) => definition.id);
}

export function variableDptInfo(id: string): DptVariableInfo | undefined {
  const definition = getDptDefinition(id);
  if (!definition || parseDptWidth(definition.width).kind !== 'variable') return undefined;
  let fixedBits = 0;
  const variableFields: string[] = [];
  for (const field of definition.fields) {
    if (field.shape.startsWith('char-variable:')) variableFields.push(field.name);
    else fixedBits += fieldBitWidth(field) || 0;
  }
  return { id: definition.id, minimumBytes: fixedBits / 8 + variableFields.length, variableFields };
}
