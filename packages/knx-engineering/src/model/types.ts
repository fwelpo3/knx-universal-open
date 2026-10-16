/**
 * Source-independent engineering layer built on top of the canonical KNX model.
 *
 * Important: this model references KNX endpoints by stable ids. It does not copy
 * devices/communication objects and it does not contain ETS/PDE/UI persistence data.
 */
export type EngineeringFunctionRole = 'command' | 'feedback' | 'unknown';
export type EngineeringBindingMethod = 'manual' | 'exact' | 'semantic' | 'rule';

/** Discrete evidence class. Numeric confidence is intentionally not part of the public model. */
export type EngineeringMatchClass =
  | 'exact-signature'
  | 'family-pattern'
  | 'structural-pattern'
  | 'semantic-pattern'
  | 'candidate';

/** Stable reference into KnxProjectModel. */
export interface EngineeringEndpointRef {
  deviceId: string;
  communicationObjectId: string;
}

/**
 * Optional structural hint used to reproduce an exact mapping from a known source.
 * It is intentionally source-neutral even though ETS is currently the first adapter.
 */
export interface EngineeringExactObjectHint {
  number?: string;
  name?: string;
  functionText?: string;
  objectSize?: string;
  datapointTypeLabel?: string;
}

export interface EngineeringFunctionSlot {
  id: string;
  name: string;
  datapointType?: string;
  offset?: number;
  role?: EngineeringFunctionRole;
  functionalGroupId?: string;
  capabilities?: string[];
  matchHints?: {
    exactObject?: EngineeringExactObjectHint;
  };
}

/** Reusable function template/definition, independent from any room or device instance. */
export interface EngineeringFunctionDefinition {
  id: string;
  label: string;
  code?: string;
  category?: string;
  capabilities?: string[];
  slots: EngineeringFunctionSlot[];
}

export interface EngineeringEndpointBinding {
  slotId: string;
  endpoint: EngineeringEndpointRef;
  method: EngineeringBindingMethod;
  matchClass?: EngineeringMatchClass;
  evidence?: EngineeringBindingEvidence[];
}

export interface EngineeringBindingEvidence {
  kind: string;
  detail?: string;
  source?: string;
}

/** An occurrence of a reusable engineering function in a project/location. */
export interface EngineeringFunctionInstance {
  id: string;
  definitionId: string;
  label?: string;
  locationId?: string;
  bindings: EngineeringEndpointBinding[];
}

export type EngineeringLocationKind =
  | 'site'
  | 'building'
  | 'floor'
  | 'area'
  | 'room'
  | 'zone'
  | 'unknown';

export interface EngineeringLocation {
  id: string;
  name: string;
  kind: EngineeringLocationKind;
  parentId?: string;
  code?: string;
}

/**
 * Canonical source-independent engineering project.
 *
 * It intentionally contains no ETS XML ids beyond endpoint references into KnxProjectModel,
 * no UI layout state and no persistence/runtime handles.
 */
export interface EngineeringProjectModel {
  schemaVersion: 1;
  id?: string;
  name?: string;
  locations: EngineeringLocation[];
  definitions: EngineeringFunctionDefinition[];
  instances: EngineeringFunctionInstance[];
}
