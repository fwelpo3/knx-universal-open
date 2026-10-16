import { dptId, normalizeRecognitionText } from '../../../knx-engineering/src/index.ts';
import { detectVisualizationRole } from '../roleDetection.ts';
import type { VisualizationPoint, VisualizationRoleBinding } from '../types.ts';
import { resolveFunctionalRoom } from './functionalRoom.ts';
import { isDistributionRoom } from './evidenceIdentity.ts';
import type { LogicalFunction } from './types.ts';
import { matchSceneNumber } from '../../../knx-engineering/src/index.ts';
import { sceneTitleSuffix } from '../../../knx-engineering/src/index.ts';

function explicitSceneNumber(point: VisualizationPoint): number | null {
  const values = [...(point.groupAddressPath || []), point.groupName || ''];
  for (const value of values) {
    const number = matchSceneNumber(value, point.keywordConfig) ?? NaN;
    if (Number.isInteger(number) && number >= 1 && number <= 64) return number;
  }
  return null;
}

function sceneTitle(points: VisualizationPoint[], number: number): string {
  const named = points.map((point) => point.groupName?.trim()).find(Boolean);
  if (named) return named!.replace(sceneTitleSuffix, '').trim();
  return `Szene ${number}`;
}

function knownRooms(points: VisualizationPoint[]): string[] {
  return [...new Set(points.filter((point) => point.room && !isDistributionRoom(point)).map((point) => point.room!))];
}

function binding(points: VisualizationPoint[], address: string): VisualizationRoleBinding {
  const dpts = [...new Set(points.map((point) => dptId(point.dpt)).filter(Boolean))];
  return {
    role: 'scene-command', pointKeys: [...new Set(points.map((point) => point.key))],
    groupAddresses: [address], dpts, preferredGroupAddress: address, preferredDpt: dpts[0],
    selectionEvidence: [{ code: 'scene-ga-explicit', detail: `Szenen-GA ${address} wird direkt als Auslöser verwendet.`, objectKeys: points.map((point) => point.key) }],
  };
}

/** Scene cards are GA-centric. A DPT 17/18 KO can be linked to many scene GAs, so channel identity must not duplicate cards. */
export function composeExplicitSceneFunctions(points: VisualizationPoint[]): { functions: LogicalFunction[]; consumed: Set<string> } {
  const scenePoints = points.filter((point) => detectVisualizationRole(point)?.kind === 'scene');
  const consumed = new Set(scenePoints.map((point) => point.key));
  const groups = new Map<string, { number: number; points: VisualizationPoint[] }>();
  for (const point of scenePoints) {
    if (!point.groupAddress) continue;
    const number = explicitSceneNumber(point);
    if (!number) continue;
    const key = `${point.groupAddress}|${number}`;
    if (!groups.has(key)) groups.set(key, { number, points: [] });
    groups.get(key)!.points.push(point);
  }
  const rooms = knownRooms(points), functions: LogicalFunction[] = [];
  for (const [key, group] of groups) {
    const address = group.points[0]?.groupAddress;
    if (!address) continue;
    const room = resolveFunctionalRoom(group.points, rooms);
    if (!room.room) continue;
    const role = binding(group.points, address);
    functions.push({
      id: `logical:v2:scene|${key}`, kind: 'scene', title: sceneTitle(group.points, group.number), room: room.room,
      basis: 'evidence-graph', matchClass: group.points.some((p) => p.deviceId && (p.channelId || p.moduleInstance || p.activeByProject)) ? 'exact' : 'candidate', roles: [role], pointKeys: role.pointKeys,
      groupAddresses: [address], sourceDeviceIds: [...new Set(group.points.map((point) => point.deviceId).filter(Boolean) as string[])],
      evidence: [
        { code: 'scene-number-explicit', detail: `Szene ${group.number} ist im ETS-Gruppenadresspfad explizit benannt.`, objectKeys: role.pointKeys },
        { code: 'scene-ga-dedup', detail: `Alle KNX-Endpunkte der Szene wurden über ${address} zu genau einer Szene zusammengeführt.`, objectKeys: role.pointKeys },
        ...room.evidence, ...(role.selectionEvidence || []),
      ],
    });
  }
  return { functions, consumed };
}
