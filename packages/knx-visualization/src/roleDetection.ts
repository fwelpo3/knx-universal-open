import { dptId, normalizeRecognitionText } from '../../knx-engineering/src/index.ts';
import { matchesKeyword, type RecognitionKeywordRole } from '../../knx-engineering/src/index.ts';
import type { VisualizationCardKind, VisualizationPoint, VisualizationRole } from './types.ts';

export interface DetectedVisualizationRole {
  kind: VisualizationCardKind;
  role: VisualizationRole;
  fallback?: boolean;
}

function text(point: VisualizationPoint): string {
  return normalizeRecognitionText([
    point.groupName, ...(point.groupAddressPath || []), point.objectName,
    point.functionText, point.channelLabel,
    ...(point.buildingFunctions || []).flatMap((fn) => [fn.name, fn.typeLabel, fn.role]),
  ].filter(Boolean).join(' '));
}

function isState(point: VisualizationPoint, value: string): boolean {
  if (point.direction === 'feedback') return true;
  if (point.direction === 'command') return false;
  if (point.flags?.transmit && point.flags?.read && !point.flags?.write) return true;
  return matchesKeyword('visualization-feedback', value, point.keywordConfig);
}

type Match = (role: RecognitionKeywordRole) => boolean;
/** A sending sensor KO can send commands too. Explicit GA roles take precedence
 * over its transmit flag; otherwise Position Lamelle becomes a false status. */
export function namedShadingPosition(name?: string): VisualizationRole | null {
  const value = normalizeRecognitionText(name);
  const match = value.match(/\bposition (hohe|hoehe|height|lamelle|lamellen)(?: (rm|status|ruckmeldung|rueckmeldung|feedback))?$/);
  if (!match) return null;
  const role = /lamell/.test(match[1]) ? 'slat' : 'position';
  return `${role}-${match[2] ? 'state' : 'command'}` as VisualizationRole;
}
function kindHint(dpt: string, has: Match): VisualizationCardKind | null {
  if (has('tunable-white') || ['7.600','249.600','250.600'].includes(dpt)) return 'tunable-white';
  if (has('rgb') || ['232.600','242.600','251.600','253.600','254.600'].includes(dpt)) return 'rgb';
  if (has('shading') || ['1.008','1.009','3.008','240.800','241.800'].includes(dpt)) return 'shading';
  if (has('thermostat') || ['20.102','6.010','1.100'].includes(dpt)
    || (dpt === '9.001' && (has('current-temperature') || has('target-temperature') || has('temperature-shift')))) return 'thermostat';
  if (has('scene') || dpt.startsWith('17.') || dpt.startsWith('18.')) return 'scene';
  if (dpt === '3.007' || (['5.001','5.004'].includes(dpt) && has('dimmer'))) return 'dimmer';
  if (['1.001','1.011'].includes(dpt) && has('switch-command')) return 'switch';
  if (dpt === '1.011' && has('visualization-feedback')) return 'switch';
  return null;
}

function thermostatRole(dpt: string, has: Match, state: boolean): VisualizationRole | null {
  if (dpt === '20.102') return state ? 'hvac-mode-state' : 'hvac-mode-command';
  if (dpt === '6.010' || (['9.001','9.002'].includes(dpt) && has('temperature-shift'))) return state ? 'setpoint-shift-state' : 'setpoint-shift-command';
  if (dpt === '9.001' && has('current-temperature')) return 'current-temperature';
  if (dpt === '9.001' && has('target-temperature')) return state ? 'target-temperature-state' : 'target-temperature-command';
  if (dpt === '5.001' && (has('heating-demand') || has('heating'))) return state ? 'heating-demand-state' : 'heating-demand-command';
  if (dpt === '1.100') return 'heat-cool-command';
  if (dpt === '1.018' && has('presence')) return 'presence-command';
  if (['1.001','1.011'].includes(dpt) && has('cooling') && has('visualization-feedback')) return 'cooling-state';
  if (['1.001','1.011'].includes(dpt) && has('heating') && has('visualization-feedback')) return 'heating-state';
  if (['1.001','1.011'].includes(dpt) && has('hvac-enable')) return state ? 'hvac-enable-state' : 'hvac-enable-command';
  if (['1.001','1.011'].includes(dpt) && has('heating')) return 'heating-state';
  return null;
}

function shadingRole(dpt: string, has: Match, state: boolean): VisualizationRole | null {
  if (dpt === '1.008') return 'move-command';
  if (['1.007','1.009','3.008'].includes(dpt)) return 'step-command';
  if (!['5.001','5.004'].includes(dpt)) return null;
  if (has('slat') && has('slat-position')) return state ? 'slat-state' : 'slat-command';
  if ((has('position') || has('brightness')) && !has('slat')) return state ? 'position-state' : 'position-command';
  return null;
}

