import { assessConsolidationGroup } from './score.ts';
import type { ConsolidationDecision, ConsolidationMember, RoomConsolidationCandidate, RoomConsolidationSummary } from './types.ts';
import {
  consolidationHash,
  consolidationStatusOrder,
  distinctConsolidationDevices,
  groupConsolidationBy,
  normalizeConsolidationDpt,
  normalizeConsolidationText,
  objectDirection,
} from './utils.ts';
import { targetsForFunction } from '../group-addresses/targets.ts';
import type { GaPlanningFunction, GaPlanningInstance, GaPlanningRoom, GaTargetRef } from '../group-addresses/types.ts';

export function analyzePlanningRoomConsolidation(room: GaPlanningRoom): RoomConsolidationSummary {
  const members = collectMembers(room.instances);
  const groups = groupConsolidationBy(members, (member) => `${normalizeConsolidationText(member.functionName)}|${member.role}`);
  const candidates: RoomConsolidationCandidate[] = [];
  for (const rawGroup of groups.values()) {
    const name = normalizeConsolidationText(rawGroup[0]?.functionName || '');
    if (!name || distinctConsolidationDevices(rawGroup) < 2) continue;
    const byDpt = groupConsolidationBy(rawGroup, (member) => normalizeConsolidationDpt(member.dpt));
    if (byDpt.size > 1) {
      candidates.push(makeCandidate(room, rawGroup, {
        status: 'separate', score: 0,
        reason: 'Gleicher Funktionsname, aber unterschiedliche DPTs.',
        evidence: [{ kind: 'blocker', label: 'DPT-Konflikt' }],
      }));
      continue;
    }
    candidates.push(makeCandidate(room, rawGroup, assessConsolidationGroup(rawGroup, name)));
  }
  candidates.sort((a, b) => consolidationStatusOrder(a.status) - consolidationStatusOrder(b.status) || b.score - a.score || a.label.localeCompare(b.label, 'de'));
  return {
    candidates,
    confirmed: candidates.filter((item) => item.status === 'confirmed').length,
    review: candidates.filter((item) => item.status === 'review').length,
    separate: candidates.filter((item) => item.status === 'separate').length,
  };
}

export interface AppliedConsolidation {
  instances: GaPlanningInstance[];
  mergedFunctions: number;
  appliedCandidateIds: string[];
}

export function applyPlanningRoomConsolidation(
  input: GaPlanningInstance[],
  candidates: RoomConsolidationCandidate[],
  decisions: Record<string, ConsolidationDecision>,
): AppliedConsolidation {
  const instances = input.map(cloneInstance);
  const refs = indexFunctions(instances);
  let mergedFunctions = 0;
  const appliedCandidateIds: string[] = [];
  for (const candidate of candidates) {
    if (candidate.status === 'separate' || decisions[candidate.id] !== 'merge') continue;
    const matches = candidate.members.map((member) => refs.get(member.key)).filter(Boolean) as IndexedFunction[];
    if (matches.length < 2) continue;
    const owner = matches[0];
    owner.fn.targets = mergeTargets(targetsForFunction(owner.instance, owner.fn), matches.slice(1).flatMap((item) => targetsForFunction(item.instance, item.fn)));
    for (const item of matches.slice(1)) {
      item.fn.enabled = false;
      mergedFunctions += 1;
    }
    appliedCandidateIds.push(candidate.id);
  }
  return { instances: instances.filter(hasEnabledFunction), mergedFunctions, appliedCandidateIds };
}

export function consolidationMemberKey(deviceId: string, ref: string, number: string, name: string, dpt: string): string {
  return [deviceId, ref || number, normalizeConsolidationText(name), normalizeConsolidationDpt(dpt)].join('|');
}

function collectMembers(instances: GaPlanningInstance[]): ConsolidationMember[] {
  const out: ConsolidationMember[] = [];
  for (const instance of instances) {
    if (!instance.source?.imported) continue;
    for (const fn of instance.functions) {
      if (fn.enabled === false) continue;
      out.push(toMember(instance, fn));
    }
  }
  return out;
}

function toMember(instance: GaPlanningInstance, fn: GaPlanningFunction): ConsolidationMember {
  const source = instance.source || {};
  const fs = fn.source || {};
  const deviceId = source.deviceId || '';
  const objectRef = fs.objectRef || '';
  const objectNumber = fs.objectNumber || '';
  return {
    key: consolidationMemberKey(deviceId, objectRef, objectNumber, fn.name, fn.datapointType),
    deviceId,
    deviceName: source.deviceName || '',
    physicalAddress: source.physicalAddress || '',
    manufacturer: source.manufacturer || '',
    articleNumber: source.article || '',
    productName: source.productName || '',
    variantId: source.variantId || '',
    functionName: fn.name,
    dpt: fn.datapointType,
    objectNumber,
    objectRef,
    objectName: fs.objectName || '',
    objectFunction: fs.objectFunctionText || '',
    objectSize: fs.objectSize || '',
    channelId: fs.channelId || '',
    channelName: fs.channelName || '',
    linkedGas: (fs.linkedGroupAddresses || []).map((ga) => ga.address).filter(Boolean),
    role: fn.role || 'unknown',
    direction: objectDirection(fs.transmitFlag || '', fs.writeFlag || '', fs.updateFlag || ''),
  };
}

type Assessment = ReturnType<typeof assessConsolidationGroup>;
function makeCandidate(room: GaPlanningRoom, members: ConsolidationMember[], assessment: Assessment): RoomConsolidationCandidate {
  const sorted = [...members].sort((a, b) => a.key.localeCompare(b.key));
  return {
    id: `${room.id}:${consolidationHash(sorted.map((member) => member.key).join('||'))}`,
    roomId: room.id,
    roomName: room.name,
    label: sorted[0]?.functionName || 'Funktion',
    dpt: sorted[0]?.dpt || '',
    ...assessment,
    members: sorted,
  };
}

type IndexedFunction = { instance: GaPlanningInstance; fn: GaPlanningFunction };
function indexFunctions(instances: GaPlanningInstance[]): Map<string, IndexedFunction> {
  const map = new Map<string, IndexedFunction>();
  for (const instance of instances) for (const fn of instance.functions) {
    const fs = fn.source || {};
    map.set(consolidationMemberKey(instance.source?.deviceId || '', fs.objectRef || '', fs.objectNumber || '', fn.name, fn.datapointType), { instance, fn });
  }
  return map;
}

function cloneInstance(instance: GaPlanningInstance): GaPlanningInstance {
  return { ...instance, source: instance.source ? { ...instance.source } : undefined, functions: instance.functions.map((fn) => ({ ...fn, source: fn.source ? { ...fn.source, links: fn.source.links ? [...fn.source.links] : undefined, linkedGroupAddresses: fn.source.linkedGroupAddresses ? fn.source.linkedGroupAddresses.map((x) => ({ ...x })) : undefined } : undefined, targets: fn.targets ? fn.targets.map((x) => ({ ...x })) : undefined })) };
}
function hasEnabledFunction(instance: GaPlanningInstance): boolean { return instance.functions.some((fn) => fn.enabled !== false); }
function mergeTargets(a: GaTargetRef[], b: GaTargetRef[]): GaTargetRef[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((item) => {
    const key = `${item.deviceId}|${item.objectRef || ''}|${item.objectNumber || ''}`;
    if (!item.deviceId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
