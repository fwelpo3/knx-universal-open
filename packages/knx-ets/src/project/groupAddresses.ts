import type { EtsXmlRuntime } from '../ports/xml.ts';
import type { EtsSourceGroupAddress } from '../source/types.ts';
import { xmlGroupAddress } from '../xml/navigation.ts';

export function parseGroupAddresses(xml: EtsXmlRuntime, document: object): EtsSourceGroupAddress[] {
  return xml.all(document, 'GroupAddress').map((node) => ({
    id: xml.attr(node, 'Id') || undefined,
    name: xml.attr(node, 'Name'),
    address: xmlGroupAddress(xml.attr(node, 'Address')),
    datapointType: xml.attr(node, 'DatapointType') || undefined,
  }));
}

export function indexGroupAddresses(
  items: readonly EtsSourceGroupAddress[]
): Map<string, EtsSourceGroupAddress> {
  const index = new Map<string, EtsSourceGroupAddress>();
  for (const item of items) {
    if (!item.id) continue;
    index.set(item.id, item);
    const shortId = item.id.match(/(GA-\d+)$/)?.[1];
    if (shortId) index.set(shortId, item);
  }
  return index;
}
