import type { EtsXmlNodeHandle, EtsXmlRuntime } from '../ports/xml.ts';
import type { EtsSourcePlacement } from '../source/types.ts';

export function parsePlacements(xml: EtsXmlRuntime, document: object): Map<string, EtsSourcePlacement> {
  const placements = new Map<string, EtsSourcePlacement>();

  for (const ref of xml.all(document, 'DeviceInstanceRef')) {
    const deviceId = xml.attr(ref, 'RefId');
    if (!deviceId) continue;

    const path: string[] = [];
    let currentSpace: EtsXmlNodeHandle | null = null;
    for (let parent = xml.parent(ref); parent; parent = xml.parent(parent)) {
      if (xml.localName(parent) !== 'Space') continue;
      if (!currentSpace) currentSpace = parent;
      const name = xml.attr(parent, 'Name');
      if (name) path.unshift(name);
    }
    if (!currentSpace) continue;

    // Legacy-compatible behavior: omit the outer building container.
    if (path.length > 1) path.shift();
    placements.set(deviceId, {
      id: xml.attr(currentSpace, 'Id') || deviceId,
      name: path.join(' / '),
      type: xml.attr(currentSpace, 'Type') || undefined,
      path,
    });
  }

  return placements;
}
