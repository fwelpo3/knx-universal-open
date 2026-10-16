import { dptId, normalizeRecognitionText } from '../../../knx-engineering/src/index.ts';
import type { RecognitionEvidence } from '../../../knx-engineering/src/index.ts';
import type { VisualizationPoint, VisualizationRole, VisualizationRoleBinding } from '../types.ts';
import { detectVisualizationRole } from '../roleDetection.ts';
import { isSystemVisualizationPoint } from './systemFilter.ts';

interface AddressGroup { address: string; points: VisualizationPoint[]; }

function isCommand(role: VisualizationRole): boolean {
  return role.endsWith('-command') || role === 'dim-relative' || role === 'color-temperature-relative' || role === 'scene-command';
}

function addressParts(address: string): number[] {
  return address.split('/').map((part) => Number(part) || 0);
}

function compareAddress(a: string, b: string): number {
  const aa = addressParts(a), bb = addressParts(b);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const diff = (aa[i] || 0) - (bb[i] || 0);
    if (diff) return diff;
  }
  return a.localeCompare(b);
}

function authorityRank(point: VisualizationPoint, role: VisualizationRole): number {
  const flags = point.flags || {};
  if (isCommand(role)) {
    if (flags.write && !flags.transmit) return 0;
    if (point.direction === 'command' || flags.write) return 1;
    if (flags.transmit) return 2;
    return 3;
  }
  if (flags.transmit && flags.read && !flags.write) return 0;
  if (point.direction === 'feedback' && !flags.write) return 1;
  if (flags.transmit && !flags.write) return 1;
  if (flags.transmit) return 2;
  return 3;
}

function identityInName(group: AddressGroup, identity: string): boolean {
  const needle = normalizeRecognitionText(identity);
  return Boolean(needle) && group.points.some((point) => normalizeRecognitionText(point.groupName || '').includes(needle));
}

function chooseDpt(points: VisualizationPoint[], role: VisualizationRole): string {
  const ordered = [...points].sort((a, b) => authorityRank(a, role) - authorityRank(b, role));
  return dptId(ordered.find((point) => point.dpt)?.dpt) || '';
}

export function selectRoleBinding(
  role: VisualizationRole,
  points: VisualizationPoint[],
  identity: string,
  gaUsage: Map<string, number>,
): VisualizationRoleBinding | null {
  const matching = points.filter((point) => detectVisualizationRole(point)?.role === role && point.groupAddress);
  if (!matching.length) return null;
  const byAddress = new Map<string, VisualizationPoint[]>();
  for (const point of matching) {
    const address = point.groupAddress!;
    if (!byAddress.has(address)) byAddress.set(address, []);
    byAddress.get(address)!.push(point);
  }
  const groups: AddressGroup[] = [...byAddress].map(([address, members]) => ({ address, points: members }));
  groups.sort((a, b) => {
    const identityDiff = Number(identityInName(b, identity)) - Number(identityInName(a, identity));
    if (identityDiff) return identityDiff;
    const systemDiff = Number(a.points.some(isSystemVisualizationPoint)) - Number(b.points.some(isSystemVisualizationPoint));
    if (systemDiff) return systemDiff;
    const authorityDiff = Math.min(...a.points.map((p) => authorityRank(p, role))) - Math.min(...b.points.map((p) => authorityRank(p, role)));
    if (authorityDiff) return authorityDiff;
    const usageDiff = (gaUsage.get(a.address) || 0) - (gaUsage.get(b.address) || 0);
    return usageDiff || compareAddress(a.address, b.address);
  });
  const selected = groups[0];
  const evidence: RecognitionEvidence[] = [{
    code: 'role-ga-selected',
    detail: `${role}: ${selected.address} deterministisch aus Identität, Flags, Systemfilter und GA-Nutzung gewählt`,
    objectKeys: selected.points.map((point) => point.key),
  }];
  return {
    role,
    pointKeys: selected.points.map((point) => point.key),
    groupAddresses: [selected.address],
    dpts: [...new Set(selected.points.map((point) => dptId(point.dpt)).filter(Boolean))].sort(),
    preferredGroupAddress: selected.address,
    preferredDpt: chooseDpt(selected.points, role) || undefined,
    alternativeGroupAddresses: groups.slice(1).map((group) => group.address),
    selectionEvidence: evidence,
  };
}
