import { patternStableIdentityKey } from './identity.ts';
import type {
  PatternCryptographicDigest,
  PatternExactBinding,
  PatternExactProof,
  PatternProvenance,
} from './types.ts';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

function nonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function assertDigest(digest: PatternCryptographicDigest | undefined, label: string): asserts digest is PatternCryptographicDigest {
  if (!digest || digest.algorithm !== 'sha256' || !SHA256_HEX.test(digest.value)) {
    throw new Error(`EXACT proof requires a valid SHA-256 ${label} digest.`);
  }
}

function assertCompleteProvenance(provenance: PatternProvenance, proof: PatternExactProof): void {
  if (!provenance.sourceArtifact || !nonEmpty(provenance.sourceArtifact.name)) {
    throw new Error('EXACT proof requires source-artifact provenance.');
  }
  if (!nonEmpty(provenance.internalPath)) {
    throw new Error('EXACT proof requires the source artifact internal path.');
  }
  if (!nonEmpty(provenance.registryEntryId) || !nonEmpty(provenance.registryRevision)) {
    throw new Error('EXACT proof requires registry entry and revision provenance.');
  }
  if (provenance.registryEntryId !== proof.registryEntryId || provenance.registryRevision !== proof.registryRevision) {
    throw new Error('EXACT proof registry provenance is inconsistent with the registry binding.');
  }
  assertDigest(provenance.digest, 'artifact');
}

function assertExactIdentityComplete(binding: PatternExactBinding, label: string): void {
  const identity = binding.stableIdentity;
  if (!nonEmpty(identity.manufacturerId)) {
    throw new Error(`EXACT proof ${label} identity requires manufacturerId.`);
  }
  if (!nonEmpty(identity.applicationProgramId) && !nonEmpty(identity.applicationProgramRefId)) {
    throw new Error(`EXACT proof ${label} identity requires an application program id/reference.`);
  }
  if (!nonEmpty(identity.applicationVersion)) {
    throw new Error(`EXACT proof ${label} identity requires applicationVersion.`);
  }
  if (!nonEmpty(identity.productRefId) && !nonEmpty(identity.hardwareId) && !nonEmpty(identity.hardware2ProgramRefId)) {
    throw new Error(`EXACT proof ${label} identity requires a product or hardware binding id.`);
  }
  if (!nonEmpty(binding.exactStructureKey)) {
    throw new Error(`EXACT proof ${label} requires exactStructureKey.`);
  }
  assertDigest(binding.exactStructureDigest, `${label} structure`);
  if (!binding.variantIdentity || binding.variantIdentity.activeObjectRefs.length === 0 || !nonEmpty(binding.variantIdentity.canonicalKey)) {
    throw new Error(`EXACT proof ${label} requires a resolved variant identity with active objects.`);
  }
}

/**
 * Runtime gate for the EXACT class. It validates evidence consistency; it does not
 * calculate cryptographic digests or infer any missing identity/variant facts.
 */
export function validatePatternExactProof(proof: PatternExactProof | undefined): asserts proof is PatternExactProof {
  if (!proof) throw new Error('EXACT pattern assessment requires exactProof.');
  if (!nonEmpty(proof.registryEntryId) || !nonEmpty(proof.registryRevision)) {
    throw new Error('EXACT proof requires registryEntryId and registryRevision.');
  }

  assertCompleteProvenance(proof.provenance, proof);
  assertExactIdentityComplete(proof.registry, 'registry');
  assertExactIdentityComplete(proof.candidate, 'candidate');

  const registryIdentityKey = patternStableIdentityKey(proof.registry.stableIdentity);
  const candidateIdentityKey = patternStableIdentityKey(proof.candidate.stableIdentity);
  if (registryIdentityKey !== candidateIdentityKey) {
    throw new Error('EXACT proof stable identity differs between registry and candidate.');
  }
  if (proof.registry.exactStructureKey !== proof.candidate.exactStructureKey) {
    throw new Error('EXACT proof exact structure key differs between registry and candidate.');
  }
  if (
    proof.registry.exactStructureDigest.algorithm !== proof.candidate.exactStructureDigest.algorithm
    || proof.registry.exactStructureDigest.value.toLowerCase() !== proof.candidate.exactStructureDigest.value.toLowerCase()
  ) {
    throw new Error('EXACT proof exact structure digest differs between registry and candidate.');
  }
  if (proof.registry.variantIdentity.canonicalKey !== proof.candidate.variantIdentity.canonicalKey) {
    throw new Error('EXACT proof variant identity differs between registry and candidate.');
  }
}
