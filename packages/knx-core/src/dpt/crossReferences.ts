import { canonicalDptId, getDptDefinition, listDptDefinitions } from './registry.ts';
import type { DptCrossReference, DptCrossReferenceTarget, DptDefinition } from './types.ts';

export function getDptCrossReferences(id: string, role?: string): readonly DptCrossReference[] {
  const definition = getDptDefinition(id);
  if (!definition) return [];
  const refs = definition.references || [];
  return role ? refs.filter((ref) => ref.role === role) : refs;
}

export function resolveDptCrossReference(ref: DptCrossReference): readonly DptDefinition[] {
  const target = ref.target;
  if (target.kind === 'dpt') {
    const definition = getDptDefinition(target.id);
    return definition ? [definition] : [];
  }
  const main = target.main;
  return listDptDefinitions().filter((definition) => definition.main === main);
}

export function getDptBackReferences(target: string | number): Array<{ source: DptDefinition; reference: DptCrossReference }> {
  const normalized = typeof target === 'number'
    ? ({ kind: 'main', main: target } as DptCrossReferenceTarget)
    : parseCrossReferenceTarget(target);
  const out: Array<{ source: DptDefinition; reference: DptCrossReference }> = [];
  for (const definition of listDptDefinitions()) {
    for (const reference of definition.references || []) {
      if (sameTarget(reference.target, normalized)) out.push({ source: definition, reference });
    }
  }
  return out;
}

export function parseCrossReferenceTarget(target: string): DptCrossReferenceTarget {
  const main = target.match(/^main:(\d+)$/i);
  if (main) return { kind: 'main', main: Number(main[1]) };
  return { kind: 'dpt', id: canonicalDptId(target) };
}

function sameTarget(a: DptCrossReferenceTarget, b: DptCrossReferenceTarget): boolean {
  if (a.kind === 'main' && b.kind === 'main') return a.main === b.main;
  if (a.kind === 'dpt' && b.kind === 'dpt') return a.id === b.id;
  return false;
}
