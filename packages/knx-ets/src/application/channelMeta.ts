import type { EtsXmlDocumentHandle, EtsXmlNavigator } from '../ports/xml.ts';
import { channelKeys, type EtsApplicationChannelMeta } from '../parser/channelResolution.ts';
import { cleanEtsObjectText } from '../parser/text.ts';
import type { EtsTranslationAttributes } from '../parser/translations.ts';

export function parseApplicationChannelMeta(
  xml: EtsXmlNavigator,
  document: EtsXmlDocumentHandle,
  translations: ReadonlyMap<string, EtsTranslationAttributes>
): Map<string, EtsApplicationChannelMeta> {
  const out = new Map<string, EtsApplicationChannelMeta>();
  for (const tag of ['Channel', 'ChannelIndependentBlock']) {
    for (const channel of xml.all(document, tag)) {
      const id = xml.attr(channel, 'Id');
      if (!id) continue;
      const translated = translations.get(id) || {};
      const rawLabel = translated.Text || translated.Name || xml.attr(channel, 'Text') || xml.attr(channel, 'Name');
      const meta: EtsApplicationChannelMeta = {
        label: cleanEtsObjectText(rawLabel),
        rawLabel: String(rawLabel || ''),
        textParameterRefId: xml.attr(channel, 'TextParameterRefId'),
      };
      for (const key of channelKeys(id)) out.set(key, meta);
    }
  }
  return out;
}
