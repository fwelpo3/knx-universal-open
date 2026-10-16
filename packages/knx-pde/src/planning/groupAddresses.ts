import { dptObjectSize, groupAddressToRaw, mainGroupRange, middleGroupRange, parseGroupAddress } from '../../../knx-core/src/index.ts';
import type { PdeExistingLink, PdeGaInputRow, PdeSourceSnapshot, PlannedGa, PlannedRange } from '../model/types.ts';

export function planPdeGroupAddresses(rows: PdeGaInputRow[], source: PdeSourceSnapshot) {
  let nextPuid = source.lastUsedPuid + 1;
  const gas = new Map<string, PlannedGa>();
  const ranges = new Map<string, PlannedRange>();
  const mainNames = new Map(rows.filter((r) => r.level === 'main').map((r) => [r.mainGroup, r.name]));
  const middleNames = new Map(rows.filter((r) => r.level === 'middle' && r.middleGroup !== undefined).map((r) => [`${r.mainGroup}/${r.middleGroup}`, r.name]));

  const ensureRange = (main: number, middle?: number) => {
    const key = middle === undefined ? `${main}` : `${main}/${middle}`;
    if (ranges.has(key)) return;
    const existing = source.groupRanges[key];
    const bounds = middle === undefined ? mainGroupRange(main) : middleGroupRange(main, middle);
    ranges.set(key, {
      key, main, middle,
      puid: existing?.puid || nextPuid++,
      name: middle === undefined ? (mainNames.get(main) || existing?.name || `Hauptgruppe ${main}`) : (middleNames.get(key) || existing?.name || `Mittelgruppe ${middle}`),
      rangeStart: bounds.start,
      rangeEnd: bounds.end,
    });
  };

  for (const row of rows) {
    if (row.level !== 'ga' || row.middleGroup === undefined || row.sub === undefined) continue;
    const address = `${row.mainGroup}/${row.middleGroup}/${row.sub}`;
    const existing = source.groupAddresses[address];
    ensureRange(row.mainGroup);
    ensureRange(row.mainGroup, row.middleGroup);
    gas.set(address, {
      address,
      rawAddress: groupAddressToRaw(address),
      puid: existing?.puid || nextPuid++,
      name: row.name,
      description: row.description || '',
      dpt: row.datapointType || '',
      size: dptObjectSize(row.datapointType || ''),
      generated: true,
    });
  }
  return { gas, ranges, nextPuid };
}

export function ensureExistingPdeGa(address: string, source: PdeSourceSnapshot, gas: Map<string, PlannedGa>, ranges: Map<string, PlannedRange>, detail?: PdeExistingLink): PlannedGa | null {
  if (gas.has(address)) return gas.get(address)!;
  const existing = source.groupAddresses[address];
  if (!existing?.puid) return null;
  const parsed = parseGroupAddress(address);
  ensureExistingRange(`${parsed.main}`, parsed.main, undefined, source, ranges);
  ensureExistingRange(`${parsed.main}/${parsed.middle}`, parsed.main, parsed.middle, source, ranges);
  const dpt = detail?.dpt || existing.dpt;
  const item: PlannedGa = {
    address, rawAddress: groupAddressToRaw(address), puid: existing.puid,
    name: detail?.name || existing.name || `GA ${address}`,
    description: detail?.description || existing.description || '',
    dpt, size: dptObjectSize(dpt), generated: false,
  };
  gas.set(address, item);
  return item;
}

function ensureExistingRange(key: string, main: number, middle: number | undefined, source: PdeSourceSnapshot, ranges: Map<string, PlannedRange>): void {
  if (ranges.has(key)) return;
  const existing = source.groupRanges[key];
  if (!existing?.puid) return;
  ranges.set(key, { key, main, middle, puid: existing.puid, name: existing.name, rangeStart: existing.rangeStart, rangeEnd: existing.rangeEnd });
}
