import type { KnxCommunicationObject, KnxDevice } from '../../../knx-model/src/index.ts';
import { communicationRole, dptFamily, normalizeSemanticText, semanticTokens } from './normalize.ts';
import { buildDeviceStructuralSignature } from './signature.ts';
import type { ChannelSignature, DevicePatternResult, PatternEvidence } from './types.ts';
import type { EngineeringPatternRegistry } from './registry.ts';

interface FamilyMatch {
  id: string;
  evidence: PatternEvidence[];
}

function deviceText(device: KnxDevice): string {
  return normalizeSemanticText([device.manufacturer, device.name, device.productName, device.orderNumber].filter(Boolean).join(' '));
}

function detectDeviceFamily(device: KnxDevice): FamilyMatch | null {
  const text = deviceText(device);
  const rules: Array<[RegExp, string]> = [
    [/\b(schaltaktor|switch actuator|switching actuator|switch actuator)\b/, 'switching-actuator'],
    [/\b(dimmaktor|dimming actuator|dimmer actuator)\b/, 'dimming-actuator'],
    [/\b(jalousieaktor|rollladenaktor|raffstoreaktor|blind actuator|shutter actuator)\b/, 'shading-actuator'],
    [/\b(heizungsaktor|heating actuator|valve actuator)\b/, 'heating-actuator'],
    [/\b(prasenzmelder|bewegungsmelder|presence detector|motion detector)\b/, 'presence-sensor'],
    [/\b(binareingang|binary input|tasterinterface|push button interface)\b/, 'binary-input'],
  ];
  for (const [pattern, id] of rules) {
    if (pattern.test(text)) {
      return {
        id,
        evidence: [
          { kind: 'product', value: device.productName || device.name, detail: `Device family ${id} recognized from normalized product/device text.` },
          ...(device.manufacturer ? [{ kind: 'manufacturer' as const, value: device.manufacturer }] : []),
        ],
      };
    }
  }
  return null;
}

function objectsForChannel(device: KnxDevice, channel: ChannelSignature): KnxCommunicationObject[] {
  const ids = new Set(channel.objectIds);
  return device.communicationObjects.filter((object) => ids.has(object.id));
}

function objectText(object: KnxCommunicationObject): string {
  return normalizeSemanticText([object.name, object.text, object.functionText, object.description].filter(Boolean).join(' '));
}

function count(objects: KnxCommunicationObject[], predicate: (object: KnxCommunicationObject) => boolean): number {
  return objects.reduce((total, object) => total + (predicate(object) ? 1 : 0), 0);
}

function hasDpt(objects: KnxCommunicationObject[], family: string, role?: ReturnType<typeof communicationRole>): boolean {
  return objects.some((object) => dptFamily(object.datapointType) === family && (!role || communicationRole(object) === role || communicationRole(object) === 'bidirectional'));
}

function hasText(objects: KnxCommunicationObject[], pattern: RegExp): boolean {
  return objects.some((object) => pattern.test(objectText(object)));
}

function channelEndpoints(device: KnxDevice, channel: ChannelSignature) {
  return channel.objectIds.map((communicationObjectId) => ({ deviceId: device.id, communicationObjectId }));
}

function channelMatch(
  device: KnxDevice,
  channel: ChannelSignature,
  functionId: string,
  patternId: string,
  matchClass: DevicePatternResult['matchClass'],
  evidence: PatternEvidence[],
): DevicePatternResult {
  return {
    patternId,
    functionId,
    matchClass,
    channelId: channel.id,
    channelName: channel.name,
    endpointRefs: channelEndpoints(device, channel),
    evidence,
  };
}

