import { assertSerializableEtsSourceProject } from './assertSerializable.ts';
import type {
  EtsSourceDevice,
  EtsSourceDeviceVariant,
  EtsSourceGroupAddress,
  EtsSourceLocation,
  EtsSourceProject,
  EtsSourceStats,
} from './types.ts';

export interface BuildEtsSourceProjectInput {
  fileName?: string;
  projectId?: string;
  projectName?: string;
  locations?: Iterable<EtsSourceLocation>;
  devices?: Iterable<EtsSourceDevice>;
  groupAddresses?: Iterable<EtsSourceGroupAddress>;
  variants?: Iterable<EtsSourceDeviceVariant>;
  stats?: Partial<EtsSourceStats>;
}

/** Build a deterministic, serializable source DTO from parser-owned records. */
export function buildEtsSourceProject(input: BuildEtsSourceProjectInput): EtsSourceProject {
  const locations = [...(input.locations || [])].map(cloneLocation).sort(compareLocations);
  const devices = [...(input.devices || [])].map(cloneDevice).sort(compareDevices);
  const groupAddresses = [...(input.groupAddresses || [])]
    .map((ga) => ({ ...ga }))
    .sort((a, b) => compareAddress(a.address, b.address) || a.name.localeCompare(b.name, 'de'));
  const variants = [...(input.variants || [])]
    .map((variant) => ({ ...variant, deviceIds: [...variant.deviceIds].sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const project: EtsSourceProject = {
    schemaVersion: 1,
    source: 'knxproj',
    fileName: input.fileName,
    projectId: input.projectId,
    projectName: input.projectName,
    locations,
    devices,
    groupAddresses,
    variants,
    stats: {
      parseMs: input.stats?.parseMs,
      deviceCount: input.stats?.deviceCount ?? devices.length,
      variantCount: input.stats?.variantCount ?? variants.length,
    },
  };

  assertSerializableEtsSourceProject(project);
  return project;
}

function cloneLocation(location: EtsSourceLocation): EtsSourceLocation {
  return { ...location, path: [...location.path], deviceIds: [...location.deviceIds].sort() };
}

function compareLocations(a: EtsSourceLocation, b: EtsSourceLocation): number {
  return a.path.join(' / ').localeCompare(b.path.join(' / '), 'de') || a.id.localeCompare(b.id);
}

function cloneDevice(device: EtsSourceDevice): EtsSourceDevice {
  return {
    ...device,
    topology: { ...device.topology, path: device.topology.path ? [...device.topology.path] : undefined },
    placement: device.placement
      ? { ...device.placement, path: device.placement.path ? [...device.placement.path] : undefined }
      : undefined,
    communicationObjects: device.communicationObjects?.map((object) => ({
      ...object,
      flags: object.flags ? { ...object.flags } : undefined,
      linkedGroupAddresses: object.linkedGroupAddresses?.map((link) => ({ ...link })),
      etsGroupPath: object.etsGroupPath?.map((group) => ({ ...group })),
    })),
  };
}

function compareDevices(a: EtsSourceDevice, b: EtsSourceDevice): number {
  return comparePhysicalAddress(a.topology.physicalAddress, b.topology.physicalAddress) || a.id.localeCompare(b.id);
}

function comparePhysicalAddress(a: string, b: string): number {
  const pa = String(a || '').split('.').map(Number);
  const pb = String(b || '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (Number.isFinite(pa[i]) ? pa[i] : Number.MAX_SAFE_INTEGER) -
      (Number.isFinite(pb[i]) ? pb[i] : Number.MAX_SAFE_INTEGER);
    if (diff) return diff;
  }
  return String(a || '').localeCompare(String(b || ''));
}

function compareAddress(a: string, b: string): number {
  const pa = String(a || '').split('/').map(Number);
  const pb = String(b || '').split('/').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (Number.isFinite(pa[i]) ? pa[i] : Number.MAX_SAFE_INTEGER) -
      (Number.isFinite(pb[i]) ? pb[i] : Number.MAX_SAFE_INTEGER);
    if (diff) return diff;
  }
  return String(a || '').localeCompare(String(b || ''));
}
