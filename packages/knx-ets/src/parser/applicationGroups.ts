import type { EtsXmlDocumentHandle, EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';
import { cleanEtsObjectText } from './text.ts';
import { translatedXmlNodeText, type EtsTranslationAttributes } from './translations.ts';

export interface EtsObjectGroupPathItem {
  id: string;
  label: string;
  rawLabel?: string;
  type: string;
  source: 'ets';
  order: number;
}

export function applicationObjectGroupsFromXml(
  xml: EtsXmlNavigator,
  document: EtsXmlDocumentHandle,
  translations: ReadonlyMap<string, EtsTranslationAttributes>
): Map<string, EtsObjectGroupPathItem[]> {
  const out = new Map<string, EtsObjectGroupPathItem[]>();
  const dynamic = xml.all(document, 'Dynamic')[0];
  if (!dynamic) return out;

  let counter = 0;
  const groupTags = new Set(['Channel', 'ChannelIndependentBlock']);
  const walk = (node: EtsXmlNodeHandle, path: EtsObjectGroupPathItem[] = []) => {
    for (const child of xml.children(node)) {
      let next = path;
      const localName = xml.localName(child);
      if (groupTags.has(localName)) {
        const rawLabel = translatedXmlNodeText(xml, child, translations);
        const label = cleanEtsObjectText(rawLabel);
        if (label) {
          next = [...path, {
            id: xml.attr(child, 'Id') || label,
            label,
            rawLabel,
            type: localName,
            source: 'ets',
            order: ++counter,
          }];
        }
      }
      if (localName === 'ComObjectRefRef') {
        const ref = xml.attr(child, 'RefId');
        if (ref) {
          out.set(ref, next);
          out.set(ref.replace(/^.*?_O-/, 'O-'), next);
        }
      }
      walk(child, next);
    }
  };

  walk(dynamic);
  return out;
}
