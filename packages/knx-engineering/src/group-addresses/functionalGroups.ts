import { classifyFunctionalGroup } from '../functions/classifyFunctionalGroup.ts';
import type { GaFunctionalGroup, GaPlanningFunction, GaPlanningInstance } from './types.ts';

export const DEFAULT_GA_FUNCTIONAL_GROUPS: GaFunctionalGroup[] = [
  { id: 'lighting', name: 'Beleuchtung', middleGroup: 0 },
  { id: 'shading', name: 'Jalousie / Sonnenschutz', middleGroup: 1 },
  { id: 'hvac', name: 'Heizung / Klima', middleGroup: 2 },
  { id: 'sensors', name: 'Präsenz / Sensorik', middleGroup: 3 },
  { id: 'operation', name: 'Bedienung / Szenen', middleGroup: 4 },
  { id: 'messages', name: 'Meldungen / Zustände', middleGroup: 5 },
  { id: 'central', name: 'Zentral / Zeit / Logik', middleGroup: 6 },
  { id: 'other', name: 'Sonstiges / Reserve', middleGroup: 7 },
];

export function functionalGroups(configured?: GaFunctionalGroup[]): GaFunctionalGroup[] {
  if (!configured?.length) return DEFAULT_GA_FUNCTIONAL_GROUPS.map((group) => ({ ...group }));
  const byId = new Map(configured.map((group) => [group.id, group]));
  return DEFAULT_GA_FUNCTIONAL_GROUPS.map((fallback) => ({ ...fallback, ...(byId.get(fallback.id) || {}) }));
}

export function functionalGroupId(instance: GaPlanningInstance, func: GaPlanningFunction): string {
  return classifyFunctionalGroup({
    type: instance.type,
    configSnapshot: {
      label: instance.label,
      description: instance.description,
      functions: instance.functions.map((item) => ({
        name: item.name,
        etsObjectName: item.source?.objectName,
        etsObjectFunctionText: item.source?.objectFunctionText,
      })),
    },
  }, {
    name: func.name,
    etsObjectName: func.source?.objectName,
    etsObjectFunctionText: func.source?.objectFunctionText,
    etsObjectDescription: func.source?.objectDescription,
    etsChannelName: func.source?.channelName,
    gaFunctionalGroupId: func.functionalGroupId,
  });
}
