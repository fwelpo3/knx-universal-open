import type { EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';
import { projectParameterKeys } from '../parser/moduleResolution.ts';
import { cleanEtsObjectText } from '../parser/text.ts';

export function projectParameterValuesFromXml(
  xml: EtsXmlNavigator,
  deviceNode: EtsXmlNodeHandle
): Map<string, string> {
  const out = new Map<string, string>();
  for (const parameter of xml.all(deviceNode, 'ParameterInstanceRef')) {
    const refId = xml.attr(parameter, 'RefId');
    if (!refId) continue;
    const value = cleanEtsObjectText(xml.attr(parameter, 'Value'));
    if (!value) continue;
    for (const key of projectParameterKeys(refId)) out.set(key, value);
  }
  return out;
}
