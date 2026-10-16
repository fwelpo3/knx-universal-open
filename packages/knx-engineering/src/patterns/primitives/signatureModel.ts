import { normalizeDptId } from '../../../../knx-core/src/index.ts';
import type { KnxCommunicationObject, KnxDevice } from '../../../../knx-model/src/index.ts';
import { communicationRole, dptFamily, normalizeSemanticText, semanticTokens } from '../normalize.ts';
import { normalizePatternStableIdentity } from './identity.ts';
import type {
  BuildPatternDeviceSignatureOptions,
  PatternChannelSignature,
  PatternDeviceIdentitySignature,
  PatternDeviceSignature,
  PatternObjectFlagSignature,
  PatternObjectSignature,
} from './types.ts';

const FLAG_ORDER: Array<keyof PatternObjectFlagSignature> = [
  'communication',
  'read',
  'write',
  'transmit',
  'update',
  'readOnInit',
];

function numericObjectNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeFlags(object: KnxCommunicationObject): PatternObjectFlagSignature {
  const flags: PatternObjectFlagSignature = {};
  for (const key of FLAG_ORDER) {
    const value = object.flags?.[key];
    if (typeof value === 'boolean') flags[key] = value;
  }
  return flags;
}

function flagsKey(flags: PatternObjectFlagSignature): string {
  return FLAG_ORDER.map((key) => `${key}=${flags[key] === undefined ? '?' : flags[key] ? '1' : '0'}`).join(',');
}

/** Exact structural shape: intentionally excludes names, translations and semantic tokens. */
export function patternObjectExactStructureKey(signature: Omit<PatternObjectSignature, 'exactStructureKey' | 'semanticStructureKey' | 'structuralKey'>): string {
  return [
    `dpt=${signature.normalizedDpt || '-'}`,
    `family=${signature.dptFamily || '-'}`,
    `direction=${signature.direction}`,
    `flags=${flagsKey(signature.flags)}`,
  ].join(';');
}

/** Semantic fallback shape. Never sufficient to establish EXACT identity. */
export function patternObjectSemanticStructureKey(signature: Omit<PatternObjectSignature, 'exactStructureKey' | 'semanticStructureKey' | 'structuralKey'>): string {
  return [patternObjectExactStructureKey(signature), `tokens=${signature.semanticTokens.join(',') || '-'}`].join(';');
}

/** @deprecated 0.4 compatibility alias for the semantic key. */
export function patternObjectStructuralKey(signature: Omit<PatternObjectSignature, 'exactStructureKey' | 'semanticStructureKey' | 'structuralKey'>): string {
  return patternObjectSemanticStructureKey(signature);
}

export function buildPatternObjectSignature(object: KnxCommunicationObject): PatternObjectSignature {
  const normalizedDpt = object.datapointType ? normalizeDptId(object.datapointType) || undefined : undefined;
  const base: Omit<PatternObjectSignature, 'exactStructureKey' | 'semanticStructureKey' | 'structuralKey'> = {
    objectId: object.id,
    direction: communicationRole(object),
    flags: normalizeFlags(object),
    semanticTokens: semanticTokens(object.name, object.text, object.functionText, object.description),
  };
  const objectNumber = numericObjectNumber(object.number);
  const family = dptFamily(object.datapointType);
  if (objectNumber !== undefined) base.objectNumber = objectNumber;
  if (normalizedDpt) base.normalizedDpt = normalizedDpt;
  if (family) base.dptFamily = family;
  if (object.channel?.id) base.channelId = object.channel.id;
  if (object.channel?.name) base.channelName = object.channel.name;
  const exactStructureKey = patternObjectExactStructureKey(base);
  const semanticStructureKey = patternObjectSemanticStructureKey(base);
  return { ...base, exactStructureKey, semanticStructureKey, structuralKey: semanticStructureKey };
}

function sortedObjects(objects: readonly PatternObjectSignature[]): PatternObjectSignature[] {
  return [...objects].sort((a, b) => (a.objectNumber ?? Number.MAX_SAFE_INTEGER) - (b.objectNumber ?? Number.MAX_SAFE_INTEGER) || a.objectId.localeCompare(b.objectId));
}

export function patternChannelExactStructureKey(objects: readonly PatternObjectSignature[]): string {
  return sortedObjects(objects).map((object) => object.exactStructureKey).join('|');
}

