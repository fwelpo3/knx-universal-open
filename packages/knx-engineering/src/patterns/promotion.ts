import type { KnxDevice } from '../../../knx-model/src/index.ts';
import { deviceFingerprint } from './fingerprint.ts';
import { buildDeviceStructuralSignature } from './signature.ts';
import type { ApplicationFamilyPattern, ExactDevicePattern } from './registry.ts';

export interface ConfirmedChannelFunction {
  channelId: string;
  functionId: string;
  objectIds?: string[];
}

/**
 * Promote a manually/externally confirmed device mapping into an exact reusable signature.
 * No automatic semantics are invented here.
 */
export function promoteExactDevicePattern(
  device: KnxDevice,
  id: string,
  confirmed: ConfirmedChannelFunction[],
  source?: string,
): ExactDevicePattern {
  const knownChannels = new Set(buildDeviceStructuralSignature(device).channels.map((channel) => channel.id));
  for (const item of confirmed) {
    if (!knownChannels.has(item.channelId)) throw new Error(`Unknown channel '${item.channelId}' for device '${device.id}'.`);
  }
  return {
    id,
    fingerprint: deviceFingerprint(device),
    source,
    functions: confirmed.map((item) => ({
      functionId: item.functionId,
      channelId: item.channelId,
      channelName: device.communicationObjects.find((object) => object.channel?.id === item.channelId)?.channel?.name,
      objectIds: item.objectIds ? [...item.objectIds] : undefined,
    })),
  };
}

/**
 * Promote confirmed channel semantics to an application-family pattern.
 * All channels with the same structural key can then be recognized across product variants
 * that share the same manufacturer/application program.
 */
export function promoteApplicationFamilyPattern(
  device: KnxDevice,
  id: string,
  confirmed: ConfirmedChannelFunction[],
  source?: string,
): ApplicationFamilyPattern {
  if (!device.applicationProgramRef) throw new Error(`Device '${device.id}' has no applicationProgramRef.`);
  const signature = buildDeviceStructuralSignature(device);
  const channelFunctions = confirmed.map((item) => {
    const channel = signature.channels.find((candidate) => candidate.id === item.channelId);
    if (!channel) throw new Error(`Unknown channel '${item.channelId}' for device '${device.id}'.`);
    return { structuralKey: channel.structuralKey, functionId: item.functionId };
  });
  const unique = new Map(channelFunctions.map((item) => [`${item.structuralKey}::${item.functionId}`, item]));
  return {
    id,
    manufacturer: device.manufacturer,
    applicationProgramRef: device.applicationProgramRef,
    channelFunctions: [...unique.values()],
    source,
  };
}
