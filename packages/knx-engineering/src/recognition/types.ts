export type RecognitionMatchClass = 'exact' | 'variant' | 'candidate' | 'unknown';
export type ObjectDirection = 'command' | 'feedback' | 'bidirectional' | 'unknown';

export interface RecognitionGroupPathItem {
  id?: string;
  label: string;
  order?: number;
}

export interface RecognitionBuildingFunction {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  spaceId: string;
  spaceName: string;
  role: string;
  groupAddress: string;
  groupAddressName: string;
}

export interface RecognitionObject {
  key: string;
  number?: number;
  localNumber?: number;
  sourceOrder: number;
  name?: string;
  functionText?: string;
  description?: string;
  dpt?: string;
  objectSize?: string;
  flags?: {
    communication?: boolean;
    read?: boolean;
    write?: boolean;
    transmit?: boolean;
    update?: boolean;
    readOnInit?: boolean;
  };
  groupPath?: RecognitionGroupPathItem[];
  moduleDefinition?: string;
  moduleInstance?: string;
  moduleBaseNumber?: number;
  channelId?: string;
  channelFunctionalBlocks?: string[];
  dpas?: string[];
  activeByProject?: boolean;
  buildingFunctions?: RecognitionBuildingFunction[];
  linkedGroupAddresses?: string[];
  linkedGroups?: { address: string; name?: string; dpt?: string; path?: string[] }[];
}

export interface RecognitionEvidence {
  code: string;
  detail: string;
  objectKeys?: string[];
}

export interface RecognizedCapability {
  id: string;
  label: string;
  matchClass: RecognitionMatchClass;
  commandObjectKeys: string[];
  feedbackObjectKeys: string[];
  evidence: RecognitionEvidence[];
}

export interface RecognizedChannel {
  id: string;
  label: string;
  alias?: string;
  source: 'channel' | 'ets-group' | 'module' | 'module+ets' | 'adjacency';
  matchClass: RecognitionMatchClass;
  objectKeys: string[];
  capabilities: RecognizedCapability[];
  evidence: RecognitionEvidence[];
  signature: string;
}

/**
 * Recognition-layer result only. Logical functions and visualization cards are
 * intentionally not embedded here; downstream layers compose them without
 * creating a recognition -> visualization dependency cycle.
 */
export interface DeviceRecognition {
  channels: RecognizedChannel[];
  globalObjectKeys: string[];
  deviceCapabilities: RecognizedCapability[];
  evidence: RecognitionEvidence[];
}
