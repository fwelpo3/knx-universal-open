import type { EtsXmlNodeHandle, EtsXmlRuntime } from '../ports/xml.ts';
import type { EtsSourceCommunicationObject, EtsSourceGroupAddress } from '../source/types.ts';
import { activeObjectRefs } from '../xml/navigation.ts';

export function parseInstanceCommunicationObjects(
  xml: EtsXmlRuntime,
  deviceNode: EtsXmlNodeHandle,
  dptLabels: ReadonlyMap<string, string>,
  groupAddressById: ReadonlyMap<string, EtsSourceGroupAddress>
): EtsSourceCommunicationObject[] {
  const instanceRefs = xml.all(deviceNode, 'ComObjectInstanceRef');
  const byRef = new Map(instanceRefs.map((node) => [xml.attr(node, 'RefId'), node]));

  return activeObjectRefs(xml, deviceNode).map((ref) => {
    const instance = byRef.get(ref);
    const datapointType = instance ? xml.attr(instance, 'DatapointType') : '';
    const linkIds = instance ? xml.attr(instance, 'Links').split(/\s+/).filter(Boolean) : [];
    const linkedGroupAddresses = linkIds
      .map((linkId) => groupAddressById.get(linkId))
      .filter((item): item is EtsSourceGroupAddress => Boolean(item))
      .map((item) => ({ address: item.address, name: item.name }));

    return {
      id: ref,
      number: optionalAttr(xml, instance, 'Number'),
      name: optionalAttr(xml, instance, 'Name'),
      text: optionalAttr(xml, instance, 'Text'),
      functionText: optionalAttr(xml, instance, 'FunctionText'),
      description: optionalAttr(xml, instance, 'Description'),
      datapointType: datapointType || undefined,
      datapointTypeLabel: datapointType ? dptLabels.get(datapointType) : undefined,
      objectSize: optionalAttr(xml, instance, 'ObjectSize'),
      priority: optionalAttr(xml, instance, 'Priority'),
      flags: instance ? {
        communication: optionalAttr(xml, instance, 'CommunicationFlag'),
        read: optionalAttr(xml, instance, 'ReadFlag'),
        write: optionalAttr(xml, instance, 'WriteFlag'),
        transmit: optionalAttr(xml, instance, 'TransmitFlag'),
        update: optionalAttr(xml, instance, 'UpdateFlag'),
        readOnInit: optionalAttr(xml, instance, 'ReadOnInitFlag'),
      } : undefined,
      linkedGroupAddresses,
    };
  });
}

function optionalAttr(
  xml: EtsXmlRuntime,
  node: EtsXmlNodeHandle | undefined,
  name: string
): string | undefined {
  return node ? xml.attr(node, name) || undefined : undefined;
}