function genericChannelMatches(device: KnxDevice, channel: ChannelSignature, family: FamilyMatch | null): DevicePatternResult[] {
  const objects = objectsForChannel(device, channel);
  const out: DevicePatternResult[] = [];
  if (!objects.length) return out;

  const dpt1Consumers = count(objects, (object) => dptFamily(object.datapointType) === 'DPT-1' && ['consumer', 'bidirectional'].includes(communicationRole(object)));
  const dpt1Producers = count(objects, (object) => dptFamily(object.datapointType) === 'DPT-1' && ['producer', 'bidirectional'].includes(communicationRole(object)));
  const dpt3Consumers = count(objects, (object) => dptFamily(object.datapointType) === 'DPT-3' && ['consumer', 'bidirectional'].includes(communicationRole(object)));
  const dpt5Objects = count(objects, (object) => dptFamily(object.datapointType) === 'DPT-5');

  const shared = (extra: PatternEvidence[]): PatternEvidence[] => [
    { kind: 'channel', value: channel.name || channel.id, detail: `${objects.length} communication objects in channel.` },
    ...extra,
  ];

  const switchName = hasText(objects, /\b(schalt|switch|ein aus|on off)\b/);
  const feedbackName = hasText(objects, /\b(status|ruckmeld|feedback|actual|istwert)\b/);
  if (
    family?.id === 'switching-actuator' && dpt1Consumers >= 1
    || (dpt1Consumers >= 1 && dpt1Producers >= 1 && (switchName || feedbackName))
  ) {
    out.push(channelMatch(device, channel, 'switching.output', 'generic.switching-output.v1', family?.id === 'switching-actuator' ? 'family-pattern' : 'structural-pattern', shared([
      ...(family?.evidence || []),
      { kind: 'object-sequence', detail: `DPT-1 consumers=${dpt1Consumers}, producers=${dpt1Producers}` },
    ])));
  }

  if (
    family?.id === 'dimming-actuator' && (dpt3Consumers >= 1 || dpt5Objects >= 1)
    || (dpt3Consumers >= 1 && dpt5Objects >= 1)
  ) {
    out.push(channelMatch(device, channel, 'lighting.dimming-output', 'generic.dimming-output.v1', family?.id === 'dimming-actuator' ? 'family-pattern' : 'structural-pattern', shared([
      ...(family?.evidence || []),
      { kind: 'object-sequence', detail: `DPT-3 consumers=${dpt3Consumers}, DPT-5 objects=${dpt5Objects}` },
    ])));
  }

  const shadingName = hasText(objects, /\b(jalous|rollladen|raffstore|blind|shutter|auf ab|up down|lamell|slat|position)\b/);
  if (
    family?.id === 'shading-actuator' && dpt1Consumers >= 1
    || (dpt1Consumers >= 2 && (dpt5Objects >= 1 || shadingName))
  ) {
    out.push(channelMatch(device, channel, 'shading.output', 'generic.shading-output.v1', family?.id === 'shading-actuator' ? 'family-pattern' : 'structural-pattern', shared([
      ...(family?.evidence || []),
      { kind: 'object-sequence', detail: `DPT-1 consumers=${dpt1Consumers}, DPT-5 objects=${dpt5Objects}` },
    ])));
  }

  if (hasDpt(objects, 'DPT-9', 'producer') && hasText(objects, /\b(temperatur|temperature|temp|istwert|actual)\b/)) {
    out.push(channelMatch(device, channel, 'sensor.temperature', 'generic.temperature-sensor.v1', 'semantic-pattern', shared([
      { kind: 'dpt', value: 'DPT-9' },
      { kind: 'name', detail: 'Temperature semantics present.' },
    ])));
  }

  if (hasDpt(objects, 'DPT-1', 'producer') && hasText(objects, /\b(prasenz|presence|bewegung|motion|occupancy)\b/)) {
    out.push(channelMatch(device, channel, 'sensor.occupancy', 'generic.occupancy-sensor.v1', family?.id === 'presence-sensor' ? 'family-pattern' : 'semantic-pattern', shared([
      ...(family?.id === 'presence-sensor' ? family.evidence : []),
      { kind: 'dpt', value: 'DPT-1' },
      { kind: 'name', detail: 'Presence/motion semantics present.' },
    ])));
  }

  if (objects.some((object) => ['DPT-17', 'DPT-18'].includes(dptFamily(object.datapointType) || ''))) {
    out.push(channelMatch(device, channel, 'scene.control', 'generic.scene-control.v1', 'semantic-pattern', shared([
      { kind: 'dpt', detail: 'DPT-17/DPT-18 scene object present.' },
    ])));
  }

  return out;
}

