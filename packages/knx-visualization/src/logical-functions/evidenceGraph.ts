import { detectVisualizationRole } from '../roleDetection.ts';
import type { VisualizationCardKind, VisualizationPoint, VisualizationRole } from '../types.ts';
import { evidenceClusterKey, evidenceEntityIdentity, isDistributionRoom } from './evidenceIdentity.ts';
import { resolveFunctionalRoom } from './functionalRoom.ts';
import { family } from './model.ts';
import { selectRoleBinding } from './roleSelection.ts';
import { isSystemVisualizationPoint } from './systemFilter.ts';
import { composeExplicitSceneFunctions } from './sceneFunctions.ts';
import type { LogicalFunction } from './types.ts';
import { partitionEvidenceGroup } from './groupPartitions.ts';
import { hasIncompatibleBindingDpts } from './bindingSafety.ts';

const ROLE_ORDER: VisualizationRole[] = [
  'switch-command','switch-state','dim-relative','brightness-command','brightness-state',
  'color-command','color-state','hue-command','hue-state','saturation-command','saturation-state',
  'color-temperature-command','color-temperature-state','color-temperature-relative',
  'move-command','step-command','position-command','position-state','slat-command','slat-state',
  'current-temperature','target-temperature-command','target-temperature-state','setpoint-shift-command','setpoint-shift-state',
  'hvac-mode-command','hvac-mode-state','heating-demand-command','heating-demand-state','heating-state','cooling-state',
  'presence-command','heat-cool-command','hvac-enable-command','hvac-enable-state','scene-command',
];

function kindFor(points: VisualizationPoint[]): VisualizationCardKind | null {
  const detected = points.map(detectVisualizationRole).filter(Boolean).map((item) => item!);
  const kinds = new Set(detected.map((item) => item.kind));
  if (kinds.has('rgb')) return 'rgb';
  if (kinds.has('tunable-white')) return 'tunable-white';
  if (kinds.has('shading')) return 'shading';
  if (kinds.has('thermostat')) return 'thermostat';
  if (kinds.has('scene')) return 'scene';
  if (kinds.has('dimmer')) return 'dimmer';
  if (kinds.has('switch')) return 'switch';
  return null;
}

function required(kind: VisualizationCardKind, roles: Set<VisualizationRole>): boolean {
  if (kind === 'switch') return roles.has('switch-command');
  if (kind === 'dimmer') return roles.has('switch-command') && (roles.has('dim-relative') || roles.has('brightness-command'));
  if (kind === 'shading') return roles.has('move-command') && (roles.has('step-command') || roles.has('position-command'));
  if (kind === 'thermostat') return roles.has('current-temperature') && (roles.has('target-temperature-command') || roles.has('target-temperature-state') || roles.has('setpoint-shift-command'));
  if (kind === 'scene') return false;
  if (kind === 'rgb') return roles.has('color-command') || roles.has('hue-command');
  if (kind === 'tunable-white') return roles.has('color-temperature-command') || roles.has('color-temperature-relative');
  return false;
}

function exactPattern(kind: VisualizationCardKind, roles: Set<VisualizationRole>): boolean {
  if (kind === 'switch') return roles.has('switch-command') && roles.has('switch-state');
  if (kind === 'dimmer') return ['switch-command','switch-state','dim-relative','brightness-command','brightness-state'].every((role) => roles.has(role as VisualizationRole));
  if (kind === 'shading') return ['move-command','step-command','position-command','position-state','slat-command','slat-state'].every((role) => roles.has(role as VisualizationRole));
  if (kind === 'thermostat') return roles.has('current-temperature') && roles.has('target-temperature-command');
  if (kind === 'scene') return false;
  return required(kind, roles) && roles.size >= 3;
}

function gaUsage(points: VisualizationPoint[]): Map<string, number> {
  const usage = new Map<string, Set<string>>();
  for (const point of points) {
    if (!point.groupAddress) continue;
    if (!usage.has(point.groupAddress)) usage.set(point.groupAddress, new Set());
    usage.get(point.groupAddress)!.add(`${point.deviceId || ''}|${point.key}`);
  }
  return new Map([...usage].map(([address, endpoints]) => [address, endpoints.size]));
}

function knownRooms(points: VisualizationPoint[]): string[] {
  return [...new Set(points.filter((point) => point.room && !isDistributionRoom(point)).map((point) => point.room!))];
}

