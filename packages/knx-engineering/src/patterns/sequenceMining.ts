import type { KnxCommunicationObject } from '../../../knx-model/src/index.ts';
import { communicationObjectSignature, channelStructuralKey } from './structureAtoms.ts';
import type { ChannelSignature, ObjectSemanticSignature } from './types.ts';

export interface RepeatedObjectSequenceCandidate {
  startIndex: number;
  blockSize: number;
  occurrences: number;
  coveredObjectIds: string[];
  structuralKey: string;
}

function numericOrder(object: KnxCommunicationObject): number {
  const parsed = Number.parseInt(object.number || '', 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function atomKey(signature: ObjectSemanticSignature): string {
  // channelStructuralKey on a single object already ignores concrete object number/channel name.
  return channelStructuralKey([{ ...signature, objectNumber: undefined, channelId: undefined, channelName: undefined }]);
}

function sameBlock(keys: string[], left: number, right: number, size: number): boolean {
  for (let i = 0; i < size; i += 1) if (keys[left + i] !== keys[right + i]) return false;
  return true;
}

/**
 * Find the strongest contiguous repeated communication-object sequence.
 * Used only when ETS channel metadata is absent. It never assigns semantics itself.
 */
export function findRepeatedObjectSequence(
  objects: KnxCommunicationObject[],
  options: { minBlockSize?: number; maxBlockSize?: number; minOccurrences?: number } = {},
): RepeatedObjectSequenceCandidate | null {
  const minBlockSize = Math.max(2, options.minBlockSize ?? 2);
  const maxBlockSize = Math.max(minBlockSize, options.maxBlockSize ?? 24);
  const minOccurrences = Math.max(2, options.minOccurrences ?? 2);
  const ordered = [...objects].sort((a, b) => numericOrder(a) - numericOrder(b) || a.id.localeCompare(b.id));
  const signatures = ordered.map(communicationObjectSignature);
  const keys = signatures.map(atomKey);
  let best: RepeatedObjectSequenceCandidate | null = null;

  for (let start = 0; start < keys.length; start += 1) {
    const remaining = keys.length - start;
    const maxSize = Math.min(maxBlockSize, Math.floor(remaining / minOccurrences));
    for (let size = minBlockSize; size <= maxSize; size += 1) {
      const base = keys.slice(start, start + size);
      if (new Set(base).size < 2) continue; // avoid grouping long runs of identical generic objects

      let occurrences = 1;
      while (start + (occurrences + 1) * size <= keys.length
        && sameBlock(keys, start, start + occurrences * size, size)) {
        occurrences += 1;
      }
      if (occurrences < minOccurrences) continue;

      const covered = size * occurrences;
      const candidate: RepeatedObjectSequenceCandidate = {
        startIndex: start,
        blockSize: size,
        occurrences,
        coveredObjectIds: ordered.slice(start, start + covered).map((object) => object.id),
        structuralKey: channelStructuralKey(signatures.slice(start, start + size)),
      };
      if (!best
        || covered > best.blockSize * best.occurrences
        || (covered === best.blockSize * best.occurrences && occurrences > best.occurrences)
        || (covered === best.blockSize * best.occurrences && occurrences === best.occurrences && size > best.blockSize)) {
        best = candidate;
      }
    }
  }
  return best;
}

export function inferChannelsFromRepeatedSequence(objects: KnxCommunicationObject[]): ChannelSignature[] {
  const ordered = [...objects].sort((a, b) => numericOrder(a) - numericOrder(b) || a.id.localeCompare(b.id));
  const candidate = findRepeatedObjectSequence(ordered);
  if (!candidate) return [];
  const out: ChannelSignature[] = [];
  for (let occurrence = 0; occurrence < candidate.occurrences; occurrence += 1) {
    const from = candidate.startIndex + occurrence * candidate.blockSize;
    const block = ordered.slice(from, from + candidate.blockSize);
    const signatures = block.map(communicationObjectSignature);
    out.push({
      id: `inferred:${occurrence + 1}`,
      name: `Inferred channel ${occurrence + 1}`,
      objectIds: block.map((object) => object.id),
      objectSignatures: signatures,
      structuralKey: channelStructuralKey(signatures),
    });
  }
  return out;
}