function propagateRepeatedStructure(device: KnxDevice, matches: DevicePatternResult[]): DevicePatternResult[] {
  const signature = buildDeviceStructuralSignature(device);
  const out = [...matches];
  for (const repeated of signature.repeatedChannelPatterns) {
    const known = matches.filter((match) => match.channelId && repeated.channelIds.includes(match.channelId));
    const byFunction = new Map<string, DevicePatternResult[]>();
    for (const match of known) {
      const list = byFunction.get(match.functionId) || [];
      list.push(match);
      byFunction.set(match.functionId, list);
    }
    for (const [functionId, functionMatches] of byFunction) {
      const knownChannels = new Set(functionMatches.map((match) => match.channelId));
      for (const channelId of repeated.channelIds) {
        if (knownChannels.has(channelId)) continue;
        const channel = signature.channels.find((item) => item.id === channelId);
        if (!channel) continue;
        out.push(channelMatch(device, channel, functionId, 'repeated-channel.propagation.v1', 'structural-pattern', [
          { kind: 'repeated-structure', detail: `Same normalized channel structure occurs ${repeated.occurrences} times.` },
          { kind: 'object-sequence', value: repeated.structuralKey },
        ]));
      }
    }
  }
  return out;
}

function deduplicate(matches: DevicePatternResult[]): DevicePatternResult[] {
  const precedence: Record<DevicePatternResult['matchClass'], number> = {
    'exact-signature': 5,
    'family-pattern': 4,
    'structural-pattern': 3,
    'semantic-pattern': 2,
    candidate: 1,
  };
  const map = new Map<string, DevicePatternResult>();
  for (const match of matches) {
    const key = `${match.functionId}::${match.channelId || '*'}`;
    const current = map.get(key);
    if (!current || precedence[match.matchClass] > precedence[current.matchClass]) {
      map.set(key, { ...match, evidence: [...match.evidence] });
    } else if (current) {
      const seen = new Set(current.evidence.map((item) => JSON.stringify(item)));
      for (const evidence of match.evidence) if (!seen.has(JSON.stringify(evidence))) current.evidence.push(evidence);
    }
  }
  return [...map.values()].sort((a, b) => (a.channelId || '').localeCompare(b.channelId || '') || a.functionId.localeCompare(b.functionId));
}

/**
 * Deterministic layered device recognition:
 * 1) exact registered fingerprint
 * 2) manufacturer/product family pattern
 * 3) structural channel pattern
 * 4) semantic pattern
 * 5) repeated-structure propagation
 */
export function recognizeDevicePatterns(device: KnxDevice, registry?: EngineeringPatternRegistry): DevicePatternResult[] {
  const exact = registry?.matchExact(device) || [];
  if (exact.length) return deduplicate(exact);

  const registeredFamily = registry?.matchApplicationFamily(device) || [];
  if (registeredFamily.length) return deduplicate(propagateRepeatedStructure(device, registeredFamily));

  const signature = buildDeviceStructuralSignature(device);
  const family = detectDeviceFamily(device);
  const local = signature.channels.flatMap((channel) => genericChannelMatches(device, channel, family));
  return deduplicate(propagateRepeatedStructure(device, local));
}

export function deviceSemanticTokens(device: KnxDevice): string[] {
  return semanticTokens(device.manufacturer, device.name, device.productName, device.orderNumber);
}
