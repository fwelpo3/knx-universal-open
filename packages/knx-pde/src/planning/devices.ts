import { dptCandidates, dptObjectSize, normalizeDptId } from '../../../knx-core/src/index.ts';
import { ensureExistingPdeGa } from './groupAddresses.ts';
import type { PdeDeviceSnapshot, PdeGaInputRow, PdeKoTargetRef, PdeSourceSnapshot, PlannedDevice, PlannedGa, PlannedRange } from '../model/types.ts';

export function planPdeDevices(rows: PdeGaInputRow[], source: PdeSourceSnapshot, gas: Map<string, PlannedGa>, ranges: Map<string, PlannedRange>): PlannedDevice[] {
  const targetMap = collectTargetAddresses(rows);
  const out: PlannedDevice[] = [];
  for (const [deviceId, objectMap] of targetMap) {
    const device = source.devices[deviceId];
    if (!device) continue;
    const objects: PlannedDevice['objects'] = [];
    for (const [targetKey, generatedAddresses] of objectMap) {
      const target = targetFromKey(targetKey);
      const object = findObject(device, target);
      if (!object) continue;
      for (const address of generatedAddresses) {
        const ga = gas.get(address);
        if (!ga) continue;
        repairMissingObjectDpt(ga, object.dpt, object.objectSize);
        assertCompatibleDpt(ga.dpt, object.dpt, address, device.physicalAddress, object.number);
        assertCompatibleSize(ga.size, object.objectSize, address, device.physicalAddress, object.number);
        if (!ga.dpt) ga.dpt = object.dpt;
        if (!ga.size) ga.size = object.objectSize;
      }
      const existingAddresses = object.existingLinks.map((link) => link.address).filter(Boolean);
      object.existingLinks.forEach((link) => ensureExistingPdeGa(link.address, source, gas, ranges, link));
      const ordered = [...new Set([...existingAddresses, ...generatedAddresses])].map((address) => gas.get(address)).filter((ga): ga is PlannedGa => Boolean(ga));
      const connectors = ordered.map((ga, index) => ({ kind: index === 0 ? 'Send' as const : 'Receive' as const, gaPuid: ga.puid }));
      if (connectors.length) objects.push({ object, connectors });
    }
    if (objects.length) out.push({ device, objects });
  }
  return out;
}

function collectTargetAddresses(rows: PdeGaInputRow[]) {
  const out = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    if (row.level !== 'ga' || row.middleGroup === undefined || row.sub === undefined) continue;
    const address = `${row.mainGroup}/${row.middleGroup}/${row.sub}`;
    for (const target of row.targets || []) {
      if (!out.has(target.deviceId)) out.set(target.deviceId, new Map());
      const key = targetKey(target);
      const list = out.get(target.deviceId)!.get(key) || [];
      if (!list.includes(address)) list.push(address);
      out.get(target.deviceId)!.set(key, list);
    }
  }
  return out;
}

function targetKey(target: PdeKoTargetRef): string { return `${target.objectRef || ''}||${target.objectNumber || ''}`; }
function targetFromKey(key: string): { ref: string; number: string } { const [ref, number] = key.split('||'); return { ref, number }; }

function findObject(device: PdeDeviceSnapshot, target: { ref: string; number: string }) {
  if (target.ref) {
    const exact = device.objects[target.ref];
    if (!exact) throw new Error(`ETS-KO nicht gefunden: ${target.ref}. Export abgebrochen, statt nach Nummer zu raten.`);
    return exact;
  }
  const matches = Object.values(device.objects).filter((object) => String(object.number) === target.number);
  if (matches.length > 1) throw new Error(`KO ${target.number} ist im Gerät mehrdeutig. Bitte exakt zuordnen.`);
  return matches[0];
}

function repairMissingObjectDpt(ga: PlannedGa, objectDpt: string, objectSize: string): void {
  if (objectDpt || !ga.dpt || !objectSize) return;
  const inferred = dptObjectSize(ga.dpt);
  if (!inferred || sameSize(inferred, objectSize)) return;
  ga.dpt = '';
  ga.size = objectSize;
}

function assertCompatibleSize(gaSize: string, objectSize: string, address: string, pa: string, objectNumber: string): void {
  if (!gaSize || !objectSize || sameSize(gaSize, objectSize)) return;
  throw new Error(`Längen-Konflikt bei ${address}: GA ${gaSize} passt nicht zu ${pa} KO ${objectNumber} (${objectSize}).`);
}
function sameSize(a: string, b: string): boolean { return normalizeSize(a) === normalizeSize(b); }
function normalizeSize(value: string): string { return String(value || '').toLowerCase().replace(/\s+/g, '').replace(/bytes?$/, 'byte').replace(/bits?$/, 'bit'); }

function assertCompatibleDpt(gaDpt: string, objectDpt: string, address: string, pa: string, objectNumber: string): void {
  const ga = normalizeDptId(gaDpt);
  const candidates = dptCandidates(objectDpt);
  if (!ga || !candidates.length || dptMatches(ga, candidates)) return;
  throw new Error(`DPT-Konflikt bei ${address}: GA ${ga} passt nicht zu ${pa} KO ${objectNumber} (${candidates.join(' / ')}).`);
}
function dptMatches(ga: string, candidates: string[]): boolean {
  if (candidates.includes(ga)) return true;
  const gaMain = ga.match(/^(?:DPST-|DPT-)(\d+)/)?.[1];
  if (!gaMain) return false;
  return candidates.some((candidate) => candidate === `DPT-${Number(gaMain)}` || (ga.startsWith('DPT-') && candidate.startsWith(`DPST-${Number(gaMain)}-`)));
}
