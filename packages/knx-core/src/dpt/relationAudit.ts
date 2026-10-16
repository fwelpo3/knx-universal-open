import type { DptDefinition, DptFieldDefinition } from './types.ts';

type Node = { name: string; scope: string[]; path: string; kind: 'field' | 'bit' };
export type DptRelationAuditIssue = {
  kind: 'validity' | 'cross-field';
  operand: string;
  message: string;
};

export function auditDptRelations(definition: DptDefinition): DptRelationAuditIssue[] {
  const nodes = collect(definition.fields);
  const issues: DptRelationAuditIssue[] = [];
  for (const edge of definition.validity) {
    const flags = nodes.filter((node) => node.name === edge.flag && node.kind === 'bit');
    const targets = nodes.filter((node) => node.name === edge.target);
    if (!flags.length) issues.push({ kind: 'validity', operand: edge.flag, message: `unresolved flag ${edge.flag}` });
    if (!targets.length) issues.push({ kind: 'validity', operand: edge.target, message: `unresolved target ${edge.target}` });
    if (flags.length && targets.length && !hasCompatibleScope(flags, targets)) {
      issues.push({ kind: 'validity', operand: edge.target, message: `${edge.flag} and ${edge.target} have split repeat scopes` });
    }
  }
  for (const rule of definition.rules) {
    const triggers = nodes.filter((node) => node.name === rule.trigger);
    if (!triggers.length) issues.push({ kind: 'cross-field', operand: rule.trigger, message: `unresolved trigger ${rule.trigger}` });
    for (const targetName of rule.targets) {
      const targets = nodes.filter((node) => node.name === targetName);
      if (!targets.length) issues.push({ kind: 'cross-field', operand: targetName, message: `unresolved target ${targetName}` });
      if (triggers.length && targets.length && !hasCompatibleScope(triggers, targets)) {
        issues.push({ kind: 'cross-field', operand: targetName, message: `${rule.trigger} and ${targetName} have split repeat scopes` });
      }
    }
  }
  return issues;
}

function collect(fields: DptFieldDefinition[], prefix = '', scope: string[] = []): Node[] {
  const out: Node[] = [];
  for (const field of fields) {
    if (field.shape.startsWith('reserved:')) continue;
    const repeated = field.shape.startsWith('repeat:');
    const segment = repeated ? `${field.name}[*]` : field.name;
    const path = prefix ? `${prefix}.${segment}` : segment;
    const nextScope = repeated ? [...scope, path] : scope;
    if (!field.children?.length) out.push({ name: field.name, scope, path, kind: 'field' });
    if (field.shape.startsWith('bits:')) {
      out.push({ name: field.name, scope, path, kind: 'field' });
      for (const bit of field.bitSet?.bits || []) out.push({ name: bit.name, scope, path: `${path}.${bit.name}`, kind: 'bit' });
    }
    if (field.children?.length) out.push(...collect(field.children, path, nextScope));
  }
  return out;
}

function hasCompatibleScope(left: Node[], right: Node[]): boolean {
  return left.some((a) => right.some((b) => compatible(a.scope, b.scope)));
}
function compatible(a: string[], b: string[]): boolean {
  return prefix(a, b) || prefix(b, a);
}
function prefix(a: string[], b: string[]): boolean {
  return a.length <= b.length && a.every((value, index) => value === b[index]);
}
