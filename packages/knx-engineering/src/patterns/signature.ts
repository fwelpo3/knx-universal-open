import type { KnxCommunicationObject, KnxDevice } from '../../../knx-model/src/index.ts';
import { inferChannelsFromRepeatedSequence } from './sequenceMining.ts';
import { channelStructuralKey, communicationObjectSignature } from './structureAtoms.ts';
import type {
  ChannelSignature,
  DeviceStructuralSignature,
  RepeatedChannelPattern,
} from './types.ts';

export { channelStructuralKey, communicationObjectSignature } from './structureAtoms.ts';

function explicitChannelCount(device: KnxDevice): number {
  return new Set(device.communicationObjects.map((object) => object.channel?.id || object.channel?.name).filter(Boolean)).size;
}

export function buildChannelSignatures(device: KnxDevice): ChannelSignature[] {
  const explicitCount = explicitChannelCount(device);
  if (explicitCount === 0) {
    const inferred = inferChannelsFromRepeatedSequence(device.communicationObjects);
    if (inferred.length >= 2) return inferred;
  }

  const groups = new Map<string, KnxCommunicationObject[]>();
  for (const object of device.communicationObjects) {
    const channelKey = object.channel?.id || object.channel?.name || '__ungrouped__';
    const list = groups.get(channelKey) || [];
    list.push(object);
    groups.set(channelKey, list);
  }

  return [...groups.entries()].map(([id, objects]) => {
    const signatures = objects.map(communicationObjectSignature);
    return {
      id,
      name: objects.find((object) => object.channel?.name)?.channel?.name,
      objectIds: objects.map((object) => object.id),
      objectSignatures: signatures,
      structuralKey: channelStructuralKey(signatures),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export function findRepeatedChannelPatterns(channels: ChannelSignature[]): RepeatedChannelPattern[] {
  const byKey = new Map<string, ChannelSignature[]>();
  for (const channel of channels) {
    if (!channel.structuralKey || channel.id === '__ungrouped__') continue;
    const list = byKey.get(channel.structuralKey) || [];
    list.push(channel);
    byKey.set(channel.structuralKey, list);
  }

  return [...byKey.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([structuralKey, group]) => ({
      structuralKey,
      channelIds: group.map((channel) => channel.id),
      channelNames: group.map((channel) => channel.name || channel.id),
      occurrences: group.length,
      objectCount: group[0]?.objectSignatures.length || 0,
    }))
    .sort((a, b) => b.occurrences - a.occurrences || b.objectCount - a.objectCount || a.structuralKey.localeCompare(b.structuralKey));
}

export function buildDeviceStructuralSignature(device: KnxDevice): DeviceStructuralSignature {
  const channels = buildChannelSignatures(device);
  return {
    deviceId: device.id,
    manufacturer: device.manufacturer,
    productName: device.productName,
    orderNumber: device.orderNumber,
    applicationProgramRef: device.applicationProgramRef,
    channels,
    repeatedChannelPatterns: findRepeatedChannelPatterns(channels),
  };
}
