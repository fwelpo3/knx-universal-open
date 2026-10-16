import { visualizationPointsFromDevices } from '../sourcePoints.ts';
import type { VisualizationDeviceInput } from '../types.ts';
import { composeLogicalFunctions } from './compose.ts';
import type { LogicalFunction } from './types.ts';
import type { RecognitionKeywordConfig } from '../../../knx-engineering/src/index.ts';

/** Project-wide composition entry point for actor + sensor + touch/controller data. */
export function composeLogicalFunctionsFromDevices(inputs: VisualizationDeviceInput[], config?: RecognitionKeywordConfig): LogicalFunction[] {
  return composeLogicalFunctions(visualizationPointsFromDevices(inputs, config), config);
}
