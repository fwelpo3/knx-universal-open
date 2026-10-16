import type { GaPlanningFunction, GaPlanningInstance, GaTargetRef } from './types.ts';

export function targetsForFunction(instance: GaPlanningInstance, func: GaPlanningFunction): GaTargetRef[] {
  const explicit = Array.isArray(func.targets) ? func.targets : [];
  const source = instance.source;
  const functionSource = func.source;
  const inferred: GaTargetRef | null = source?.imported && source.deviceId && (functionSource?.objectRef || functionSource?.objectNumber)
    ? {
        deviceId: source.deviceId,
        physicalAddress: source.physicalAddress,
        objectRef: functionSource.objectRef,
        objectNumber: functionSource.objectNumber,
      }
    : null;
  const seen = new Set<string>();
  return [...explicit, ...(inferred ? [inferred] : [])].filter((item) => {
    if (!item.deviceId || (!item.objectRef && !item.objectNumber)) return false;
    const key = `${item.deviceId}|${item.objectRef || ''}|${item.objectNumber || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
