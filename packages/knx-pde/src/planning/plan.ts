import { planPdeGroupAddresses } from './groupAddresses.ts';
import { planPdeDevices } from './devices.ts';
import type { PdeGaInputRow, PdePlan, PdeSourceSnapshot, PlannedDevice } from '../model/types.ts';

export function buildPdePlan(rows: PdeGaInputRow[], source: PdeSourceSnapshot): PdePlan {
  const { gas, ranges } = planPdeGroupAddresses(rows, source);
  const devices = planPdeDevices(rows, source, gas, ranges);
  return {
    areas: groupTopology(devices),
    groupAddresses: [...gas.values()].sort((a, b) => a.rawAddress - b.rawAddress),
    ranges: [...ranges.values()].sort((a, b) => a.rangeStart - b.rangeStart || a.rangeEnd - b.rangeEnd),
  };
}

function groupTopology(devices: PlannedDevice[]): PdePlan['areas'] {
  const areas = new Map<number, PdePlan['areas'][number]>();
  for (const planned of devices) {
    const areaNode = planned.device.area;
    const lineNode = planned.device.line;
    if (!areas.has(areaNode.puid)) areas.set(areaNode.puid, { area: areaNode, lines: [] });
    const area = areas.get(areaNode.puid)!;
    let line = area.lines.find((item) => item.line.puid === lineNode.puid);
    if (!line) { line = { line: lineNode, devices: [] }; area.lines.push(line); }
    line.devices.push(planned);
  }
  return [...areas.values()].sort((a, b) => Number(a.area.address) - Number(b.area.address)).map((area) => ({ ...area, lines: area.lines.sort((a, b) => Number(a.line.address) - Number(b.line.address)) }));
}
