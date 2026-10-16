export type ObjectGroupingMode = 'smart' | 'ets' | 'auto' | 'flat';

export interface EngineeringObjectGroupPathItem {
  label: string;
  rawLabel?: string;
  order?: number;
}

export interface EngineeringCommunicationObject {
  ref: string;
  Number?: string;
  Text?: string;
  Name?: string;
  FunctionText?: string;
  etsGroupPath?: EngineeringObjectGroupPathItem[];
}

export interface EngineeringObjectGroup<TObject extends EngineeringCommunicationObject = EngineeringCommunicationObject> {
  id: string;
  label: string;
  path: string[];
  objects: TObject[];
  kind: 'channel' | 'object';
  source: 'ets' | 'auto' | 'root';
  order?: number;
}
