import type { EtsXmlRuntime } from '../ports/xml.ts';
import type { KnxprodBootstrap } from './bootstrap.ts';
import type { EtsProductCatalogItem, EtsProductDatabaseIndex } from './types.ts';

function manufacturerIdFromPath(path: string): string {
  return path.split('/')[0] || 'unknown';
}

interface HardwareMaps {
  products: Map<string, { orderNumber?: string; text?: string }>;
  applicationsByHardware2Program: Map<string, string[]>;
}

function buildHardwareMaps(bootstrap: KnxprodBootstrap, xml: EtsXmlRuntime): Map<string, HardwareMaps> {
  const maps = new Map<string, HardwareMaps>();
  for (const file of bootstrap.hardware) {
    const manufacturerId = manufacturerIdFromPath(file.path);
    const document = xml.parse(file.text);
    const products = new Map<string, { orderNumber?: string; text?: string }>();
    for (const node of xml.all(document, 'Product')) {
      const id = xml.attr(node, 'Id');
      if (!id) continue;
      products.set(id, {
        orderNumber: xml.attr(node, 'OrderNumber') || undefined,
        text: xml.attr(node, 'Text') || xml.attr(node, 'Name') || undefined,
      });
    }
    const applicationsByHardware2Program = new Map<string, string[]>();
    for (const h2p of xml.all(document, 'Hardware2Program')) {
      const id = xml.attr(h2p, 'Id');
      if (!id) continue;
      const refs = xml.all(h2p, 'ApplicationProgramRef')
        .map((ref) => xml.attr(ref, 'RefId'))
        .filter(Boolean);
      applicationsByHardware2Program.set(id, [...new Set(refs)]);
    }
    maps.set(manufacturerId, { products, applicationsByHardware2Program });
  }
  return maps;
}

/** Parse lightweight catalog/product/application references without loading application XML bodies. */
export function indexKnxprodCatalog(bootstrap: KnxprodBootstrap, xml: EtsXmlRuntime): EtsProductDatabaseIndex {
  const hardwareMaps = buildHardwareMaps(bootstrap, xml);
  const byManufacturer = new Map<string, EtsProductCatalogItem[]>();

  for (const file of bootstrap.catalogs) {
    const manufacturerId = manufacturerIdFromPath(file.path);
    const hardware = hardwareMaps.get(manufacturerId);
    const document = xml.parse(file.text);
    const items = byManufacturer.get(manufacturerId) || [];
    for (const node of xml.all(document, 'CatalogItem')) {
      const id = xml.attr(node, 'Id');
      if (!id) continue;
      const productRefId = xml.attr(node, 'ProductRefId') || undefined;
      const hardware2ProgramRefId = xml.attr(node, 'Hardware2ProgramRefId') || undefined;
      const product = productRefId ? hardware?.products.get(productRefId) : undefined;
      items.push({
        id,
        manufacturerId,
        name: xml.attr(node, 'Name') || undefined,
        number: xml.attr(node, 'Number') || undefined,
        productRefId,
        hardware2ProgramRefId,
        orderNumber: product?.orderNumber,
        productText: product?.text,
        applicationProgramRefs: hardware2ProgramRefId
          ? [...(hardware?.applicationsByHardware2Program.get(hardware2ProgramRefId) || [])]
          : [],
      });
    }
    byManufacturer.set(manufacturerId, items);
  }

  const applicationProgramIds = Object.keys(bootstrap.layout.applicationFiles).sort();
  return {
    schemaVersion: 1,
    manufacturers: [...byManufacturer.entries()].map(([id, catalogItems]) => ({
      id,
      catalogItems: [...catalogItems].sort((a, b) => a.id.localeCompare(b.id)),
    })).sort((a, b) => a.id.localeCompare(b.id)),
    applicationProgramIds,
  };
}
