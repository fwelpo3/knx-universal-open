import type { EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';
import { activeObjectRefs } from '../xml/navigation.ts';
import { definitionKeyForInstanceRef, resolveModuleNumber, resolveModuleText } from '../parser/moduleResolution.ts';
import type { EtsSourceCommunicationObject, EtsSourceGroupAddress } from '../source/types.ts';
import type { EtsApplicationObjectDefinition, EtsApplicationProgramIndex } from '../application/types.ts';
import { applicationTail, instanceObjectTail, readApplicationObjectAttributes } from '../application/objectAttributes.ts';
import { projectParameterValuesFromXml } from './parameters.ts';
import { projectObjectGroupPathsFromXml } from './objectGroupPaths.ts';

export function resolveDeviceCommunicationObjects(input: {
  xml: EtsXmlNavigator;
  deviceNode: EtsXmlNodeHandle;
  application?: EtsApplicationProgramIndex | null;
  dptLabels?: ReadonlyMap<string, string>;
  groupAddresses?: ReadonlyMap<string, EtsSourceGroupAddress>;
}): EtsSourceCommunicationObject[] {
  const { xml, deviceNode } = input;
  const application = input.application || null;
  const explicit = xml.all(deviceNode, 'ComObjectInstanceRef');
  const explicitByRef = new Map<string, EtsXmlNodeHandle>();
  for (const node of explicit) {
    const ref = xml.attr(node, 'RefId');
    if (ref) {
      explicitByRef.set(ref, node);
      explicitByRef.set(shortObjectKey(ref), node);
    }
  }

  const parameterValues = projectParameterValuesFromXml(xml, deviceNode);
  const projectGroups = projectObjectGroupPathsFromXml(xml, deviceNode, application?.channelMeta || new Map());

  return activeObjectRefs(xml, deviceNode).map((raw) => {
    const shortKey = shortObjectKey(raw);
    const instance = explicitByRef.get(raw) || explicitByRef.get(shortKey);
    const instanceAttrs = readApplicationObjectAttributes(xml, instance);
    const key = instanceObjectTail(raw);
    const definitionKey = definitionKeyForInstanceRef(key);
    const base = lookupApplicationObject(application, [
      key,
      definitionKey,
      applicationTail(definitionKey, application?.applicationId || ''),
      shortKey,
      raw,
    ]);
    const dpt = instanceAttrs.datapointType || base.datapointType || '';
    const links = instanceAttrs.links || base.links || [];
    let etsGroupPath = base.etsGroupPath;

    if (projectGroups.hasTree) {
      if (projectGroups.map.has(raw)) etsGroupPath = projectGroups.map.get(raw);
      else if (projectGroups.map.has(shortKey)) etsGroupPath = projectGroups.map.get(shortKey);
      else if (projectGroups.root.has(raw) || projectGroups.root.has(shortKey)) etsGroupPath = [];
    }

    const channel = [...(etsGroupPath || [])]
      .reverse()
      .find((item) => item.type === 'Channel' || item.type === 'ChannelIndependentBlock');

    return {
      id: raw,
      number: instanceAttrs.number || resolveModuleNumber(raw, base.number || '', application?.moduleInstances || new Map()),
      name: resolveModuleText(raw, instanceAttrs.name || base.name || '', '', application?.moduleInstances || new Map(), parameterValues) || undefined,
      text: resolveModuleText(
        raw,
        instanceAttrs.text || base.text || '',
        instanceAttrs.textParameterRefId || base.textParameterRefId || '',
        application?.moduleInstances || new Map(),
        parameterValues
      ) || undefined,
      functionText: resolveModuleText(raw, instanceAttrs.functionText || base.functionText || '', '', application?.moduleInstances || new Map(), parameterValues) || undefined,
      description: instanceAttrs.description || base.description || undefined,
      datapointType: dpt || undefined,
      datapointTypeLabel: dpt ? input.dptLabels?.get(dpt) : undefined,
      objectSize: instanceAttrs.objectSize || base.objectSize || undefined,
      priority: instanceAttrs.priority || base.priority || undefined,
      flags: mergeFlags(base.flags, instanceAttrs.flags),
      groupAddressRefs: [...links],
      linkedGroupAddresses: links
        .map((id) => input.groupAddresses?.get(id))
        .filter((item): item is EtsSourceGroupAddress => Boolean(item))
        .map((item) => ({ address: item.address, name: item.name })),
      etsGroupPath: etsGroupPath?.map((item) => ({ label: item.label, rawLabel: item.rawLabel, order: item.order })),
      channelId: lastChannel(etsGroupPath)?.id,
      channelName: lastChannel(etsGroupPath)?.label,
    };
  });
}

function lookupApplicationObject(
  application: EtsApplicationProgramIndex | null,
  keys: readonly string[]
) {
  if (!application) return {};
  for (const key of keys) {
    const value = application.objects.get(key);
    if (value) return value;
  }
  return {};
}

function shortObjectKey(ref: string): string {
  return String(ref || '').replace(/^.*?_([OR]-.*)$/, '$1');
}

function mergeFlags(
  base: EtsApplicationObjectDefinition['flags'],
  override: EtsApplicationObjectDefinition['flags']
): EtsSourceCommunicationObject['flags'] | undefined {
  const merged = { ...(base || {}) };
  for (const [key, value] of Object.entries(override || {})) {
    if (value !== undefined && value !== '') (merged as Record<string, string | undefined>)[key] = value;
  }
  return Object.values(merged).some(Boolean) ? merged : undefined;
}

function lastChannel(path: EtsApplicationObjectDefinition['etsGroupPath']) {
  if (!path?.length) return undefined;
  return [...path].reverse().find(
    (item) => item.type === 'Channel' || item.type === 'ChannelIndependentBlock'
  );
}
