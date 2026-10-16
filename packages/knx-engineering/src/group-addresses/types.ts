export type GaPlanningMode = 'device' | 'room-function';
export type GaFunctionRole = 'command' | 'feedback' | 'unknown';

export interface GaTargetRef {
  deviceId: string;
  physicalAddress?: string;
  objectRef?: string;
  objectNumber?: string;
}

export interface GaFunctionSourceMeta {
  objectNumber?: string;
  objectRef?: string;
  objectName?: string;
  objectFunctionText?: string;
  objectDescription?: string;
  channelName?: string;
  channelId?: string;
  datapointTypeLabel?: string;
  objectSize?: string;
  communicationFlag?: string;
  readFlag?: string;
  writeFlag?: string;
  transmitFlag?: string;
  updateFlag?: string;
  readOnInitFlag?: string;
  priority?: string;
  links?: string[];
  linkedGroupAddresses?: Array<{ address: string; name?: string }>;
}

export interface GaPlanningFunction {
  id?: string;
  name: string;
  datapointType: string;
  offset: number;
  enabled?: boolean;
  role?: GaFunctionRole;
  functionalGroupId?: string;
  source?: GaFunctionSourceMeta;
  targets?: GaTargetRef[];
}

export interface GaDeviceSourceMeta {
  imported?: boolean;
  deviceId?: string;
  physicalAddress?: string;
  deviceAddress?: string;
  deviceName?: string;
  productName?: string;
  article?: string;
  manufacturer?: string;
  variantId?: string;
  channel?: string;
  areaId?: string;
  areaName?: string;
  areaAddress?: string;
  areaLabel?: string;
  mainLineId?: string;
  mainLineName?: string;
  mainLineAddress?: string;
  mainLineLabel?: string;
  lineId?: string;
  lineName?: string;
  lineAddress?: string;
  lineLabel?: string;
  topologyPath?: string;
  importMode?: string;
  objectNames?: string;
  objectNumbers?: string;
}

export interface GaPlanningInstance {
  id: string;
  type: string;
  label?: string;
  description?: string;
  middleGroup: number;
  feedbackMiddleGroup?: number;
  isScene?: boolean;
  sceneName?: string;
  functions: GaPlanningFunction[];
  source?: GaDeviceSourceMeta;
}

export interface GaPlanningRoom {
  id: string;
  name: string;
  number?: string;
  instances: GaPlanningInstance[];
}

export interface GaPlanningArea {
  id: string;
  name: string;
  abbreviation: string;
  mainGroup: number;
  rooms: GaPlanningRoom[];
}

export interface GaFunctionalGroup {
  id: string;
  name: string;
  middleGroup: number;
}

export interface GaPlanningOptions {
  mode: GaPlanningMode;
  nameTemplate: string;
  descriptionTemplate?: string;
  descriptionEnabled?: boolean;
  roomMarkersEnabled?: boolean;
  functionSeparatorsEnabled?: boolean;
  functionalGroups?: GaFunctionalGroup[];
}

export interface GaPlanningProject {
  schemaVersion: 1;
  id?: string;
  name?: string;
  areas: GaPlanningArea[];
  options: GaPlanningOptions;
}

export interface GaPlanRow {
  level: 'main' | 'middle' | 'ga';
  mainGroup: number;
  middleGroup?: number;
  sub?: number;
  name: string;
  datapointType?: string;
  description?: string;
  targets?: GaTargetRef[];
}

export interface GaTemplateContext {
  area: GaPlanningArea;
  room: GaPlanningRoom;
  roomIndex: number;
  instance: GaPlanningInstance;
  instanceIndex: number;
  functionName: string;
  function?: GaPlanningFunction;
  middleGroupName?: string;
  middleGroupNumber?: number;
}
