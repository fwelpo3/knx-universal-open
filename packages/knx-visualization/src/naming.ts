import { normalizeRecognitionText } from '../../knx-engineering/src/index.ts';
import type { VisualizationCardKind, VisualizationPoint } from './types.ts';
import { titleRoleWords, titleAbbreviations, titleDecorations, titlePrefixes } from '../../knx-engineering/src/index.ts';
import { removeConfiguredKeywords } from '../../knx-engineering/src/index.ts';

function clean(value: string): string {
  return value
    .replace(/[-–—]+/g, ' ')
    .replace(titleRoleWords, ' ')
    .replace(titleAbbreviations, ' ')
    .replace(titleDecorations, ' ')
    .replace(/[().]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function beforeToken(value: string, re: RegExp): string {
  const match = value.match(re);
  return match?.index !== undefined ? value.slice(0, match.index).trim() : '';
}

export function visualizationTitle(point: VisualizationPoint, kind: VisualizationCardKind): string {
  const original = String(point.groupName || point.channelLabel || point.objectName || '').trim();
  const raw = removeConfiguredKeywords(original, point.keywordConfig);
  if (!raw) return point.room || kind;
  if (kind === 'rgb') {
    const prefix = clean(beforeToken(raw, titlePrefixes.rgb));
    return prefix ? `${prefix} RGB` : 'RGB';
  }
  if (kind === 'tunable-white') {
    const prefix = clean(beforeToken(raw, titlePrefixes['tunable-white']));
    return prefix ? `${prefix} Tunable White` : 'Tunable White';
  }
  if (kind === 'thermostat') {
    const prefix = beforeToken(raw, titlePrefixes.thermostat);
    return clean(prefix || raw) || point.room || 'Raumtemperatur';
  }
  if (kind === 'scene') {
    return raw.replace(/\s+/g, ' ').trim() || 'Szene';
  }
  const result = clean(raw);
  return result || point.room || raw;
}

export function visualizationGroupKey(point: VisualizationPoint, kind: VisualizationCardKind): string {
  const title = visualizationTitle(point, kind);
  return `${kind}:${normalizeRecognitionText(point.room || '')}:${normalizeRecognitionText(title)}`;
}
