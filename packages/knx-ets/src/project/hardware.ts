import type { EtsExecutionScheduler, EtsProgressSink } from '../ports/execution.ts';
import type { EtsXmlRuntime } from '../ports/xml.ts';
import { translationMapFromXml } from '../parser/translations.ts';
import type { EtsProductInfo } from './internalTypes.ts';

export async function parseHardware(
  xml: EtsXmlRuntime,
  files: readonly { path: string; text: string }[],
  scheduler: EtsExecutionScheduler,
  report: EtsProgressSink
): Promise<{ products: Map<string, EtsProductInfo>; hardwareToApplication: Map<string, string> }> {
  const products = new Map<string, EtsProductInfo>();
  const hardwareToApplication = new Map<string, string>();

  for (let index = 0; index < files.length; index++) {
    const document = xml.parse(files[index].text);
    const translations = translationMapFromXml(xml, document);
    const manufacturer = inferManufacturerName(xml, document);

    for (const product of xml.all(document, 'Product')) {
      const id = xml.attr(product, 'Id');
      if (!id) continue;
      const translated = translations.get(id) || {};
      products.set(id, {
        name: translated.Text || xml.attr(product, 'Text') || 'Unbekanntes Gerät',
        orderNumber: xml.attr(product, 'OrderNumber'),
        manufacturer,
      });
    }

    for (const hardware of xml.all(document, 'Hardware2Program')) {
      const id = xml.attr(hardware, 'Id');
      const applicationRef = xml.children(hardware, 'ApplicationProgramRef')[0];
      const ref = applicationRef ? xml.attr(applicationRef, 'RefId') : '';
      if (id && ref) hardwareToApplication.set(id, ref);
    }

    report({
      phase: 'hardware-parse',
      percent: 52 + Math.round(((index + 1) / Math.max(1, files.length)) * 14),
      detail: `${index + 1}/${files.length}`,
    });
    await scheduler.yield();
  }

  return { products, hardwareToApplication };
}

function inferManufacturerName(xml: EtsXmlRuntime, document: object): string | undefined {
  const manufacturer = xml.all(document, 'Manufacturer')[0];
  return manufacturer
    ? xml.attr(manufacturer, 'Name') || xml.attr(manufacturer, 'Text') || undefined
    : undefined;
}
