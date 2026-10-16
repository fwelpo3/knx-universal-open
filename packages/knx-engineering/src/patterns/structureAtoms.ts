import type { KnxCommunicationObject } from '../../../knx-model/src/index.ts';
import { communicationRole, dptFamily, semanticTokens } from './normalize.ts';
import type { ObjectSemanticSignature } from './types.ts';

function objectNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : undefined;
}

export function communicationObjectSignature(object: KnxCommunicationObject): ObjectSemanticSignature {
  return {
    objectId: object.id,
    objectNumber: objectNumber(object.number),
    dptFamily: dptFamily(object.datapointType),
    dpt: object.datapointType,
    role: communicationRole(object),
    tokens: semanticTokens(object.name, object.text, object.functionText, object.description),
    channelId: object.channel?.id,
    channelName: object.channel?.name,
  };
}

function tokenClass(tokens: string[]): string {
  const groups: Array<[RegExp, string]> = [
    [/^(schalt|switch|on|off|ein|aus)/, 'switch'],
    [/^(status|ruckmeld|feedback|actual|ist)/, 'feedback'],
    [/^(dimm|heller|dunkler|bright)/, 'dimming'],
    [/^(jalous|raff|roll|blind|shade|auf|ab|up|down|fahr)/, 'shading'],
    [/^(lamell|slat)/, 'slat'],
    [/^(position|hohe|height|percent)/, 'position'],
    [/^(temperatur|temperature|temp|sollwert|setpoint)/, 'temperature'],
    [/^(prasenz|presence|beweg|motion|occup)/, 'occupancy'],
    [/^(helligkeit|brightness|lux)/, 'brightness'],
    [/^(szene|scene)/, 'scene'],
    [/^(sperr|lock|freigabe|enable)/, 'lock'],
  ];
  const classes = new Set<string>();
  for (const token of tokens) {
    for (const [pattern, label] of groups) if (pattern.test(token)) classes.add(label);
  }
  return [...classes].sort().join('+') || '-';
}

/** Stable structural key, intentionally independent of channel labels and absolute object numbers. */
export function channelStructuralKey(objects: ObjectSemanticSignature[]): string {
  return [...objects]
    .sort((a, b) => (a.objectNumber ?? Number.MAX_SAFE_INTEGER) - (b.objectNumber ?? Number.MAX_SAFE_INTEGER) || a.objectId.localeCompare(b.objectId))
    .map((object) => `${object.dptFamily || '-'}:${object.role}:${tokenClass(object.tokens)}`)
    .join('|');
}
