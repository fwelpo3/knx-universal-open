import { normalizeRecognitionText, removeKeywords } from '../../../knx-engineering/src/index.ts';
import { detectVisualizationRole } from '../roleDetection.ts';
import type { VisualizationCardKind, VisualizationPoint, VisualizationRole } from '../types.ts';

export interface EvidencePartition {
  id: string;
  members: VisualizationPoint[];
  ambiguousPointKeys: string[];
}

function primaryRole(kind: VisualizationCardKind, points: VisualizationPoint[]): VisualizationRole {
  if (kind === 'shading') return 'move-command';
  if (kind === 'thermostat') return 'current-temperature';
  if (kind === 'rgb') return points.some((p) => detectVisualizationRole(p)?.role === 'color-command') ? 'color-command' : 'hue-command';
  if (kind === 'tunable-white') return points.some((p) => detectVisualizationRole(p)?.role === 'color-temperature-command') ? 'color-temperature-command' : 'color-temperature-relative';
  return 'switch-command';
}

/** A channel contains multiple KOs: only actual KO identity proves alternative primary GAs. */
function physicalObject(point: VisualizationPoint): string {
  if (!point.deviceId) return '';
  if (point.key.includes('@')) return `${point.deviceId}|${point.key.slice(0, point.key.lastIndexOf('@'))}`;
  if (point.objectNumber !== undefined) return `${point.deviceId}|number:${point.objectNumber}`;
  return `${point.deviceId}|key:${point.key}`;
}

function semanticStem(point: VisualizationPoint): string {
  return removeKeywords('identity-role', normalizeRecognitionText(point.groupName || ''), point.keywordConfig);
}

function structuralRelation(a: VisualizationPoint, b: VisualizationPoint): boolean {
  if (a.buildingFunctions?.some((x) => b.buildingFunctions?.some((y) => x.id === y.id))) return true;
  return Boolean(a.deviceId && a.deviceId === b.deviceId && (
    (a.channelId && a.channelId === b.channelId) || (a.moduleInstance && a.moduleInstance === b.moduleInstance)
  ));
}

/** Similar labels alone must never turn distinct primary commands into alternatives. */
export function partitionEvidenceGroup(points: VisualizationPoint[], kind: VisualizationCardKind): EvidencePartition[] {
  const role = primaryRole(kind, points);
  const primary = points.filter((point) => point.groupAddress && detectVisualizationRole(point)?.role === role);
  const addresses = [...new Set(primary.map((point) => point.groupAddress!))].sort();
  if (addresses.length < 2) return [{ id: '', members: points, ambiguousPointKeys: [] }];
  const parent = new Map(addresses.map((address) => [address, address]));
  const find = (address: string): string => {
    while (parent.get(address) !== address) address = parent.get(address)!;
    return address;
  };
  const objects = new Map<string, string>();
  for (const point of primary) {
    const identity = physicalObject(point);
    if (!identity) continue;
    const previous = objects.get(identity);
    if (previous) {
      const [first, second] = [find(point.groupAddress!), find(previous)].sort();
      parent.set(second, first);
    }
    else objects.set(identity, point.groupAddress!);
  }
  const grouped = new Map<string, EvidencePartition>();
  for (const point of primary) {
    const id = find(point.groupAddress!);
    if (!grouped.has(id)) grouped.set(id, { id, members: [], ambiguousPointKeys: [] });
    grouped.get(id)!.members.push(point);
  }
  if (grouped.size === 1) return [{ id: '', members: points, ambiguousPointKeys: [] }];
  const partitions = [...grouped.values()];
  const primaryKeys = new Set(primary.map((point) => point.key));
  const anchors = partitions.map((partition) => [...partition.members]);
  for (const point of points.filter((member) => !primaryKeys.has(member.key))) {
    let matches = anchors.map((members, index) => members.some((anchor) => structuralRelation(point, anchor)) ? index : -1).filter((index) => index >= 0);
    if (!matches.length) {
      const stem = semanticStem(point);
      matches = anchors.map((members, index) => stem && members.some((anchor) => semanticStem(anchor) === stem) ? index : -1).filter((index) => index >= 0);
    }
    if (matches.length === 1) partitions[matches[0]].members.push(point);
    else partitions.forEach((partition) => partition.ambiguousPointKeys.push(point.key));
  }
  return partitions;
}