export function patternChannelSemanticStructureKey(objects: readonly PatternObjectSignature[]): string {
  return sortedObjects(objects).map((object) => object.semanticStructureKey).join('|');
}

/** @deprecated 0.4 compatibility alias for the semantic key. */
export function patternChannelStructuralKey(objects: readonly PatternObjectSignature[]): string {
  return patternChannelSemanticStructureKey(objects);
}

export function buildPatternChannelSignatures(device: KnxDevice): PatternChannelSignature[] {
  const groups = new Map<string, KnxCommunicationObject[]>();
  for (const object of device.communicationObjects) {
    const channelId = object.channel?.id;
    if (!channelId) continue;
    const group = groups.get(channelId) || [];
    group.push(object);
    groups.set(channelId, group);
  }

  return [...groups.entries()]
    .map(([channelId, objects]) => {
      const signatures = objects.map(buildPatternObjectSignature);
      const exactStructureKey = patternChannelExactStructureKey(signatures);
      const semanticStructureKey = patternChannelSemanticStructureKey(signatures);
      const channel: PatternChannelSignature = {
        channelId,
        objects: signatures,
        exactStructureKey,
        semanticStructureKey,
        structuralKey: semanticStructureKey,
      };
      const channelName = objects.find((object) => object.channel?.name)?.channel?.name;
      if (channelName) channel.channelName = channelName;
      return channel;
    })
    .sort((a, b) => a.channelId.localeCompare(b.channelId));
}

export function buildPatternDeviceIdentity(device: KnxDevice): PatternDeviceIdentitySignature {
  const manufacturer = normalizeSemanticText(device.manufacturer) || undefined;
  const productName = normalizeSemanticText(device.productName || device.name) || undefined;
  const orderNumber = normalizeSemanticText(device.orderNumber) || undefined;
  const applicationProgramRef = normalizeSemanticText(device.applicationProgramRef) || undefined;
  const identity: PatternDeviceIdentitySignature = {
    canonicalKey: [
      `manufacturer=${manufacturer || '-'}`,
      `product=${productName || '-'}`,
      `order=${orderNumber || '-'}`,
      `application=${applicationProgramRef || '-'}`,
    ].join(';'),
  };
  if (manufacturer) identity.manufacturer = manufacturer;
  if (productName) identity.productName = productName;
  if (orderNumber) identity.orderNumber = orderNumber;
  if (applicationProgramRef) identity.applicationProgramRef = applicationProgramRef;
  return identity;
}

/**
 * Builds the 0.4.x signature model from canonical KNX data only.
 * No repetition detection, channel inference, function recognition or auto-binding occurs here.
 */
export function buildPatternDeviceSignature(device: KnxDevice, options: BuildPatternDeviceSignatureOptions = {}): PatternDeviceSignature {
  const channels = buildPatternChannelSignatures(device);
  const unassignedObjects = device.communicationObjects
    .filter((object) => !object.channel?.id)
    .map(buildPatternObjectSignature)
    .sort((a, b) => (a.objectNumber ?? Number.MAX_SAFE_INTEGER) - (b.objectNumber ?? Number.MAX_SAFE_INTEGER) || a.objectId.localeCompare(b.objectId));

  const exactStructureKey = [
    ...channels.map((channel) => channel.exactStructureKey).sort(),
    ...(unassignedObjects.length ? [`unassigned:${patternChannelExactStructureKey(unassignedObjects)}`] : []),
  ].join('||');
  const semanticStructureKey = [
    ...channels.map((channel) => channel.semanticStructureKey).sort(),
    ...(unassignedObjects.length ? [`unassigned:${patternChannelSemanticStructureKey(unassignedObjects)}`] : []),
  ].join('||');

  return {
    schemaVersion: 1,
    deviceId: device.id,
    identity: buildPatternDeviceIdentity(device),
    ...(options.stableIdentity ? { stableIdentity: normalizePatternStableIdentity(options.stableIdentity) } : {}),
    ...(options.variantIdentity ? { variantIdentity: structuredClone(options.variantIdentity) } : {}),
    channels,
    unassignedObjects,
    exactStructureKey,
    semanticStructureKey,
    structuralKey: semanticStructureKey,
  };
}
