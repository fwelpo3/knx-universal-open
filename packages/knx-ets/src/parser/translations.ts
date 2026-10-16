import type { EtsXmlDocumentHandle, EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';

export type EtsTranslationAttributes = Record<string, string>;

export function translationMapFromXml(
  xml: EtsXmlNavigator,
  document: EtsXmlDocumentHandle,
  language = 'de-DE'
): Map<string, EtsTranslationAttributes> {
  const map = new Map<string, EtsTranslationAttributes>();
  const languages = xml.all(document, 'Language');
  const translated = languages.filter((node) => xml.all(node, 'TranslationElement').length > 0);
  const selected =
    translated.find((node) => xml.attr(node, 'Identifier') === language) ||
    translated.find((node) => xml.attr(node, 'Identifier').toLowerCase().startsWith('de')) ||
    languages.find((node) => xml.attr(node, 'Identifier') === language);
  if (!selected) return map;

  for (const element of xml.all(selected, 'TranslationElement')) {
    const ref = xml.attr(element, 'RefId');
    if (!ref) continue;
    const attrs: EtsTranslationAttributes = {};
    for (const translation of xml.all(element, 'Translation')) {
      const key = xml.attr(translation, 'AttributeName');
      const value = xml.attr(translation, 'Text');
      if (key && value) attrs[key] = value;
    }
    if (Object.keys(attrs).length) map.set(ref, attrs);
  }
  return map;
}

export function translatedXmlNodeText(
  xml: EtsXmlNavigator,
  node: EtsXmlNodeHandle | null,
  translations: ReadonlyMap<string, EtsTranslationAttributes>
): string {
  if (!node) return '';
  const translated = translations.get(xml.attr(node, 'Id')) || {};
  return [
    translated.Text,
    translated.Name,
    xml.attr(node, 'Text'),
    xml.attr(node, 'Name'),
    xml.attr(node, 'FunctionText'),
  ].find((value) => String(value || '').trim()) || '';
}
