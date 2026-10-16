import type { ObjectDirection, RecognitionObject } from './types.ts';

import { matchesKeyword, normalizeRecognitionText, removeKeywords } from './recognitionKeywords.ts';
import type { RecognitionKeywordConfig } from './recognitionKeywords.ts';
export { normalizeRecognitionText } from './recognitionKeywords.ts';

export function objectText(object: RecognitionObject): string {
  return normalizeRecognitionText([
    object.name,
    object.functionText,
    object.description,
    ...(object.buildingFunctions || []).flatMap((fn) => [fn.name, fn.typeLabel, fn.role]),
  ].filter(Boolean).join(' '));
}

export function objectFlowDirection(object: RecognitionObject, config?: RecognitionKeywordConfig): ObjectDirection {
  const write = object.flags?.write === true;
  const transmit = object.flags?.transmit === true;
  if (write && transmit) return 'bidirectional';
  if (write) return 'command';
  if (transmit) return 'feedback';
  const roles = normalizeRecognitionText((object.buildingFunctions || []).map((fn) => fn.role).join(' '));
  if (matchesKeyword('direction-feedback', roles, config)) return 'feedback';
  if (matchesKeyword('direction-command', roles, config)) return 'command';
  return 'unknown';
}

export function dptId(value?: string): string {
  const raw = String(value || '').toUpperCase();
  const match = raw.match(/(?:DPST-|DPT-)?(\d+)(?:[.\-](\d+))?/);
  if (!match) return '';
  return match[2] !== undefined
    ? `${Number(match[1])}.${String(Number(match[2])).padStart(3, '0')}`
    : `${Number(match[1])}`;
}

export function semanticStem(object: RecognitionObject, config?: RecognitionKeywordConfig): string {
  return removeKeywords('semantic-stem', objectText(object), config);
}

export function slotKey(object: RecognitionObject): string {
  if (object.dpas?.length) return `dpa:${object.dpas[0]}`;
  if (object.moduleDefinition && object.localNumber !== undefined) {
    return `module:${object.moduleDefinition}:${object.localNumber}`;
  }
  return `number:${object.number ?? object.sourceOrder}`;
}
