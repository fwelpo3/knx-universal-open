import { normalizeRecognitionText } from '../../../knx-engineering/src/index.ts';
import type { VisualizationPoint } from '../types.ts';
import { matchesKeyword } from '../../../knx-engineering/src/index.ts';

export function isSystemVisualizationPoint(point: VisualizationPoint): boolean {
  const value = normalizeRecognitionText([
    point.groupName,
    ...(point.groupAddressPath || []),
    point.objectName,
    point.functionText,
  ].filter(Boolean).join(' '));
  return matchesKeyword('system', value, point.keywordConfig);
}