function flagsFallback(point: VisualizationPoint, dpt: string, has: Match): DetectedVisualizationRole | null {
  // Generic boolean output only. DPT 5.001/9.001 cannot identify an application alone.
  const blockers: RecognitionKeywordRole[] = ['system','lock','scene','heating','cooling','hvac-enable',
    'window-contact','door-contact','sun-protection','safety-wind','safety-rain','safety-frost'];
  if (point.activeByProject === false || point.flags?.communication === false || blockers.some(has)) return null;
  if (dpt === '1.001' && point.flags?.write === true && point.flags.transmit === false) {
    return { kind: 'switch', role: 'switch-command', fallback: true };
  }
  if (['1.001','1.011'].includes(dpt) && point.flags?.transmit === true && point.flags.write === false) {
    return { kind: 'switch', role: 'switch-state', fallback: true };
  }
  return null;
}

export function detectVisualizationRole(point: VisualizationPoint): DetectedVisualizationRole | null {
  if (point.activeByProject === false || point.flags?.communication === false) return null;
  const value = text(point), dpt = dptId(point.dpt), state = isState(point, value);
  const has: Match = (role) => matchesKeyword(role, value, point.keywordConfig);
  // A shared percentage DPT must not resolve competing application hints by branch order.
  if (dpt === '5.001' && [has('shading'), has('dimming-domain'), has('heating-demand') || has('heating')]
    .filter(Boolean).length > 1) return null;
  const kind = kindHint(dpt, has);
  if (!kind) return flagsFallback(point, dpt, has);
  if (kind === 'thermostat' || kind === 'shading') {
    if (kind === 'shading' && ['5.001', '5.004'].includes(dpt)) {
      const named = namedShadingPosition(point.groupName);
      if (named) return { kind, role: named };
    }
    const role = kind === 'thermostat' ? thermostatRole(dpt, has, state) : shadingRole(dpt, has, state);
    return role ? { kind, role } : null;
  }
  if (kind === 'scene') return ['17.001','18.001'].includes(dpt) ? { kind, role: 'scene-command' } : null;
  if (kind === 'rgb') {
    if (['1.001','1.011'].includes(dpt) && has('switch-command')) return { kind, role: state || dpt === '1.011' ? 'switch-state' : 'switch-command' };
    if (has('scene') && ['17.001','18.001'].includes(dpt)) return { kind, role: 'scene-command' };
    if (has('hue') && dpt === '5.003') return { kind, role: state ? 'hue-state' : 'hue-command' };
    if (has('saturation') && dpt === '5.001') return { kind, role: state ? 'saturation-state' : 'saturation-command' };
    if (['232.600','242.600','251.600'].includes(dpt)) return { kind, role: state ? 'color-state' : 'color-command' };
    if (dpt === '5.001' && has('brightness')) return { kind, role: state ? 'brightness-state' : 'brightness-command' };
    return null;
  }
  if (kind === 'tunable-white') {
    if (['1.001','1.011'].includes(dpt) && has('switch-command')) return { kind, role: state || dpt === '1.011' ? 'switch-state' : 'switch-command' };
    if (has('color-temperature')) {
      if (dpt === '3.007') return { kind, role: 'color-temperature-relative' };
      if (['7.600','5.001'].includes(dpt)) return { kind, role: state ? 'color-temperature-state' : 'color-temperature-command' };
      return null;
    }
    if (dpt === '5.001' && has('brightness')) return { kind, role: state ? 'brightness-state' : 'brightness-command' };
    return null;
  }
  if (kind === 'dimmer') {
    if (['1.001','1.011'].includes(dpt) && has('switch-command')) return { kind, role: state || dpt === '1.011' ? 'switch-state' : 'switch-command' };
    if (dpt === '3.007') return { kind, role: 'dim-relative' };
    if (['5.001','5.004'].includes(dpt)) return { kind, role: state ? 'brightness-state' : 'brightness-command' };
  }
  if (kind === 'switch' && ['1.001','1.011'].includes(dpt)) {
    return { kind, role: state || dpt === '1.011' ? 'switch-state' : 'switch-command',
      ...(!has('switch-command') ? { fallback: true } : {}) };
  }
  return null;
}

export function pointHasCommandEvidence(point: VisualizationPoint): boolean {
  return point.direction === 'command' || Boolean(point.flags?.write) || matchesKeyword('command', text(point), point.keywordConfig);
}
