import type { RecognitionObject } from './types.ts';
import { dptId, objectFlowDirection, objectText } from './semantics.ts';
import { matchesKeyword } from './recognitionKeywords.ts';
import type { RecognitionKeywordConfig, RecognitionKeywordRole } from './recognitionKeywords.ts';

const excluded: RecognitionKeywordRole[] = ['lock', 'scene', 'sun-protection', 'twilight', 'window-contact',
  'door-contact', 'end-position', 'function-status', 'safety-wind', 'safety-rain', 'safety-frost',
  'manual-control', 'central', 'thermostat', 'heating', 'cooling', 'system'];

export function hasConflictingRole(object: RecognitionObject, config?: RecognitionKeywordConfig): boolean {
  return excluded.some((role) => matchesKeyword(role, objectText(object), config));
}

/** Flags can suggest a role only when a single one-way object fits the slot. */
export function uniqueFlagCandidate(
  objects: RecognitionObject[], dpts: string[], direction: 'command' | 'feedback',
  config?: RecognitionKeywordConfig, exclude: RecognitionKeywordRole[] = [],
): RecognitionObject[] {
  const possible = objects.filter((object) => dpts.includes(dptId(object.dpt))
    && object.activeByProject !== false && object.flags?.communication !== false
    && objectFlowDirection(object, config) === direction
    && (direction === 'command'
      ? object.flags?.write === true && object.flags.transmit === false
      : object.flags?.transmit === true && object.flags.write === false)
    && !hasConflictingRole(object, config)
    && !exclude.some((role) => matchesKeyword(role, objectText(object), config)));
  return possible.length === 1 ? possible : [];
}
