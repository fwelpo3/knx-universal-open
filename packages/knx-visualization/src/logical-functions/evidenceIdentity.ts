import { normalizeRecognitionText } from '../../../knx-engineering/src/index.ts';
import { visualizationTitle } from '../naming.ts';
import type { VisualizationCardKind, VisualizationPoint } from '../types.ts';
import { family } from './model.ts';
import { matchesKeyword, removeKeywords, type RecognitionKeywordConfig } from '../../../knx-engineering/src/index.ts';
import { genericIdentityToken, numberedChannelWords, distributionRoomType } from '../../../knx-engineering/src/index.ts';

function rawCandidates(point: VisualizationPoint): string[] {
  return [
    point.groupName,
    ...(point.buildingFunctions || []).map((fn) => fn.name),
    point.channelLabel,
    point.objectName,
  ].filter(Boolean) as string[];
}

function codedIdentity(value: string): string | null {
  const matches = value.match(/[A-Za-z]{1,8}\s*[-_.]?\s*\d{1,4}/g) || [];
  for (const match of matches) {
    const token = match.replace(/[\s_.-]+/g, '').toUpperCase();
    if (!genericIdentityToken.test(token)) return token;
  }
  if (/\bCEE\b/i.test(value)) return 'CEE';
  return null;
}

function semanticStem(value: string, config?: RecognitionKeywordConfig): string {
  return removeKeywords('identity-role', normalizeRecognitionText(value), config)
    .replace(numberedChannelWords, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evidenceEntityIdentity(point: VisualizationPoint, kind: VisualizationCardKind): string {
  // Structured GA labels describe the connected function; generic device slots (R1/Wippe3) do not.
  if (point.groupName?.includes('_')) {
    const named = semanticStem(point.groupName, point.keywordConfig);
    if (named.length >= 3) return codedIdentity(named) || named;
  }
  for (const raw of rawCandidates(point)) {
    const coded = codedIdentity(raw);
    if (coded) return coded;
  }
  const title = semanticStem(visualizationTitle(point, kind), point.keywordConfig);
  return title.length >= 3 ? title : '';
}

export function evidenceLocality(point: VisualizationPoint): string {
  if (point.groupAddressPath?.length) {
    return point.groupAddressPath.slice(0, 2).map(normalizeRecognitionText).filter(Boolean).join('|');
  }
  const buildingRoom = point.buildingFunctions?.find((fn) => fn.spaceName)?.spaceName;
  if (buildingRoom) return `room:${normalizeRecognitionText(buildingRoom)}`;
  if (point.room && !isDistributionRoom(point)) return `room:${normalizeRecognitionText(point.room)}`;
  return '';
}

export function evidenceClusterKey(point: VisualizationPoint, kind: VisualizationCardKind): string {
  const identity = evidenceEntityIdentity(point, kind);
  if (!identity) return '';
  return `${family(kind)}|${normalizeRecognitionText(identity)}|${evidenceLocality(point)}`;
}

export function isDistributionRoom(point: VisualizationPoint): boolean {
  if (distributionRoomType.test(point.roomType || '')) return true;
  return matchesKeyword('distribution-room', point.room || '', point.keywordConfig);
}
