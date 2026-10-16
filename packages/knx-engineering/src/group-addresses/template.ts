import { normalizeFunctionDisplayName } from '../naming/functionName.ts';
import type { GaPlanningFunction, GaTemplateContext } from './types.ts';

export function cleanDeviceDescription(raw: string): string {
  if (!raw) return '';
  const cleaned = raw
    .replace(/\b[A-Z0-9]{2,6}-[A-Z0-9.\-_]{3,}\b/gi, '')
    .replace(/\b(MDT|Gira|Jung|Busch-Jaeger|ABB|Siemens|Theben|Hager|Schneider|Eltako)\b/gi, '')
    .replace(/\b(mit Temperatursensor|mit Sensor|mit Regler|Smart|Touch|Plus)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || raw;
}

function flagOn(value?: string): boolean {
  return /enabled|true|1/i.test(value || '');
}

function activeFlags(func?: GaPlanningFunction): string {
  if (!func?.source) return '';
  const source = func.source;
  const flags = [
    ['C', source.communicationFlag], ['R', source.readFlag], ['W', source.writeFlag],
    ['T', source.transmitFlag], ['U', source.updateFlag], ['I', source.readOnInitFlag],
  ];
  return flags.filter(([, value]) => flagOn(value)).map(([flag]) => flag).join(' ');
}

export function renderGaTemplate(template: string, data: GaTemplateContext): string {
  const { area, room, roomIndex, instance, instanceIndex, functionName, function: fn, middleGroupName, middleGroupNumber } = data;
  const source = instance.source || {};
  const functionSource = fn?.source || {};
  const safeFunctionName = fn ? normalizeFunctionDisplayName(functionName, {
    objectName: functionSource.objectName,
    description: functionSource.objectDescription,
    functionText: functionSource.objectFunctionText,
    channel: functionSource.channelName,
  }) : functionName;
  const rawDesc = instance.description || '';
  const cleanDesc = cleanDeviceDescription(rawDesc);
  const deviceName = cleanDeviceDescription(source.deviceName || '');
  const deviceDescriptor = source.imported && deviceName ? deviceName : cleanDesc;
  const pa = source.physicalAddress || '';
  const paParts = pa.split('.');
  const derivedLineAddress = paParts.slice(0, 2).join('.');
  const deviceAddress = source.deviceAddress || paParts[2] || '';
  const lineAddress = source.lineAddress || derivedLineAddress;
  const lineName = source.lineName || '';
  const lineLabel = source.lineLabel || lineName || (lineAddress ? `Linie ${lineAddress}` : '');
  const areaAddress = source.areaAddress || paParts[0] || '';
  const areaName = source.areaName || '';
  const areaLabel = source.areaLabel || areaName || (areaAddress ? `Bereich ${areaAddress}` : '');
  const mainLineAddress = source.mainLineAddress || (areaAddress ? `${areaAddress}.0` : '');
  const mainLineName = source.mainLineName || '';
  const mainLineLabel = source.mainLineLabel || mainLineName || (mainLineAddress ? `Hauptlinie ${mainLineAddress}` : '');
  const topologyPath = source.topologyPath || [areaLabel, mainLineLabel, lineLabel].filter(Boolean).join(' / ');

  const values: Record<string, (padding?: number) => string> = {
    'area.name': () => area.name || '', 'area.abbr': () => area.abbreviation || '',
    'area.abbreviation': () => area.abbreviation || '', 'area.mainGroup': () => String(area.mainGroup ?? ''),
    'area.maingroup': () => String(area.mainGroup ?? ''),
    'middleGroup.name': () => middleGroupName || '',
    'middleGroup.number': () => middleGroupNumber === undefined ? '' : String(middleGroupNumber),
    'room.name': () => room.name || '', 'room.number': () => room.number || '', 'room.num': () => room.number || '',
    'room.index': (p = 1) => String(roomIndex + 1).padStart(p, '0'),
    'device.label': () => instance.label || '', 'device.name': () => deviceName || cleanDesc,
    'device.name.raw': () => source.deviceName || instance.description || '',
    'device.product': () => cleanDeviceDescription(source.productName || ''),
    'device.product.raw': () => source.productName || '', 'device.article': () => source.article || '',
    'device.manufacturer': () => source.manufacturer || '', 'device.pa': () => pa,
    'device.physicalAddress': () => pa, 'device.deviceAddress': () => deviceAddress,
    'device.areaName': () => areaName, 'device.areaAddress': () => areaAddress,
    'device.areaLabel': () => areaLabel, 'device.areaId': () => source.areaId || '',
    'device.mainLineName': () => mainLineName, 'device.mainLineAddress': () => mainLineAddress,
    'device.mainLineLabel': () => mainLineLabel, 'device.mainLineId': () => source.mainLineId || '',
    'device.lineName': () => lineName, 'device.lineAddress': () => lineAddress, 'device.lineLabel': () => lineLabel,
    'device.lineId': () => source.lineId || '', 'device.topologyPath': () => topologyPath,
    'device.paLabel': () => pa ? `PA ${pa}` : '', 'device.channel': () => source.channel || '',
    'device.etsId': () => source.deviceId || '', 'device.importMode': () => source.importMode || '',
    'device.objectNames': () => source.objectNames || '', 'device.objectNumbers': () => source.objectNumbers || '',
    'device.desc': () => deviceDescriptor, 'device.description': () => deviceDescriptor,
    'device.type': () => instance.type || '', 'device.middleGroup': () => String(instance.middleGroup ?? ''),
    'device.feedbackMiddleGroup': () => instance.feedbackMiddleGroup === undefined ? '' : String(instance.feedbackMiddleGroup),
    'instance.index': (p = 1) => String(instanceIndex + 1).padStart(p, '0'),
    'instance.name': () => instance.sceneName || cleanDesc || '', 'scene.name': () => instance.sceneName || '',
    'function.name': () => safeFunctionName || '', 'function.koName': () => functionSource.objectName || '',
    'function.koFunction': () => functionSource.objectFunctionText || '',
    'function.koDescription': () => functionSource.objectDescription || '',
    'function.koNumber': () => functionSource.objectNumber || '',
    'function.koNumberLabel': () => functionSource.objectNumber ? `KO ${functionSource.objectNumber}` : '',
    'function.koRef': () => functionSource.objectRef || '',
    'function.group': () => instance.description || instance.label || '',
    'function.role': () => fn?.role === 'feedback' ? 'Rückmeldung' : fn?.role === 'command' ? 'Steuerung' : 'Unbekannt',
    'function.offset': () => String(fn?.offset ?? ''),
    'function.channel': () => functionSource.channelName || source.channel || '',
    'function.dpt': () => fn?.datapointType || '', 'function.dptLabel': () => functionSource.datapointTypeLabel || '',
    'function.size': () => functionSource.objectSize || '', 'function.priority': () => functionSource.priority || '',
    'function.communicationFlag': () => functionSource.communicationFlag || '',
    'function.readFlag': () => functionSource.readFlag || '', 'function.writeFlag': () => functionSource.writeFlag || '',
    'function.transmitFlag': () => functionSource.transmitFlag || '', 'function.updateFlag': () => functionSource.updateFlag || '',
    'function.readOnInitFlag': () => functionSource.readOnInitFlag || '', 'function.flags': () => activeFlags(fn),
    'function.links': () => (functionSource.links || []).join(', '),
    'function.linkedGaAddresses': () => (functionSource.linkedGroupAddresses || []).map((link) => link.address).join(', '),
    'function.linkedGaNames': () => (functionSource.linkedGroupAddresses || []).map((link) => link.name).filter(Boolean).join(', '),
    'function.linkCount': () => String((functionSource.linkedGroupAddresses || []).length || (functionSource.links || []).length || 0),
    'function.pdeTargetCount': () => String((fn?.targets || []).length),
  };
  return template.replace(/\{([\w.]+)(?::(\d+))?\}/g, (match, key, pad) =>
    values[key] ? values[key](pad ? Number(pad) : undefined) : match,
  );
}

export function sanitizeGaName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName.trim();
  if (cleaned.length <= 255) return cleaned;
  cleaned = cleaned
    .replace(/\bRückmeldung\b/g, 'RM').replace(/\bStatusmeldung\b/g, 'RM')
    .replace(/\bTemperatursensor\b/g, 'Temp.Sens').replace(/\bTemperatur\b/g, 'Temp.')
    .replace(/\bBetriebsart\b/g, 'Modus').replace(/\bUmschaltung\b/g, 'Umsch.')
    .replace(/\bPosition\b/g, 'Pos.').replace(/\bGlastaster\b/g, 'GT')
    .replace(/\bPräsenzmelder\b/g, 'PM').replace(/\bBewegungsmelder\b/g, 'BM')
    .replace(/\bSchaltaktor\b/g, 'SA').replace(/\bJalousieaktor\b/g, 'JA')
    .replace(/\bDimmaktor\b/g, 'DA').replace(/\bHeizungsaktor\b/g, 'HA')
    .replace(/\bSollwert\b/g, 'Sollw.').replace(/\bIst-Temperatur\b/g, 'Ist-Temp.')
    .replace(/\bAktuellen Wert empfangen\b/g, 'Wert empf.').replace(/\bAktueller Wert\b/g, 'Wert')
    .trim();
  if (cleaned.length <= 255) return cleaned;
  cleaned = cleaned.replace(/\b[A-Z0-9]{2,6}-[A-Z0-9.\-_]{3,}\b/gi, '').trim();
  if (cleaned.length <= 255) return cleaned;
  cleaned = cleaned.replace(/\s*-\s*-\s*/g, ' - ').trim();
  if (cleaned.length <= 255) return cleaned;
  return cleaned.slice(0, 255).trim().replace(/[\s\-.,:_]+$/, '');
}

export function generateGaName(template: string, data: GaTemplateContext): string {
  return sanitizeGaName(renderGaTemplate(template, data));
}

export function generateGaDescription(template: string, data: GaTemplateContext): string {
  return renderGaTemplate(template, data)
    .split('|')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' | ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 65535);
}
