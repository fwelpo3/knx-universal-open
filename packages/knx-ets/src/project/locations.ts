import type { EtsXmlNodeHandle, EtsXmlRuntime } from '../ports/xml.ts';
import type { EtsSourceLocation } from '../source/types.ts';

/** Parse the ETS building/space hierarchy without DOM-specific types. */
export function parseLocations(xml: EtsXmlRuntime, document: object): EtsSourceLocation[] {
  const out: EtsSourceLocation[] = [];
  for (const node of xml.all(document, 'Space')) {
    const id = xml.attr(node, 'Id');
    if (!id) continue;
    const name = xml.attr(node, 'Name') || id;
    const parent = nearestParentSpace(xml, node);
    const path = locationPath(xml, node);
    const deviceIds = xml.children(node, 'DeviceInstanceRef')
      .map((ref) => xml.attr(ref, 'RefId'))
      .filter(Boolean)
      .sort();
    out.push({
      id,
      name,
      type: xml.attr(node, 'Type') || undefined,
      parentId: parent ? xml.attr(parent, 'Id') || undefined : undefined,
      path,
      deviceIds,
    });
  }
  return out.sort((a, b) => a.path.join(' / ').localeCompare(b.path.join(' / '), 'de') || a.id.localeCompare(b.id));
}

function nearestParentSpace(xml: EtsXmlRuntime, node: EtsXmlNodeHandle): EtsXmlNodeHandle | null {
  for (let parent = xml.parent(node); parent; parent = xml.parent(parent)) {
    if (xml.localName(parent) === 'Space') return parent;
  }
  return null;
}

function locationPath(xml: EtsXmlRuntime, node: EtsXmlNodeHandle): string[] {
  const path: string[] = [];
  let current: EtsXmlNodeHandle | null = node;
  while (current) {
    if (xml.localName(current) === 'Space') {
      const name = xml.attr(current, 'Name');
      if (name) path.unshift(name);
    }
    current = xml.parent(current);
  }
  return path;
}
