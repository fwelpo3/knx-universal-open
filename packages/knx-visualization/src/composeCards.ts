import { composeLogicalFunctions } from './logical-functions/compose.ts';
import type { LogicalFunction } from './logical-functions/types.ts';
import type { VisualizationCard, VisualizationCardKind, VisualizationPoint } from './types.ts';
import type { RecognitionKeywordConfig } from '../../knx-engineering/src/index.ts';

const CONTROLS: Record<VisualizationCardKind, string[]> = {
  switch: ['toggle'],
  dimmer: ['toggle', 'brightness'],
  rgb: ['toggle', 'color', 'brightness'],
  'tunable-white': ['toggle', 'brightness', 'color-temperature'],
  shading: ['up-down', 'stop-step', 'position', 'slat'],
  thermostat: ['current-temperature', 'target-temperature', 'mode', 'heating-demand'],
  scene: ['scene'],
};

export function visualizationCardFromLogicalFunction(fn: LogicalFunction): VisualizationCard {
  return {
    id: fn.id,
    kind: fn.kind,
    title: fn.title,
    room: fn.room,
    matchClass: fn.matchClass,
    roles: fn.roles,
    pointKeys: fn.pointKeys,
    groupAddresses: fn.groupAddresses,
    sourceDeviceIds: fn.sourceDeviceIds,
    controls: CONTROLS[fn.kind],
    evidence: fn.evidence,
  };
}

export function visualizationCardsFromLogicalFunctions(functions: LogicalFunction[]): VisualizationCard[] {
  return functions.map(visualizationCardFromLogicalFunction);
}

export function composeVisualizationCards(points: VisualizationPoint[], config?: RecognitionKeywordConfig): VisualizationCard[] {
  return visualizationCardsFromLogicalFunctions(composeLogicalFunctions(points, config));
}
