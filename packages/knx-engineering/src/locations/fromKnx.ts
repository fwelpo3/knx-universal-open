import type { KnxLocation, KnxProjectModel } from '../../../knx-model/src/index.ts';
import type { EngineeringLocation, EngineeringLocationKind } from '../model/types.ts';

/** Project canonical KNX locations into the source-independent engineering location graph. */
export function engineeringLocationsFromKnxProject(project: KnxProjectModel): EngineeringLocation[] {
  return project.locations.map(engineeringLocationFromKnx);
}

export function engineeringLocationFromKnx(location: KnxLocation): EngineeringLocation {
  return {
    id: location.id,
    name: location.name,
    kind: engineeringLocationKind(location),
    parentId: location.parentId,
  };
}

function engineeringLocationKind(location: KnxLocation): EngineeringLocationKind {
  switch (location.kind) {
    case 'site': return 'site';
    case 'building': return 'building';
    case 'building-part': return 'area';
    case 'floor': return 'floor';
    case 'room': return 'room';
    case 'corridor': return 'zone';
    case 'stairway': return 'zone';
    case 'distribution-board': return 'zone';
    case 'zone': return 'zone';
    default: return 'unknown';
  }
}