export function composeEvidenceGraphFunctions(points: VisualizationPoint[]): { functions: LogicalFunction[]; consumed: Set<string> } {
  const scenes = composeExplicitSceneFunctions(points);
  const usage = gaUsage(points), rooms = knownRooms(points), groups = new Map<string, VisualizationPoint[]>();
  for (const point of points) {
    const detected = detectVisualizationRole(point);
    if (!detected || detected.kind === 'scene' || !point.groupAddressPath?.length || isSystemVisualizationPoint(point)) continue;
    const key = evidenceClusterKey(point, detected.kind);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point);
  }
  const functions: LogicalFunction[] = [], consumed = new Set<string>();
  for (const [key, groupedMembers] of groups) {
    const groupedKind = kindFor(groupedMembers); if (!groupedKind) continue;
    for (const partition of partitionEvidenceGroup(groupedMembers, groupedKind)) {
      const members = partition.members;
      const kind = kindFor(members); if (!kind) continue;
      const roles = new Set(members.map(detectVisualizationRole).filter(Boolean).map((item) => item!.role));
      if (!required(kind, roles)) continue;
      const representative = members.find((point) => family(detectVisualizationRole(point)!.kind) === family(kind)) || members[0];
      const identity = evidenceEntityIdentity(representative, kind);
      const bindings = ROLE_ORDER.map((role) => selectRoleBinding(role, members, identity, usage)).filter(Boolean) as NonNullable<ReturnType<typeof selectRoleBinding>>[];
      const room = resolveFunctionalRoom(members, rooms);
      const selectedRoles = new Set(bindings.map((binding) => binding.role));
      const hard = members.some((point) => point.deviceId && point.groupAddress && (point.channelId || point.moduleInstance || point.activeByProject)) || members.some((point) => point.buildingFunctions?.length);
      const fallback = members.some((point) => detectVisualizationRole(point)?.fallback);
      const dptConflict = bindings.some(hasIncompatibleBindingDpts);
      const writableSetpoint = kind !== 'thermostat' || members.some((point) =>
        detectVisualizationRole(point)?.role === 'target-temperature-command' && point.flags?.write === true);
      const matchClass = fallback || dptConflict ? 'candidate' : exactPattern(kind, selectedRoles) && hard && writableSetpoint ? 'exact' : selectedRoles.size >= 3 ? 'variant' : 'candidate';
      const fn: LogicalFunction = {
        id: `logical:v2:${key}${partition.id ? `:primary:${partition.id}` : ''}`, kind, title: identity || kind, room: room.room, basis: 'evidence-graph', matchClass,
        roles: bindings,
        pointKeys: [...new Set(bindings.flatMap((binding) => binding.pointKeys))],
        groupAddresses: [...new Set(bindings.flatMap((binding) => binding.groupAddresses))],
        sourceDeviceIds: [...new Set(members.map((point) => point.deviceId).filter(Boolean) as string[])],
        evidence: [
          { code: 'evidence-graph-cluster', detail: `${kind}: Identität '${identity}' + GA-Pfad + echte KO↔GA-Verknüpfungen`, objectKeys: members.map((point) => point.key) },
          ...room.evidence,
          ...bindings.flatMap((binding) => binding.selectionEvidence || []),
          ...(partition.ambiguousPointKeys.length ? [{ code: 'ambiguous-partition-role', detail: 'Nebenrollen passen nicht eindeutig zu einem der getrennten Hauptbefehle und bleiben ungebunden.', objectKeys: partition.ambiguousPointKeys }] : []),
          ...(fallback ? [{ code: 'dpt-flags-fallback', detail: 'Mindestens eine Rolle beruht nur auf DPT/Flags; kein automatischer Export.' }] : []),
          ...(dptConflict ? [{ code: 'incompatible-role-dpts', detail: 'Unterschiedliche DPT-Datenfamilien an derselben Rollen-GA; Zuordnung prüfen.' }] : []),
        ],
      };
      functions.push(fn);
      members.forEach((point) => consumed.add(point.key));
      partition.ambiguousPointKeys.forEach((pointKey) => consumed.add(pointKey));
    }
  }
  scenes.consumed.forEach((key) => consumed.add(key));
  return { functions: [...scenes.functions, ...functions], consumed };
}
