import type { KnxDevice, KnxProjectModel } from '../../../knx-model/src/index.ts';
import { normalizeSemanticText } from './normalize.ts';
import { buildDeviceStructuralSignature } from './signature.ts';

export interface PatternDiscoveryCluster {
  key: string;
  kind: 'application-family' | 'cross-manufacturer-structure';
  occurrences: number;
  deviceIds: string[];
  manufacturers: string[];
  products: string[];
  applicationProgramRefs: string[];
  channelStructuralKeys: string[];
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function structureKey(device: KnxDevice): string {
  return buildDeviceStructuralSignature(device).channels.map((channel) => channel.structuralKey).sort().join('||');
}

function applicationFamilyKey(device: KnxDevice): string {
  return [
    normalizeSemanticText(device.manufacturer),
    normalizeSemanticText(device.applicationProgramRef),
    structureKey(device),
  ].join('::');
}

function toCluster(kind: PatternDiscoveryCluster['kind'], key: string, devices: KnxDevice[]): PatternDiscoveryCluster {
  return {
    key,
    kind,
    occurrences: devices.length,
    deviceIds: devices.map((device) => device.id).sort(),
    manufacturers: unique(devices.map((device) => device.manufacturer)),
    products: unique(devices.map((device) => device.productName || device.name)),
    applicationProgramRefs: unique(devices.map((device) => device.applicationProgramRef)),
    channelStructuralKeys: unique(devices.flatMap((device) => buildDeviceStructuralSignature(device).channels.map((channel) => channel.structuralKey))),
  };
}

function clustersBy(devices: KnxDevice[], keyOf: (device: KnxDevice) => string, kind: PatternDiscoveryCluster['kind'], minimumOccurrences: number): PatternDiscoveryCluster[] {
  const groups = new Map<string, KnxDevice[]>();
  for (const device of devices) {
    const key = keyOf(device);
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(device);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length >= minimumOccurrences)
    .map(([key, group]) => toCluster(kind, key, group))
    .sort((a, b) => b.occurrences - a.occurrences || a.key.localeCompare(b.key));
}

/**
 * Mines deterministic recurring structures. It does not assign semantics by itself.
 * The output is intended for review and later promotion into a versioned pattern pack.
 */
export function discoverProjectPatternClusters(project: KnxProjectModel, minimumOccurrences = 2): PatternDiscoveryCluster[] {
  const applicationFamilies = clustersBy(project.devices, applicationFamilyKey, 'application-family', minimumOccurrences);
  const crossManufacturer = clustersBy(project.devices, structureKey, 'cross-manufacturer-structure', minimumOccurrences);
  return [...applicationFamilies, ...crossManufacturer];
}
