import type { KnxCommunicationObject } from '../../../knx-model/src/index.ts';
import type {
  EngineeringExactObjectHint,
  EngineeringFunctionDefinition,
  EngineeringFunctionSlot,
} from '../model/types.ts';

const SEPARATOR = '\u241f';

function clean(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

/** Exact structural signature preserved from the proven 1.24.0 Auto-Link behaviour. */
export function exactObjectSignature(value: EngineeringExactObjectHint): string {
  return [
    clean(value.number),
    clean(value.name),
    clean(value.functionText),
    clean(value.objectSize),
    clean(value.datapointTypeLabel),
  ].join(SEPARATOR);
}

export function knxObjectExactHint(object: KnxCommunicationObject): EngineeringExactObjectHint {
  return {
    number: object.number,
    name: object.text || object.name,
    functionText: object.functionText,
    objectSize: object.objectSize,
    datapointTypeLabel: object.datapointTypeLabel || object.datapointType,
  };
}

export interface ExactFunctionSlotMatch {
  definition: EngineeringFunctionDefinition;
  slot: EngineeringFunctionSlot;
}

/**
 * Build a deterministic exact-match index. Duplicate signatures are excluded rather
 * than guessed, matching the safety behaviour of the legacy Auto-Link implementation.
 */
export function buildExactFunctionSlotIndex(
  definitions: EngineeringFunctionDefinition[],
): Map<string, ExactFunctionSlotMatch> {
  const matches = new Map<string, ExactFunctionSlotMatch>();
  const ambiguous = new Set<string>();

  for (const definition of definitions) {
    for (const slot of definition.slots) {
      const hint = slot.matchHints?.exactObject;
      if (!hint) continue;
      const key = exactObjectSignature(hint);
      if (!key.replaceAll(SEPARATOR, '')) continue;
      if (matches.has(key)) ambiguous.add(key);
      else matches.set(key, { definition, slot });
    }
  }

  for (const key of ambiguous) matches.delete(key);
  return matches;
}

export function findExactFunctionSlotByHint(
  hint: EngineeringExactObjectHint,
  definitions: EngineeringFunctionDefinition[],
): ExactFunctionSlotMatch | null {
  const index = buildExactFunctionSlotIndex(definitions);
  return index.get(exactObjectSignature(hint)) || null;
}

export function findExactFunctionSlot(
  object: KnxCommunicationObject,
  definitions: EngineeringFunctionDefinition[],
): ExactFunctionSlotMatch | null {
  return findExactFunctionSlotByHint(knxObjectExactHint(object), definitions);
}
