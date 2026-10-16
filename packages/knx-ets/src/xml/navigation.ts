import type { EtsXmlNavigator, EtsXmlNodeHandle } from '../ports/xml.ts';

export function xmlAncestor(
  xml: EtsXmlNavigator,
  node: EtsXmlNodeHandle,
  localName: string
): EtsXmlNodeHandle | null {
  for (let parent = xml.parent(node); parent; parent = xml.parent(parent)) {
    if (xml.localName(parent) === localName) return parent;
  }
  return null;
}

export function xmlPhysicalAddress(xml: EtsXmlNavigator, deviceNode: EtsXmlNodeHandle): string {
  const line = xmlAncestor(xml, deviceNode, 'Line');
  const area = xmlAncestor(xml, deviceNode, 'Area');
  return [xml.attr(area, 'Address'), xml.attr(line, 'Address'), xml.attr(deviceNode, 'Address')]
    .filter((value) => value !== '')
    .join('.');
}

export function xmlGroupAddress(rawValue: string): string {
  const value = Number(rawValue);
  return Number.isFinite(value)
    ? `${(value >> 11) & 31}/${(value >> 8) & 7}/${value & 255}`
    : rawValue;
}

export function activeObjectRefs(
  xml: EtsXmlNavigator,
  deviceNode: EtsXmlNodeHandle
): string[] {
  const treeRefs: string[] = [];
  for (const tree of xml.all(deviceNode, 'GroupObjectTree')) {
    const value = xml.attr(tree, 'GroupObjectInstances');
    if (value) treeRefs.push(...value.split(/\s+/).filter(Boolean));
  }
  for (const node of xml.all(deviceNode, 'Node')) {
    const value = xml.attr(node, 'GroupObjectInstances');
    if (value) treeRefs.push(...value.split(/\s+/).filter(Boolean));
  }

  // Dynamic ETS applications use GroupObjectTree as the authoritative list.
  // ComObjectInstanceRef can also contain inactive alternatives.
  if (treeRefs.length) return [...new Set(treeRefs)];

  const explicitRefs: string[] = [];
  for (const instance of xml.all(deviceNode, 'ComObjectInstanceRef')) {
    const ref = xml.attr(instance, 'RefId');
    if (ref) explicitRefs.push(ref);
  }
  return [...new Set(explicitRefs)];
}


export function projectMeta(
  xml: EtsXmlNavigator,
  document: object
): { id?: string; name?: string } {
  const project = xml.all(document, 'Project')[0];
  const info = project ? xml.all(project, 'ProjectInformation')[0] : undefined;
  return {
    id: project ? xml.attr(project, 'Id') || undefined : undefined,
    name: (info ? xml.attr(info, 'Name') : '') || (project ? xml.attr(project, 'Name') : '') || undefined,
  };
}
