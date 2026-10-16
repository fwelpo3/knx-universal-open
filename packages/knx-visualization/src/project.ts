import { composeVisualizationCards } from './composeCards.ts';
import { visualizationPointsFromDevices } from './sourcePoints.ts';
import type { VisualizationCard, VisualizationDeviceInput } from './types.ts';
import type { RecognitionKeywordConfig } from '../../knx-engineering/src/index.ts';

export function composeVisualizationCardsFromDevices(inputs: VisualizationDeviceInput[], config?: RecognitionKeywordConfig): VisualizationCard[] {
  return composeVisualizationCards(visualizationPointsFromDevices(inputs, config), config);
}
