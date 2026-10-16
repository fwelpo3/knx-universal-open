import { etsSignaturePart, hashEtsText } from '../parser/text.ts';
import type { EtsSourceDevice, EtsSourceDeviceVariant } from '../source/types.ts';

export function addDeviceVariant(
  bucket: Map<string, EtsSourceDeviceVariant>,
  device: EtsSourceDevice
): void {
  const objects = device.communicationObjects || [];
  const signature = objects
    .map((object) => [
      object.id,
      object.datapointType,
      object.objectSize,
      object.flags?.communication,
      object.flags?.read,
      object.flags?.write,
      object.flags?.transmit,
      object.flags?.update,
    ].map(etsSignaturePart).join('|'))
    .sort()
    .join('||');
  const raw = [
    etsSignaturePart(device.orderNumber || device.productName),
    etsSignaturePart(device.applicationProgramRef),
    signature,
  ].join('###');
  const id = `variant-${hashEtsText(raw)}`;

  const existing = bucket.get(id);
  if (existing) {
    existing.deviceIds.push(device.id);
    return;
  }

  bucket.set(id, {
    id,
    manufacturer: device.manufacturer,
    productName: device.productName,
    orderNumber: device.orderNumber,
    applicationProgramRef: device.applicationProgramRef,
    communicationObjectSignature: signature,
    activeObjectCount: objects.length,
    deviceIds: [device.id],
  });
}
