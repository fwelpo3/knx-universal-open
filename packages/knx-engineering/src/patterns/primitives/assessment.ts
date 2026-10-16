import { validatePatternExactProof } from './exactProof.ts';
import type {
  PatternAssessment,
  PatternConflictItem,
  PatternEvidenceItem,
  PatternExactProof,
  PatternMatchClass,
  PatternMissingItem,
} from './types.ts';

export interface CreatePatternAssessmentInput {
  matchClass: PatternMatchClass;
  evidence?: readonly PatternEvidenceItem[];
  missing?: readonly PatternMissingItem[];
  conflicts?: readonly PatternConflictItem[];
  exactProof?: PatternExactProof;
}

function copyItems<T extends object>(items: readonly T[] | undefined): T[] {
  return (items || []).map((item) => ({ ...item }));
}

function copyExactProof(proof: PatternExactProof): PatternExactProof {
  return structuredClone(proof);
}

/**
 * Creates an immutable-by-convention assessment payload and enforces the public
 * 0.4.x invariants. Classification is never calculated from evidence counts.
 */
export function createPatternAssessment(input: CreatePatternAssessmentInput): PatternAssessment {
  const evidence = copyItems(input.evidence);
  const missing = copyItems(input.missing);
  const conflicts = copyItems(input.conflicts);

  if (input.matchClass === 'EXACT') {
    if (evidence.length === 0) throw new Error('EXACT pattern assessment requires explicit evidence.');
    if (missing.length > 0) throw new Error('EXACT pattern assessment cannot contain missing requirements.');
    if (conflicts.length > 0) throw new Error('EXACT pattern assessment cannot contain conflicts.');
    validatePatternExactProof(input.exactProof);
  } else if (input.exactProof) {
    throw new Error('exactProof may only be attached to an EXACT pattern assessment.');
  }

  if (input.matchClass === 'STRONG') {
    if (evidence.length === 0) throw new Error('STRONG pattern assessment requires explicit evidence.');
    if (conflicts.length > 0) throw new Error('STRONG pattern assessment cannot contain conflicts.');
  }

  if (input.matchClass === 'PARTIAL' && evidence.length === 0 && missing.length === 0 && conflicts.length === 0) {
    throw new Error('PARTIAL pattern assessment requires evidence, missing requirements or conflicts.');
  }

  return {
    matchClass: input.matchClass,
    evidence,
    missing,
    conflicts,
    ...(input.exactProof ? { exactProof: copyExactProof(input.exactProof) } : {}),
  };
}
