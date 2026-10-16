import { normalizeDptId } from '../../../knx-core/src/index.ts';
import type { KnxCommunicationObject } from '../../../knx-model/src/index.ts';
import type { EngineeringMatchClass } from '../model/types.ts';
import { communicationRole } from '../patterns/normalize.ts';
import type { DetectedCapability, EngineeringEvidence } from './types.ts';

function textOf(object: KnxCommunicationObject): string {
  return [object.channel?.name, object.name, object.text, object.functionText, object.description]
    .filter(Boolean).join(' ').toLowerCase();
}

const PRECEDENCE: Record<EngineeringMatchClass, number> = {
  'exact-signature': 5,
  'family-pattern': 4,
  'structural-pattern': 3,
  'semantic-pattern': 2,
  candidate: 1,
};

function add(
  out: Map<string, DetectedCapability>,
  id: string,
  matchClass: EngineeringMatchClass,
  role: DetectedCapability['role'],
  evidence: EngineeringEvidence,
  patternId?: string,
): void {
  const current = out.get(id);
  if (!current) {
    out.set(id, { id, matchClass, role, patternId, evidence: [evidence] });
    return;
  }
  if (PRECEDENCE[matchClass] > PRECEDENCE[current.matchClass]) {
    current.matchClass = matchClass;
    current.patternId = patternId || current.patternId;
  }
  if (current.role === 'unknown') current.role = role;
  current.evidence.push(evidence);
}

/**
 * Conservative object-level semantic detection.
 * It emits explicit evidence classes and never creates a binding by itself.
 */
export function detectCommunicationObjectCapabilities(object: KnxCommunicationObject): DetectedCapability[] {
  const out = new Map<string, DetectedCapability>();
  const text = textOf(object);
  const dpt = normalizeDptId(object.datapointType || '');
  const role = communicationRole(object);

  const nameRules: Array<[RegExp, string]> = [
    [/\b(schalten|switch|ein.?aus|on.?off)\b/i, 'switch'],
    [/\b(status|rückmeld|rueckmeld|feedback)\b/i, 'feedback'],
    [/\b(dim+en|dimming|heller|dunkler)\b/i, 'dimming'],
    [/\b(jalous|raffstore|rollladen|blind|shade|auf.?ab|fahren)\b/i, 'shading.move'],
    [/\b(lamelle|slat)\b/i, 'shading.slat'],
    [/\b(position|höhe|hoehe)\b/i, 'position'],
    [/\b(temperatur|temperature|ist.?temp|sollwert|setpoint)\b/i, 'temperature'],
    [/\b(präsenz|praesenz|presence|bewegung|motion)\b/i, 'occupancy'],
    [/\b(helligkeit|brightness|lux)\b/i, 'brightness'],
    [/\b(szene|scene)\b/i, 'scene'],
    [/\b(sperr|lock|freigabe|enable)\b/i, 'enable-lock'],
  ];
  for (const [pattern, id] of nameRules) {
    if (pattern.test(text)) add(out, id, 'semantic-pattern', role, { kind: 'name', value: text });
  }

  if (/^DPST-1-|^DPT-1$/.test(dpt)) add(out, 'binary', 'candidate', role, { kind: 'dpt', value: dpt });
  if (/^DPST-3-|^DPT-3$/.test(dpt)) add(out, 'relative-control', 'semantic-pattern', role, { kind: 'dpt', value: dpt });
  if (/^DPST-5-|^DPT-5$/.test(dpt)) add(out, 'percent-or-8bit', 'candidate', role, { kind: 'dpt', value: dpt });
  if (/^DPST-9-|^DPT-9$/.test(dpt)) add(out, 'float16', 'candidate', role, { kind: 'dpt', value: dpt });
  if (/^DPST-17-|^DPT-17$/.test(dpt)) add(out, 'scene-number', 'semantic-pattern', role, { kind: 'dpt', value: dpt });
  if (/^DPST-18-|^DPT-18$/.test(dpt)) add(out, 'scene-control', 'semantic-pattern', role, { kind: 'dpt', value: dpt });

  if (object.flags) {
    add(out, `direction.${role}`, 'structural-pattern', role, { kind: 'flags', detail: JSON.stringify(object.flags) });
  }

  return [...out.values()].sort((a, b) => PRECEDENCE[b.matchClass] - PRECEDENCE[a.matchClass] || a.id.localeCompare(b.id));
}
