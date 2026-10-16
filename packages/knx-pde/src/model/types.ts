export interface PdeKoTargetRef {
  deviceId: string;
  physicalAddress?: string;
  objectRef?: string;
  objectNumber?: string;
}

export interface PdeTopologyNode {
  puid: number;
  address: string;
  name: string;
  mediumTypeRefId?: string;
}

export interface PdeExistingLink {
  sourceId: string;
  puid: number;
  address: string;
  name: string;
  description: string;
  dpt: string;
}

export interface PdeObjectSnapshot {
  ref: string;
  number: string;
  channelName: string;
  text: string;
  functionText: string;
  description: string;
  dpt: string;
  objectSize: string;
  priority: string;
  communicationFlag: string;
  readFlag: string;
  writeFlag: string;
  transmitFlag: string;
  updateFlag: string;
  readOnInitFlag: string;
  existingLinks: PdeExistingLink[];
}

export interface PdeDeviceSnapshot {
  sourceId: string;
  puid: number;
  physicalAddress: string;
  localAddress: string;
  name: string;
  manufacturerId: string;
  lastModified: string;
  hardware2ProgramRefId: string;
  orderNumber: string;
  applicationName: string;
  productName: string;
  area: PdeTopologyNode;
  line: PdeTopologyNode;
  objects: Record<string, PdeObjectSnapshot>;
}

export interface PdeExistingGroupAddress {
  sourceId: string;
  puid: number;
  address: string;
  dpt: string;
  name?: string;
  description?: string;
}

export interface PdeExistingGroupRange {
  puid: number;
  key: string;
  name: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface PdeSourceSnapshot {
  schemaVersion: 1;
  sourceFileName: string;
  projectId: string;
  projectName: string;
  groupAddressStyle: string;
  projectStart: string;
  productDataLanguage: string;
  lastUsedPuid: number;
  devices: Record<string, PdeDeviceSnapshot>;
  groupAddresses: Record<string, PdeExistingGroupAddress>;
  groupRanges: Record<string, PdeExistingGroupRange>;
}

export interface PdeGaInputRow {
  level: 'main' | 'middle' | 'ga';
  mainGroup: number;
  middleGroup?: number;
  sub?: number;
  name: string;
  datapointType?: string;
  description?: string;
  targets?: PdeKoTargetRef[];
}

export interface PlannedGa {
  address: string;
  rawAddress: number;
  puid: number;
  name: string;
  description: string;
  dpt: string;
  size: string;
  generated: boolean;
}

export interface PlannedRange {
  key: string;
  main: number;
  middle?: number;
  puid: number;
  name: string;
  rangeStart: number;
  rangeEnd: number;
}

export interface PlannedObject {
  object: PdeObjectSnapshot;
  connectors: { kind: 'Send' | 'Receive'; gaPuid: number }[];
}

export interface PlannedDevice {
  device: PdeDeviceSnapshot;
  objects: PlannedObject[];
}

export interface PdePlan {
  areas: { area: PdeTopologyNode; lines: { line: PdeTopologyNode; devices: PlannedDevice[] }[] }[];
  groupAddresses: PlannedGa[];
  ranges: PlannedRange[];
}

export interface PdeExportResult {
  xml: string;
  groupAddressCount: number;
  deviceCount: number;
  objectCount: number;
  connectorCount: number;
  existingAddressConflictCount: number;
}
