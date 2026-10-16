import type { KnxCommunicationObject, KnxDevice } from '../../../knx-model/src/index.ts';
import type { EngineeringEndpointRef, EngineeringMatchClass } from '../model/types.ts';

export type EngineeringEvidenceKind =
  | 'manufacturer'
  | 'application'
  | 'product'
  | 'channel'
  | 'object-sequence'
  | 'repeated-structure'
  | 'name'
  | 'dpt'
  | 'flags'
  | 'rule';

export interface PatternEvidence {
  kind: EngineeringEvidenceKind;
  value?: string;
  detail?: string;
  source?: string;
}

export interface PatternCapabilityMatch {
  id: string;
  matchClass: EngineeringMatchClass;
  role: 'producer' | 'consumer' | 'bidirectional' | 'unknown';
  patternId?: string;
  evidence: PatternEvidence[];
}

export interface ObjectSemanticSignature {
  objectId: string;
  objectNumber?: number;
  dptFamily?: string;
  dpt?: string;
  role: PatternCapabilityMatch['role'];
  tokens: string[];
  channelId?: string;
  channelName?: string;
}

export interface ChannelSignature {
  id: string;
  name?: string;
  objectIds: string[];
  objectSignatures: ObjectSemanticSignature[];
  /** Stable shape that deliberately ignores concrete object numbers and channel letters. */
  structuralKey: string;
}

export interface RepeatedChannelPattern {
  structuralKey: string;
  channelIds: string[];
  channelNames: string[];
  occurrences: number;
  objectCount: number;
}

export interface DeviceStructuralSignature {
  deviceId: string;
  manufacturer?: string;
  productName?: string;
  orderNumber?: string;
  applicationProgramRef?: string;
  channels: ChannelSignature[];
  repeatedChannelPatterns: RepeatedChannelPattern[];
}

export interface PatternContext {
  device: KnxDevice;
  object?: KnxCommunicationObject;
  deviceSignature: DeviceStructuralSignature;
}

export interface DevicePatternResult {
  patternId: string;
  functionId: string;
  matchClass: EngineeringMatchClass;
  channelId?: string;
  channelName?: string;
  endpointRefs: EngineeringEndpointRef[];
  evidence: PatternEvidence[];
}
