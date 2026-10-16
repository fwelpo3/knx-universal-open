/** Canonical, source-independent KNX project model. */
export interface KnxProjectModel {
  schemaVersion: 1;
  id?: string;
  name?: string;
  locations: KnxLocation[];
  devices: KnxDevice[];
  groupAddresses: KnxGroupAddress[];
}


export type KnxLocationKind = 'site' | 'building' | 'building-part' | 'floor' | 'room' | 'corridor' | 'stairway' | 'distribution-board' | 'zone' | 'unknown';

export interface KnxLocation {
  id: string;
  name: string;
  kind: KnxLocationKind;
  parentId?: string;
  path: string[];
  deviceIds: string[];
  source?: KnxSourceReference;
}

export interface KnxSourceReference {
  source: string;
  id?: string;
}

export interface KnxTopologyRef {
  physicalAddress: string;
  area?: KnxTopologySegment;
  mainLine?: KnxTopologySegment;
  line?: KnxTopologySegment;
  deviceAddress?: string;
  path?: string[];
}

export interface KnxTopologySegment {
  id?: string;
  address?: string;
  name?: string;
}

export interface KnxPlacement {
  id?: string;
  name?: string;
  type?: string;
  path?: string[];
}

export interface KnxDevice {
  id: string;
  name: string;
  manufacturer?: string;
  productName?: string;
  orderNumber?: string;
  applicationProgramRef?: string;
  topology: KnxTopologyRef;
  placement?: KnxPlacement;
  communicationObjects: KnxCommunicationObject[];
  source?: KnxSourceReference;
}

export interface KnxCommunicationObjectFlags {
  communication?: boolean;
  read?: boolean;
  write?: boolean;
  transmit?: boolean;
  update?: boolean;
  readOnInit?: boolean;
}

export interface KnxCommunicationObject {
  id: string;
  number?: string;
  name?: string;
  text?: string;
  functionText?: string;
  description?: string;
  datapointType?: string;
  datapointTypeLabel?: string;
  objectSize?: string;
  priority?: string;
  flags?: KnxCommunicationObjectFlags;
  channel?: { id?: string; name?: string };
  groupAddresses: string[];
  source?: KnxSourceReference;
}

export interface KnxGroupAddress {
  address: string;
  name: string;
  datapointType?: string;
  source?: KnxSourceReference;
}
