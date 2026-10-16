/**
 * Milestone 0.4 / 0.4.1 — deterministic pattern primitives.
 *
 * These contracts deliberately contain no numeric confidence score. A matcher must
 * communicate its decision through a discrete class plus explicit evidence,
 * missing facts and conflicts.
 */
export type PatternMatchClass = 'EXACT' | 'STRONG' | 'PARTIAL' | 'UNKNOWN';

export type PatternEvidenceKind =
  | 'manufacturer'
  | 'application'
  | 'product'
  | 'order-number'
  | 'channel'
  | 'object'
  | 'dpt'
  | 'flags'
  | 'direction'
  | 'semantic-token'
  | 'structure'
  | 'version'
  | 'variant'
  | 'registry'
  | 'provenance'
  | 'source';

export interface PatternEvidenceItem {
  kind: PatternEvidenceKind;
  code: string;
  message: string;
  expected?: string;
  actual?: string;
  source?: string;
}

export interface PatternMissingItem {
  code: string;
  message: string;
  expected?: string;
  source?: string;
}

export interface PatternConflictItem {
  code: string;
  message: string;
  expected?: string;
  actual?: string;
  source?: string;
}

export type PatternArtifactKind =
  | 'knxprod'
  | 'knxproj'
  | 'application-xml'
  | 'registry'
  | 'derived'
  | 'synthetic';

export interface PatternCryptographicDigest {
  algorithm: 'sha256';
  /** Lower- or upper-case hexadecimal SHA-256 digest. */
  value: string;
}

/**
 * Provenance of the artifact used to establish a registry fact.
 * Fields remain optional because derived/non-exact observations may not have all
 * information. EXACT validation requires all proof-critical fields.
 */
export interface PatternProvenance {
  sourceArtifact?: {
    kind: PatternArtifactKind;
    name: string;
  };
  internalPath?: string;
  registryEntryId?: string;
  registryRevision?: string;
  digest?: PatternCryptographicDigest;
}

/**
 * Stable ETS/KNX identity facts. All fields are optional at the contract level:
 * parsers must preserve what is really available and must never invent values.
 * Human-readable product/manufacturer names intentionally do not belong here.
 */
export interface PatternStableIdentity {
  manufacturerId?: string;
  catalogItemId?: string;
  productRefId?: string;
  hardwareId?: string;
  hardware2ProgramRefId?: string;
  applicationProgramId?: string;
  applicationProgramRefId?: string;
  applicationNumber?: string;
  applicationVersion?: string;
  hardwareSerialNumber?: string;
  hardwareVersionNumber?: string;
  orderNumber?: string;
}

export interface PatternVariantParameterValue {
  parameterRef: string;
  value: string;
}

export interface PatternVariantModule {
  moduleRef: string;
  instanceRef?: string;
  objectNumberBase?: number;
}

export interface PatternVariantChannel {
  channelRef: string;
  activeObjectRefs: string[];
}

/**
 * Exact, already-resolved variant facts. This contract does not infer active KOs,
 * parameter relevance, modules or channels; callers provide facts obtained from
 * the source parser/registry.
 */
export interface PatternVariantIdentity {
  activeObjectRefs: string[];
  resolvedParameters: PatternVariantParameterValue[];
  modules: PatternVariantModule[];
  channels: PatternVariantChannel[];
  canonicalKey: string;
}

export interface PatternExactBinding {
  stableIdentity: PatternStableIdentity;
  exactStructureKey: string;
  exactStructureDigest: PatternCryptographicDigest;
  variantIdentity: PatternVariantIdentity;
}

/**
 * Registry-bound proof required for EXACT. The assessment constructor validates
 * that registry and candidate bindings agree and that provenance is complete.
 */
export interface PatternExactProof {
  registryEntryId: string;
  registryRevision: string;
  provenance: PatternProvenance;
  registry: PatternExactBinding;
  candidate: PatternExactBinding;
}

export interface PatternAssessment {
  matchClass: PatternMatchClass;
  evidence: PatternEvidenceItem[];
  missing: PatternMissingItem[];
  conflicts: PatternConflictItem[];
  exactProof?: PatternExactProof;
}

export type PatternCommunicationDirection =
  | 'producer'
  | 'consumer'
  | 'bidirectional'
  | 'unknown';

export interface PatternObjectFlagSignature {
  communication?: boolean;
  read?: boolean;
  write?: boolean;
  transmit?: boolean;
  update?: boolean;
  readOnInit?: boolean;
}

/**
 * Stable, source-independent signature for one KNX communication object.
 * `exactStructureKey` excludes translated/user-facing semantic text.
 * `semanticStructureKey` adds normalized semantic tokens for fallback matching.
 * `structuralKey` is retained as a backward-compatible alias of semanticStructureKey.
 */
export interface PatternObjectSignature {
  objectId: string;
  objectNumber?: number;
  normalizedDpt?: string;
  dptFamily?: string;
  direction: PatternCommunicationDirection;
  flags: PatternObjectFlagSignature;
  semanticTokens: string[];
  channelId?: string;
  channelName?: string;
  exactStructureKey: string;
  semanticStructureKey: string;
  /** @deprecated Use exactStructureKey or semanticStructureKey explicitly. */
  structuralKey: string;
}

/** Signature for an explicitly modelled ETS/KNX channel. 0.4.x does not infer channels. */
export interface PatternChannelSignature {
  channelId: string;
  channelName?: string;
  objects: PatternObjectSignature[];
  exactStructureKey: string;
  semanticStructureKey: string;
  /** @deprecated Use exactStructureKey or semanticStructureKey explicitly. */
  structuralKey: string;
}

/** Legacy semantic display identity retained for backward compatibility. Never sufficient for EXACT. */
export interface PatternDeviceIdentitySignature {
  manufacturer?: string;
  productName?: string;
  orderNumber?: string;
  applicationProgramRef?: string;
  canonicalKey: string;
}

export interface BuildPatternDeviceSignatureOptions {
  stableIdentity?: PatternStableIdentity;
  variantIdentity?: PatternVariantIdentity;
}

/**
 * Canonical device signature used as input for later recognition milestones.
 * It is JSON-serializable and contains no runtime handles or UI state.
 */
export interface PatternDeviceSignature {
  schemaVersion: 1;
  deviceId: string;
  identity: PatternDeviceIdentitySignature;
  stableIdentity?: PatternStableIdentity;
  variantIdentity?: PatternVariantIdentity;
  channels: PatternChannelSignature[];
  unassignedObjects: PatternObjectSignature[];
  exactStructureKey: string;
  semanticStructureKey: string;
  /** @deprecated Use exactStructureKey or semanticStructureKey explicitly. */
  structuralKey: string;
}
