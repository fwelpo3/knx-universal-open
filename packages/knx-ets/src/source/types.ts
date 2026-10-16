/** Serializable source DTOs produced by ETS/KNXPROJ parsing. */

export interface EtsSourceStats {
  parseMs?: number;
  deviceCount: number;
  variantCount?: number;
}

export interface EtsSourceTopologyRef {
  areaId?: string;
  areaName?: string;
  areaAddress?: string;
  mainLineId?: string;
  mainLineName?: string;
  mainLineAddress?: string;
  lineId?: string;
  lineName?: string;
  lineAddress?: string;
  deviceAddress?: string;
  physicalAddress: string;
  path?: string[];
}

export interface EtsSourcePlacement {
  id: string;
  name: string;
  type?: string;
  path?: string[];
}


export interface EtsSourceLocation {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
  path: string[];
  deviceIds: string[];
}

export interface EtsSourceGroupAddressLink {
  address: string;
  name?: string;
}

export interface EtsSourceCommunicationObject {
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
  flags?: {
    communication?: string;
    read?: string;
    write?: string;
    transmit?: string;
    update?: string;
    readOnInit?: string;
  };
  channelId?: string;
  channelName?: string;
  /** ETS source ids referenced by Links; preserved for source-level roundtrips/adapters. */
  groupAddressRefs?: string[];
  linkedGroupAddresses?: EtsSourceGroupAddressLink[];
  etsGroupPath?: Array<{ label: string; rawLabel?: string; order?: number }>;
}

export interface EtsSourceDevice {
  id: string;
  name: string;
  manufacturer?: string;
  productName?: string;
  orderNumber?: string;
  productRef?: string;
  hardware2ProgramRef?: string;
  applicationProgramRef?: string;
  topology: EtsSourceTopologyRef;
  placement?: EtsSourcePlacement;
  communicationObjects?: EtsSourceCommunicationObject[];
}

export interface EtsSourceGroupAddress {
  id?: string;
  name: string;
  address: string;
  datapointType?: string;
}

export interface EtsSourceDeviceVariant {
  id: string;
  manufacturer?: string;
  productName?: string;
  orderNumber?: string;
  applicationProgramRef?: string;
  communicationObjectSignature?: string;
  activeObjectCount: number;
  deviceIds: string[];
}

/**
 * Public parser result boundary.
 * It intentionally contains no DOM Element/Document, JSZip, Map, browser File,
 * React state or callback functions, so it can cross Worker/REST/Python boundaries.
 */
export interface EtsSourceProject {
  schemaVersion: 1;
  source: 'knxproj';
  fileName?: string;
  projectId?: string;
  projectName?: string;
  /** Added additively in v1; absent legacy snapshots are treated as an empty hierarchy. */
  locations?: EtsSourceLocation[];
  devices: EtsSourceDevice[];
  groupAddresses: EtsSourceGroupAddress[];
  variants: EtsSourceDeviceVariant[];
  stats: EtsSourceStats;
}
