import type { EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';
import type { EtsApplicationObjectDefinition } from './types.ts';

export function applicationTail(id: string, applicationId: string): string {
  const prefix = `${applicationId}_`;
  return id?.startsWith(prefix) ? id.slice(prefix.length) : String(id || '');
}

export function instanceObjectTail(ref: string): string {
  return String(ref || '').replace(/(MD-\d+)_M-\d+_MI-\d+(?=_O-)/, '$1');
}

export function readApplicationObjectAttributes(
  xml: EtsXmlNavigator,
  node: EtsXmlNodeHandle | null | undefined
): EtsApplicationObjectDefinition {
  if (!node) return {};
  const links = xml.attr(node, 'Links').split(/\s+/).filter(Boolean);
  return {
    id: optional(xml, node, 'Id'),
    refId: optional(xml, node, 'RefId'),
    number: optional(xml, node, 'Number'),
    name: optional(xml, node, 'Name'),
    text: optional(xml, node, 'Text'),
    functionText: optional(xml, node, 'FunctionText'),
    description: optional(xml, node, 'Description'),
    datapointType: optional(xml, node, 'DatapointType'),
    objectSize: optional(xml, node, 'ObjectSize'),
    priority: optional(xml, node, 'Priority'),
    textParameterRefId: optional(xml, node, 'TextParameterRefId'),
    links: links.length ? links : undefined,
    flags: {
      communication: optional(xml, node, 'CommunicationFlag'),
      read: optional(xml, node, 'ReadFlag'),
      write: optional(xml, node, 'WriteFlag'),
      transmit: optional(xml, node, 'TransmitFlag'),
      update: optional(xml, node, 'UpdateFlag'),
      readOnInit: optional(xml, node, 'ReadOnInitFlag'),
    },
  };
}

export function mergeApplicationObject(
  base: EtsApplicationObjectDefinition,
  override: EtsApplicationObjectDefinition
): EtsApplicationObjectDefinition {
  const merged: EtsApplicationObjectDefinition = {
    ...base,
    ...definedEntries(override),
    flags: {
      ...(base.flags || {}),
      ...definedEntries(override.flags || {}),
    },
  };
  if (!Object.values(merged.flags || {}).some(Boolean)) delete merged.flags;
  return merged;
}

function optional(xml: EtsXmlNavigator, node: EtsXmlNodeHandle, name: string): string | undefined {
  return xml.attr(node, name) || undefined;
}

function definedEntries<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as Partial<T>;
}
