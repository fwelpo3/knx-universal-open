import type { EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';
import type { EtsApplicationChannelMeta } from '../parser/channelResolution.ts';
import { resolveProjectChannelLabel, resolveProjectChannelLabelRaw } from '../parser/channelResolution.ts';
import type { EtsObjectGroupPathItem } from '../parser/applicationGroups.ts';
import { projectParameterValuesFromXml } from './parameters.ts';

export interface EtsProjectObjectGroupPaths {
  map: Map<string, EtsObjectGroupPathItem[]>;
  root: Set<string>;
  hasTree: boolean;
}

export function projectObjectGroupPathsFromXml(
  xml: EtsXmlNavigator,
  deviceNode: EtsXmlNodeHandle,
  channelMeta: ReadonlyMap<string, EtsApplicationChannelMeta>
): EtsProjectObjectGroupPaths {
  const map = new Map<string, EtsObjectGroupPathItem[]>();
  const root = new Set<string>();
  const tree = xml.children(deviceNode, 'GroupObjectTree')[0];
  if (!tree) return { map, root, hasTree: false };

  addRefs(root, xml.attr(tree, 'GroupObjectInstances'));
  const parameterValues = projectParameterValuesFromXml(xml, deviceNode);
  let counter = 0;

  const walkNode = (node: EtsXmlNodeHandle, path: EtsObjectGroupPathItem[]) => {
    const refId = xml.attr(node, 'RefId');
    const type = xml.attr(node, 'Type') || 'Channel';
    const label = resolveProjectChannelLabel(refId, channelMeta, parameterValues);
    const rawLabel = resolveProjectChannelLabelRaw(refId, channelMeta, parameterValues);
    const next: EtsObjectGroupPathItem[] = [...path, {
      id: refId || label,
      label,
      rawLabel,
      type,
      source: 'ets',
      order: ++counter,
    }];
    for (const ref of splitRefs(xml.attr(node, 'GroupObjectInstances'))) map.set(ref, next);
    for (const nodes of xml.children(node, 'Nodes')) {
      for (const child of xml.children(nodes, 'Node')) walkNode(child, next);
    }
    for (const child of xml.children(node, 'Node')) walkNode(child, next);
  };

  for (const nodes of xml.children(tree, 'Nodes')) {
    for (const node of xml.children(nodes, 'Node')) walkNode(node, []);
  }
  for (const node of xml.children(tree, 'Node')) walkNode(node, []);
  return { map, root, hasTree: true };
}

function splitRefs(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function addRefs(target: Set<string>, value: string): void {
  for (const ref of splitRefs(value)) target.add(ref);
}
