import { normalizeDptId } from '../../knx-core/src/index.ts';
import { buildPdePlan } from './planning/plan.ts';
import { serializePdeXml } from './xml/serialize.ts';
import type { PdeExportResult, PdeGaInputRow, PdeSourceSnapshot } from './model/types.ts';

export function exportProjectDataExchange(rows: PdeGaInputRow[], source: PdeSourceSnapshot): PdeExportResult {
  const plan = buildPdePlan(rows, source);
  const devices = plan.areas.flatMap((area) => area.lines).flatMap((line) => line.devices);
  const objectCount = devices.reduce((sum, device) => sum + device.objects.length, 0);
  const connectorCount = devices.flatMap((device) => device.objects).reduce((sum, object) => sum + object.connectors.length, 0);
  if (!plan.groupAddresses.length) throw new Error('Keine Gruppenadressen für den PDE-Export vorhanden.');
  if (!objectCount) throw new Error('Keine ETS-Kommunikationsobjekte mit den erzeugten Gruppenadressen verknüpft.');
  return {
    xml: serializePdeXml(plan, source),
    groupAddressCount: plan.groupAddresses.length,
    deviceCount: devices.length,
    objectCount,
    connectorCount,
    existingAddressConflictCount: countExistingAddressConflicts(rows, source),
  };
}

function countExistingAddressConflicts(rows: PdeGaInputRow[], source: PdeSourceSnapshot): number {
  return rows.filter((row) => {
    if (row.level !== 'ga' || row.middleGroup === undefined || row.sub === undefined) return false;
    const address = `${row.mainGroup}/${row.middleGroup}/${row.sub}`;
    const existing = source.groupAddresses[address];
    if (!existing) return false;
    const nameChanged = Boolean(existing.name && existing.name !== row.name);
    const oldDpt = normalizeDptId(existing.dpt);
    const newDpt = normalizeDptId(row.datapointType || '');
    return nameChanged || Boolean(oldDpt && newDpt && oldDpt !== newDpt);
  }).length;
}

export function mergePdeSourceSnapshots(existing: PdeSourceSnapshot | undefined, next: PdeSourceSnapshot): PdeSourceSnapshot {
  if (!existing || existing.projectId !== next.projectId) return next;
  return { ...next, lastUsedPuid: Math.max(existing.lastUsedPuid, next.lastUsedPuid), devices: { ...existing.devices, ...next.devices } };
}
