import { normalizeConsolidationDpt, normalizeConsolidationText } from './utils.ts';
import { targetsForFunction } from '../group-addresses/targets.ts';
import type { GaPlanningFunction, GaPlanningInstance, GaTargetRef } from '../group-addresses/types.ts';

export interface DuplicateMergeRecord {
  signature: string;
  ownerInstanceId: string;
  mergedInstanceId: string;
}

export interface DuplicateMergeResult {
  instances: GaPlanningInstance[];
  mergedFunctions: number;
  merges: DuplicateMergeRecord[];
}

export function duplicateFunctionSignature(name: string, dpt: string, role: 'command' | 'feedback' | 'unknown'): string {
  const normalized = normalizeConsolidationText(name);
  if (!normalized) return '';
  return [normalized, normalizeConsolidationDpt(dpt), role].join('|');
}

export function mergeDuplicatePlanningFunctions(input: GaPlanningInstance[], skipKeys: Set<string> = new Set()): DuplicateMergeResult {
  const instances = input.map(cloneInstance);
  const seen = new Map<string, { deviceId: string; instance: GaPlanningInstance; fn: GaPlanningFunction }>();
  const merges: DuplicateMergeRecord[] = [];
  for (const instance of instances) {
    if (!instance.source?.imported || !instance.source.deviceId) continue;
    const deviceId = instance.source.deviceId;
    for (const fn of instance.functions) {
      if (fn.enabled === false) continue;
      const role = fn.role || 'unknown';
      const key = duplicateFunctionSignature(fn.name, fn.datapointType, role);
      if (!key || skipKeys.has(key)) continue;
      const owner = seen.get(key);
      if (!owner) {
        seen.set(key, { deviceId, instance, fn });
        fn.targets = targetsForFunction(instance, fn);
        continue;
      }
      if (owner.deviceId === deviceId) continue;
      owner.fn.targets = mergeTargets(owner.fn.targets || [], targetsForFunction(instance, fn));
      fn.enabled = false;
      merges.push({ signature: key, ownerInstanceId: owner.instance.id, mergedInstanceId: instance.id });
    }
  }
  return { instances: instances.filter((instance) => instance.functions.some((fn) => fn.enabled !== false)), mergedFunctions: merges.length, merges };
}

function cloneInstance(instance: GaPlanningInstance): GaPlanningInstance {
  return { ...instance, source: instance.source ? { ...instance.source } : undefined, functions: instance.functions.map((fn) => ({ ...fn, source: fn.source ? { ...fn.source } : undefined, targets: fn.targets ? fn.targets.map((item) => ({ ...item })) : undefined })) };
}
function mergeTargets(a: GaTargetRef[], b: GaTargetRef[]): GaTargetRef[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((item) => { const key = `${item.deviceId}|${item.objectRef || ''}|${item.objectNumber || ''}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
