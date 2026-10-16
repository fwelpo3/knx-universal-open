import {
  assertSerializableKnxProject,
  normalizeKnxFlag,
  type KnxCommunicationObject,
  type KnxDevice,
  type KnxProjectModel,
} from '../../../knx-model/src/index.ts';
import type { EtsSourceCommunicationObject, EtsSourceDevice, EtsSourceProject } from '../source/types.ts';

/** Map ETS evidence into the canonical KNX model without carrying ETS runtime objects. */
export function etsSourceToKnxProject(source: EtsSourceProject): KnxProjectModel {
  const project: KnxProjectModel = {
    schemaVersion: 1,
    id: source.projectId,
    name: source.projectName,
    locations: (source.locations || []).map((location) => ({
      id: location.id,
      name: location.name,
      kind: mapLocationKind(location.type),
      parentId: location.parentId,
      path: [...location.path],
      deviceIds: [...location.deviceIds],
      source: { source: 'ets', id: location.id },
    })),
    devices: source.devices.map(mapDevice),
    groupAddresses: source.groupAddresses.map((ga) => ({
      address: ga.address,
      name: ga.name,
      datapointType: ga.datapointType,
      source: ga.id ? { source: 'ets', id: ga.id } : { source: 'ets' },
    })),
  };
  assertSerializableKnxProject(project);
  return project;
}

function mapDevice(device: EtsSourceDevice): KnxDevice {
  return {
    id: device.id,
    name: device.name,
    manufacturer: device.manufacturer,
    productName: device.productName,
    orderNumber: device.orderNumber,
    applicationProgramRef: device.applicationProgramRef,
    topology: {
      physicalAddress: device.topology.physicalAddress,
      area: segment(device.topology.areaId, device.topology.areaAddress, device.topology.areaName),
      mainLine: segment(device.topology.mainLineId, device.topology.mainLineAddress, device.topology.mainLineName),
      line: segment(device.topology.lineId, device.topology.lineAddress, device.topology.lineName),
      deviceAddress: device.topology.deviceAddress,
      path: device.topology.path ? [...device.topology.path] : undefined,
    },
    placement: device.placement ? {
      id: device.placement.id,
      name: device.placement.name,
      type: device.placement.type,
      path: device.placement.path ? [...device.placement.path] : undefined,
    } : undefined,
    communicationObjects: (device.communicationObjects || []).map(mapObject),
    source: { source: 'ets', id: device.id },
  };
}

function mapObject(object: EtsSourceCommunicationObject): KnxCommunicationObject {
  return {
    id: object.id,
    number: object.number,
    name: object.name,
    text: object.text,
    functionText: object.functionText,
    description: object.description,
    datapointType: object.datapointType,
    datapointTypeLabel: object.datapointTypeLabel,
    objectSize: object.objectSize,
    priority: object.priority,
    flags: object.flags ? {
      communication: normalizeKnxFlag(object.flags.communication),
      read: normalizeKnxFlag(object.flags.read),
      write: normalizeKnxFlag(object.flags.write),
      transmit: normalizeKnxFlag(object.flags.transmit),
      update: normalizeKnxFlag(object.flags.update),
      readOnInit: normalizeKnxFlag(object.flags.readOnInit),
    } : undefined,
    channel: object.channelId || object.channelName ? { id: object.channelId, name: object.channelName } : undefined,
    groupAddresses: (object.linkedGroupAddresses || []).map((link) => link.address),
    source: { source: 'ets', id: object.id },
  };
}

function segment(id?: string, address?: string, name?: string) {
  return id || address || name ? { id, address, name } : undefined;
}


function mapLocationKind(type?: string): import('../../../knx-model/src/index.ts').KnxLocationKind {
  switch (String(type || '').toLowerCase()) {
    case 'building': return 'building';
    case 'buildingpart': return 'building-part';
    case 'floor': return 'floor';
    case 'room': return 'room';
    case 'corridor': return 'corridor';
    case 'stairway': return 'stairway';
    case 'distributionboard': return 'distribution-board';
    case 'zone': return 'zone';
    case 'site': return 'site';
    default: return 'unknown';
  }
}
