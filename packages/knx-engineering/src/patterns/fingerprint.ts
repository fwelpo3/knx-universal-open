import type { KnxDevice } from '../../../knx-model/src/index.ts';
import { normalizeSemanticText } from './normalize.ts';
import { buildDeviceStructuralSignature } from './signature.ts';

/**
 * Human-readable canonical fingerprint. It is intentionally not a cryptographic hash:
 * consumers can inspect it, persist it and later map it to a versioned pattern pack.
 */
export function deviceFingerprint(device: KnxDevice): string {
  const signature = buildDeviceStructuralSignature(device);
  const channels = signature.channels.map((channel) => channel.structuralKey).sort().join('||');
  return [
    `manufacturer=${normalizeSemanticText(device.manufacturer)}`,
    `product=${normalizeSemanticText(device.productName || device.name)}`,
    `order=${normalizeSemanticText(device.orderNumber)}`,
    `application=${normalizeSemanticText(device.applicationProgramRef)}`,
    `channels=${channels}`,
  ].join(';');
}
