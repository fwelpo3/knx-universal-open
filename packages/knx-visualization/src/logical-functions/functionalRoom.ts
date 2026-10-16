import { normalizeRecognitionText } from '../../../knx-engineering/src/index.ts';
import type { RecognitionEvidence } from '../../../knx-engineering/src/index.ts';
import type { VisualizationPoint } from '../types.ts';
import { isDistributionRoom } from './evidenceIdentity.ts';

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

function semanticText(points: VisualizationPoint[]): string {
  return normalizeRecognitionText(points.flatMap((point) => [
    point.groupName,
    ...(point.groupAddressPath || []),
    point.objectName,
    point.functionText,
    point.channelLabel,
  ]).filter(Boolean).join(' '));
}

export function resolveFunctionalRoom(
  points: VisualizationPoint[],
  knownRooms: string[],
): { room?: string; evidence: RecognitionEvidence[] } {
  const buildingRooms = unique(points.flatMap((point) => point.buildingFunctions || []).map((fn) => fn.spaceName).filter(Boolean));
  if (buildingRooms.length === 1) {
    return { room: buildingRooms[0], evidence: [{ code: 'functional-room-building', detail: `ETS Building Function ordnet '${buildingRooms[0]}' zu.` }] };
  }

  const structuredNames = points.map((point) => point.groupName || '').filter((name) => name.includes('_'))
    .map((name) => normalizeRecognitionText(name).replace(/ /g, ''));
  const namedRooms = knownRooms.filter((room) => {
    const leaf = normalizeRecognitionText(room.split('/').at(-1)).replace(/ /g, '');
    const short = leaf.endsWith('raum') ? leaf.slice(0, -4) : leaf;
    return short.length >= 3 && structuredNames.some((name) => name.includes(leaf) || name.includes(short));
  });
  if (namedRooms.length === 1) return { room: namedRooms[0].trim(), evidence: [{
    code: 'functional-room-ga-label', detail: `Strukturierter GA-Name benennt eindeutig '${namedRooms[0].trim()}'.`,
  }] };

  const text = semanticText(points);
  const mentioned = knownRooms.filter((room) => {
    const normalized = normalizeRecognitionText(room);
    return normalized && new RegExp(`(?:^| )${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`).test(text);
  });
  if (mentioned.length === 1) {
    return { room: mentioned[0], evidence: [{ code: 'functional-room-semantic', detail: `GA-/Kanal-Semantik verweist eindeutig auf '${mentioned[0]}'.` }] };
  }

  const physicalRooms = unique(points.filter((point) => point.room && !isDistributionRoom(point)).map((point) => point.room!));
  if (physicalRooms.length === 1) {
    return { room: physicalRooms[0], evidence: [{ code: 'functional-room-endpoint', detail: `Nicht-Verteiler-Endpunkt liegt eindeutig in '${physicalRooms[0]}'.` }] };
  }

  const middleGroups = unique(points.map((point) => point.groupAddressPath?.[1]).filter(Boolean) as string[]);
  if (middleGroups.length === 1) {
    return { room: middleGroups[0], evidence: [{ code: 'functional-area-fallback', detail: `Kein Gebäuderaum eindeutig; GA-Mittelgruppe '${middleGroups[0]}' als Funktionsbereich verwendet.` }] };
  }
  return { room: undefined, evidence: [{ code: 'functional-room-unresolved', detail: 'Kein eindeutiger funktionaler Raum aus ETS-Struktur ableitbar.' }] };
}
