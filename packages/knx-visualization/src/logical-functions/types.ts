import type { RecognitionEvidence, RecognitionMatchClass } from '../../../knx-engineering/src/index.ts';
import type { VisualizationCardKind, VisualizationRoleBinding } from '../types.ts';

export type LogicalFunctionBasis =
  | 'building-function'
  | 'project-structure'
  | 'shared-group-address'
  | 'semantic-fallback'
  | 'sequence-fallback'
  | 'evidence-graph';

export interface LogicalFunction {
  id: string;
  kind: VisualizationCardKind;
  title: string;
  room?: string;
  basis: LogicalFunctionBasis;
  matchClass: RecognitionMatchClass;
  roles: VisualizationRoleBinding[];
  pointKeys: string[];
  groupAddresses: string[];
  sourceDeviceIds: string[];
  evidence: RecognitionEvidence[];
}
