import { normalizeDptId } from '../../../knx-core/src/index.ts';
import type { PdePlan, PdeSourceSnapshot, PlannedDevice, PlannedGa, PlannedObject, PlannedRange } from '../model/types.ts';

export function serializePdeXml(plan: PdePlan, source: PdeSourceSnapshot): string {
  const out: string[] = [`<?xml version="1.0" encoding="utf-8"?>`];
  out.push(`<Project xmlns="http://www.it-gmbh.de/dds2ets/0/1" ToolVersion="5.1.13.0" CreatedBy="ProjectDataExchange">`);
  out.push(`  <ProjectInformation GroupAddressStyle="${x(source.groupAddressStyle)}" />`);
  out.push(`  <Installation>`);
  out.push(`    <Topology>`);
  for (const area of plan.areas) {
    out.push(`      <Area Id="$PUID-A-${area.area.puid}" Address="${x(area.area.address)}">`);
    for (const line of area.lines) {
      out.push(`        <Line Id="$PUID-L-${line.line.puid}" Address="${x(line.line.address)}">`);
      line.devices.forEach((device) => writeDevice(out, device));
      out.push(`        </Line>`);
    }
    out.push(`      </Area>`);
  }
  out.push(`    </Topology>`);
  out.push(`    <Buildings />`);
  out.push(`    <Trades />`);
  out.push(`    <GroupAddresses>`);
  plan.groupAddresses.forEach((ga) => out.push(`      ${gaXml(ga)}`));
  out.push(`    </GroupAddresses>`);
  writeRanges(out, plan.ranges);
  out.push(`  </Installation>`);
  out.push(`  <TemplateDevices />`);
  out.push(`  <ProductDataList />`);
  out.push(`</Project>`);
  return out.join('\n');
}

function writeDevice(out: string[], planned: PlannedDevice): void {
  const d = planned.device;
  const attrs = [['Id', `$PUID-DI-${d.puid}`], ['Address', d.localAddress], ['Hardware2ProgramRefId', d.hardware2ProgramRefId]].filter(([, value]) => value !== '');
  out.push(`          <DeviceInstance${attrsXml(attrs)}>`);
  const rootObjects = planned.objects.filter((item) => !moduleInstanceId(item.object.ref));
  if (rootObjects.length) writeObjectList(out, rootObjects, '            ');
  writeModuleObjects(out, planned.objects);
  out.push(`            <TemplateDevice RefId="$PUID-DI-${d.puid}" />`);
  out.push(`          </DeviceInstance>`);
}

function writeModuleObjects(out: string[], objects: PlannedObject[]): void {
  const groups = new Map<string, PlannedObject[]>();
  for (const object of objects) {
    const id = moduleInstanceId(object.object.ref);
    if (!id) continue;
    const list = groups.get(id) || [];
    list.push(object);
    groups.set(id, list);
  }
  if (!groups.size) return;
  out.push(`            <ModuleInstances>`);
  for (const [id, list] of groups) {
    out.push(`              <ModuleInstance ModuleInstanceId="${x(id)}">`);
    writeObjectList(out, list, '                ');
    out.push(`              </ModuleInstance>`);
  }
  out.push(`            </ModuleInstances>`);
}

function moduleInstanceId(ref: string): string {
  const raw = String(ref || '');
  const objectIndex = raw.lastIndexOf('_O-');
  if (objectIndex <= 0) return '';
  const prefix = raw.slice(0, objectIndex);
  return prefix.startsWith('MD-') ? prefix : '';
}

function writeObjectList(out: string[], objects: PlannedObject[], indent: string): void {
  out.push(`${indent}<ComObjectInstances>`);
  objects.forEach((object) => writeObject(out, object, `${indent}  `));
  out.push(`${indent}</ComObjectInstances>`);
}

function writeObject(out: string[], planned: PlannedObject, indent: string): void {
  const o = planned.object;
  const attrs = [['ComObjectRefId', o.ref], ['Number', o.number]].filter(([, value]) => value !== '');
  out.push(`${indent}<ComObjectInstance${attrsXml(attrs)}>`);
  out.push(`${indent}  <Connectors>`);
  planned.connectors.forEach((c) => out.push(`${indent}    <${c.kind} GroupAddressRefId="$PUID-GA-${c.gaPuid}" />`));
  out.push(`${indent}  </Connectors>`);
  out.push(`${indent}</ComObjectInstance>`);
}

function gaXml(ga: PlannedGa): string {
  const attrs: [string, string][] = [['Id', `$PUID-GA-${ga.puid}`], ['Address', String(ga.rawAddress)]];
  if (ga.dpt) attrs.push(['DatapointType', normalizeDptId(ga.dpt)]);
  if (ga.size) attrs.push(['Size', ga.size]);
  attrs.push(['Name', ga.name]);
  if (ga.description) attrs.push(['Description', ga.description]);
  attrs.push(['Unfiltered', 'false'], ['Central', 'false'], ['Global', 'false']);
  return `<GroupAddress${attrsXml(attrs)} />`;
}

function writeRanges(out: string[], ranges: PlannedRange[]): void {
  const mains = ranges.filter((r) => r.middle === undefined);
  out.push(`    <GroupRanges>`);
  for (const main of mains) {
    out.push(`      <GroupRange${rangeAttrs(main)}>`);
    ranges.filter((r) => r.main === main.main && r.middle !== undefined).forEach((middle) => out.push(`        <GroupRange${rangeAttrs(middle)} />`));
    out.push(`      </GroupRange>`);
  }
  out.push(`    </GroupRanges>`);
}

function rangeAttrs(range: PlannedRange): string {
  const address = range.middle === undefined ? range.main : range.middle;
  return attrsXml([['Id', `$PUID-GR-${range.puid}`], ['Name', range.name], ['Address', String(address)], ['RangeStart', String(range.rangeStart)], ['RangeEnd', String(range.rangeEnd)], ['Unfiltered', 'false']]);
}

function attrsXml(items: string[][]): string { return items.map(([key, value]) => ` ${key}="${x(String(value ?? ''))}"`).join(''); }
function x(value: string): string { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
