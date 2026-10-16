import type { ObjectDirection, RecognitionBuildingFunction, RecognitionEvidence, RecognitionMatchClass, RecognitionObject, RecognitionGroupPathItem } from '../../knx-engineering/src/index.ts';
import type { RecognitionKeywordConfig } from '../../knx-engineering/src/index.ts';

export type VisualizationCardKind = 'switch' | 'dimmer' | 'rgb' | 'tunable-white' | 'shading' | 'thermostat' | 'scene';

export type VisualizationRole =
  | 'switch-command' | 'switch-state'
  | 'dim-relative' | 'brightness-command' | 'brightness-state'
  | 'color-command' | 'color-state' | 'hue-command' | 'hue-state' | 'saturation-command' | 'saturation-state'
  | 'color-temperature-command' | 'color-temperature-state' | 'color-temperature-relative'
  | 'move-command' | 'step-command' | 'position-command' | 'position-state' | 'slat-command' | 'slat-state'
  | 'current-temperature' | 'target-temperature-command' | 'target-temperature-state'
  | 'setpoint-shift-command' | 'setpoint-shift-state' | 'hvac-mode-command' | 'hvac-mode-state'
  | 'heating-demand-command' | 'heating-demand-state' | 'heating-state' | 'cooling-state'
  | 'presence-command' | 'heat-cool-command' | 'hvac-enable-command' | 'hvac-enable-state'
  | 'scene-command' | 'unknown';

export interface VisualizationLinkedGroup {
  address: string;
  name?: string;
  dpt?: string;
  path?: string[];
}

export interface VisualizationPoint {
  /** Per-composition context; never persisted in a card or used as hard evidence. */
  keywordConfig?: RecognitionKeywordConfig;
  key: string;
  deviceId?: string;
  physicalAddress?: string;
  deviceName?: string;
  productName?: string;
  room?: string;
  roomType?: string;
  channelLabel?: string;
  channelId?: string;
  moduleInstance?: string;
  sourceOrder?: number;
  objectNumber?: number;
  activeByProject?: boolean;
  buildingFunctions?: RecognitionBuildingFunction[];
  objectName?: string;
  functionText?: string;
  dpt?: string;
  objectDpt?: string;
  groupAddressDpt?: string;
  direction?: ObjectDirection;
  flags?: RecognitionObject['flags'];
  groupPath?: RecognitionGroupPathItem[];
  groupAddress?: string;
  groupName?: string;
  groupAddressPath?: string[];
}

export interface VisualizationRoleBinding {
  role: VisualizationRole;
  pointKeys: string[];
  groupAddresses: string[];
  dpts: string[];
  preferredGroupAddress?: string;
  preferredDpt?: string;
  alternativeGroupAddresses?: string[];
  selectionEvidence?: RecognitionEvidence[];
}

export interface VisualizationCard {
  id: string;
  kind: VisualizationCardKind;
  title: string;
  room?: string;
  matchClass: RecognitionMatchClass;
  roles: VisualizationRoleBinding[];
  pointKeys: string[];
  groupAddresses: string[];
  sourceDeviceIds: string[];
  controls: string[];
  evidence: RecognitionEvidence[];
}

export interface VisualizationDeviceInput {
  deviceId: string;
  physicalAddress?: string;
  deviceName?: string;
  productName?: string;
  room?: string;
  roomType?: string;
  channelLabel?: string;
  channelId?: string;
  moduleInstance?: string;
  sourceOrder?: number;
  objectNumber?: number;
  activeByProject?: boolean;
  buildingFunctions?: RecognitionBuildingFunction[];
  objects: RecognitionObject[];
}
