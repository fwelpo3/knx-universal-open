import type { EtsXmlDocumentHandle, EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';
import { applicationObjectGroupsFromXml } from '../parser/applicationGroups.ts';
import { translationMapFromXml, type EtsTranslationAttributes } from '../parser/translations.ts';
import { parseApplicationChannelMeta } from './channelMeta.ts';
import { parseModuleInstanceMeta } from './moduleInstances.ts';
import {
  applicationTail,
  mergeApplicationObject,
  readApplicationObjectAttributes,
} from './objectAttributes.ts';
import type { EtsApplicationObjectDefinition, EtsApplicationProgramIndex } from './types.ts';

export function parseApplicationProgramIndex(
  xml: EtsXmlNavigator,
  document: EtsXmlDocumentHandle,
  applicationId: string,
  language = 'de-DE'
): EtsApplicationProgramIndex {
  const translations = translationMapFromXml(xml, document, language);
  const groups = applicationObjectGroupsFromXml(xml, document, translations);
  const channelMeta = parseApplicationChannelMeta(xml, document, translations);
  const moduleInstances = parseModuleInstanceMeta(xml, document);
  const base = new Map<string, EtsApplicationObjectDefinition>();
  const objects = new Map<string, EtsApplicationObjectDefinition>();

  for (const node of xml.all(document, 'ComObject')) {
    const attrs = translatedObject(xml, node, readApplicationObjectAttributes(xml, node), translations, applicationId);
    const id = xml.attr(node, 'Id');
    register(base, id, applicationId, attrs);
    register(objects, id, applicationId, attrs);
  }

  for (const node of xml.all(document, 'ComObjectRef')) {
    const id = xml.attr(node, 'Id');
    const refId = xml.attr(node, 'RefId');
    const inherited = base.get(refId) || base.get(applicationTail(refId, applicationId)) || {};
    const merged = mergeApplicationObject(inherited, readApplicationObjectAttributes(xml, node));
    const attrs = translatedObject(xml, node, merged, translations, applicationId);
    const key = applicationTail(id, applicationId);
    const path = groups.get(key) || groups.get(id) || groups.get(key.replace(/^.*?_O-/, 'O-'));
    if (path?.length) attrs.etsGroupPath = path;
    register(objects, id, applicationId, attrs);
  }

  return { applicationId, objects, channelMeta, moduleInstances };
}

function translatedObject(
  xml: EtsXmlNavigator,
  node: EtsXmlNodeHandle,
  attrs: EtsApplicationObjectDefinition,
  translations: ReadonlyMap<string, EtsTranslationAttributes>,
  applicationId: string
): EtsApplicationObjectDefinition {
  const id = xml.attr(node, 'Id');
  const refId = xml.attr(node, 'RefId');
  const translated =
    translations.get(id) ||
    translations.get(refId) ||
    translations.get(applicationTail(id, applicationId)) ||
    translations.get(applicationTail(refId, applicationId)) ||
    {};

  return {
    ...attrs,
    name: translated.Name || attrs.name,
    text: translated.Text || attrs.text,
    functionText: translated.FunctionText || attrs.functionText,
    description: translated.Description || attrs.description,
  };
}

function register(
  map: Map<string, EtsApplicationObjectDefinition>,
  id: string,
  applicationId: string,
  value: EtsApplicationObjectDefinition
): void {
  if (!id) return;
  map.set(id, value);
  map.set(applicationTail(id, applicationId), value);
}
