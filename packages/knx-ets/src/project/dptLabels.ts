import type { EtsXmlRuntime } from '../ports/xml.ts';
import { translationMapFromXml } from '../parser/translations.ts';

export function parseDptLabels(xml: EtsXmlRuntime, masterText?: string): Map<string, string> {
  const labels = new Map<string, string>();
  if (!masterText) return labels;

  const document = xml.parse(masterText);
  const translations = translationMapFromXml(xml, document);
  for (const node of xml.all(document, 'DatapointSubtype')) {
    const id = xml.attr(node, 'Id');
    if (!id) continue;
    const translated = translations.get(id) || {};
    labels.set(id, translated.Text || xml.attr(node, 'Text') || id);
  }
  return labels;
}
