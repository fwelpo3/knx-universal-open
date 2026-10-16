import type { RecognitionEvidence } from '../../../knx-engineering/src/index.ts';
import type { VisualizationPoint } from '../types.ts';
import type { LogicalFunctionBasis } from './types.ts';

function sharedAcrossDevices(points: VisualizationPoint[]): string[] {
  const byAddress = new Map<string, Set<string>>();
  for (const point of points) {
    if (!point.groupAddress || !point.deviceId) continue;
    if (!byAddress.has(point.groupAddress)) byAddress.set(point.groupAddress, new Set());
    byAddress.get(point.groupAddress)!.add(point.deviceId);
  }
  return [...byAddress.entries()].filter(([, devices]) => devices.size > 1).map(([address]) => address);
}

export function logicalHardEvidence(points: VisualizationPoint[]): { basis: LogicalFunctionBasis; evidence: RecognitionEvidence[] } | null {
  const building = points.flatMap((p) => p.buildingFunctions || []);
  if (building.length) {
    const ids = [...new Set(building.map((fn) => fn.id))];
    return { basis: 'building-function', evidence: [{ code: 'logical-building-function', detail: `ETS Building Function ${ids.join(', ')}`, objectKeys: points.map((p) => p.key) }] };
  }
  const channelKeys = [...new Set(points.filter((p) => p.deviceId && p.channelId).map((p) => `${p.deviceId}|${p.channelId}`))];
  const moduleKeys = [...new Set(points.filter((p) => p.deviceId && p.moduleInstance).map((p) => `${p.deviceId}|${p.moduleInstance}`))];
  if (channelKeys.length || moduleKeys.length) {
    return { basis: 'project-structure', evidence: [{ code: 'logical-project-structure', detail: `${channelKeys.length} ETS-Kanal- und ${moduleKeys.length} Modulstruktur(en) verbinden die Rollen`, objectKeys: points.map((p) => p.key) }] };
  }
  const shared = sharedAcrossDevices(points);
  if (shared.length) {
    return { basis: 'shared-group-address', evidence: [{ code: 'shared-group-across-devices', detail: `${shared.length} identische GA(s) verbinden mehrere Geräte`, objectKeys: points.map((p) => p.key) }] };
  }
  return null;
}
