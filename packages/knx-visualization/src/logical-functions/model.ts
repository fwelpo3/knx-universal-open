import type { RecognitionEvidence, RecognitionMatchClass } from '../../../knx-engineering/src/index.ts';
import { detectVisualizationRole } from '../roleDetection.ts';
import { visualizationTitle } from '../naming.ts';
import type { VisualizationCardKind, VisualizationPoint, VisualizationRole, VisualizationRoleBinding } from '../types.ts';
import type { LogicalFunction, LogicalFunctionBasis } from './types.ts';

const KIND_PRIORITY: VisualizationCardKind[] = ['rgb', 'tunable-white', 'shading', 'thermostat', 'scene', 'dimmer', 'switch'];

export function family(kind: VisualizationCardKind): string {
  return kind === 'switch' || kind === 'dimmer' ? 'light' : kind;
}

export function compatibleKinds(a: VisualizationCardKind, b: VisualizationCardKind): boolean {
  return family(a) === family(b) || a === b;
}

export function roleMap(points: VisualizationPoint[]): Map<VisualizationRole, VisualizationPoint[]> {
  const map = new Map<VisualizationRole, VisualizationPoint[]>();
  for (const point of points) {
    const detected = detectVisualizationRole(point);
    if (!detected) continue;
    if (!map.has(detected.role)) map.set(detected.role, []);
    map.get(detected.role)!.push(point);
  }
  return map;
}

function bindings(roles: Map<VisualizationRole, VisualizationPoint[]>): VisualizationRoleBinding[] {
  return [...roles.entries()].map(([role, points]) => ({
    role,
    pointKeys: [...new Set(points.map((p) => p.key))],
    groupAddresses: [...new Set(points.map((p) => p.groupAddress).filter(Boolean) as string[])],
    dpts: [...new Set(points.map((p) => p.dpt).filter(Boolean) as string[])],
  }));
}

function patternClass(kind: VisualizationCardKind, roles: Map<VisualizationRole, VisualizationPoint[]>): RecognitionMatchClass {
  const has = (...xs: VisualizationRole[]) => xs.every((r) => roles.has(r));
  if (kind === 'switch') return has('switch-command', 'switch-state') ? 'exact' : 'candidate';
  if (kind === 'dimmer') return has('switch-command','switch-state','brightness-command','brightness-state','dim-relative') ? 'exact' : roles.size >= 3 ? 'variant' : 'candidate';
  if (kind === 'rgb') return has('switch-command','switch-state','color-command','color-state') ? 'exact' : roles.size >= 3 ? 'variant' : 'candidate';
  if (kind === 'tunable-white') return has('switch-command','switch-state','brightness-command','brightness-state','color-temperature-command','color-temperature-state') ? 'exact' : roles.size >= 4 ? 'variant' : 'candidate';
  if (kind === 'shading') return has('move-command','step-command','position-command','position-state','slat-command','slat-state') ? 'exact' : roles.size >= 4 ? 'variant' : 'candidate';
  if (kind === 'thermostat') return has('current-temperature','hvac-mode-command') && (roles.has('target-temperature-command') || roles.has('setpoint-shift-command') || roles.has('heating-demand-command')) ? 'exact' : roles.size >= 3 ? 'variant' : 'candidate';
  if (kind === 'scene') return 'candidate';
  return 'candidate';
}

export function dominantKind(points: VisualizationPoint[]): VisualizationCardKind | null {
  const kinds = new Set(points.map(detectVisualizationRole).filter(Boolean).map((x) => x!.kind));
  return KIND_PRIORITY.find((kind) => kinds.has(kind)) || null;
}

function titleAndRoom(points: VisualizationPoint[], kind: VisualizationCardKind): { title: string; room?: string } {
  const functions = points.flatMap((p) => p.buildingFunctions || []);
  const fn = functions.find((x) => x.name || x.typeLabel);
  if (fn) return { title: fn.name || fn.typeLabel, room: fn.spaceName || points.find((p) => p.room)?.room };
  const room = points.find((p) => p.room)?.room;
  const point = points.find((p) => detectVisualizationRole(p)?.kind === kind) || points[0];
  return { title: visualizationTitle(point, kind), room };
}

function matchClassFor(kind: VisualizationCardKind, points: VisualizationPoint[], basis: LogicalFunctionBasis): RecognitionMatchClass {
  if (points.some((point) => detectVisualizationRole(point)?.fallback)) return 'candidate';
  const pattern = patternClass(kind, roleMap(points));
  const hard = !basis.endsWith('fallback');
  if (hard) return pattern;
  if (pattern === 'exact') return 'variant';
  if (pattern === 'variant') return 'candidate';
  return 'candidate';
}

export function buildLogicalFunction(
  id: string,
  points: VisualizationPoint[],
  basis: LogicalFunctionBasis,
  extraEvidence: RecognitionEvidence[] = [],
): LogicalFunction | null {
  const kind = dominantKind(points);
  if (!kind) return null;
  const relevant = points.filter((p) => {
    const detected = detectVisualizationRole(p);
    return detected && (detected.kind === kind || (kind === 'dimmer' && detected.kind === 'switch'));
  });
  const roles = roleMap(relevant);
  if (!roles.size) return null;
  const named = titleAndRoom(relevant, kind);
  return {
    id, kind, title: named.title, room: named.room, basis,
    matchClass: matchClassFor(kind, relevant, basis),
    roles: bindings(roles),
    pointKeys: [...new Set(relevant.map((p) => p.key))],
    groupAddresses: [...new Set(relevant.map((p) => p.groupAddress).filter(Boolean) as string[])],
    sourceDeviceIds: [...new Set(relevant.map((p) => p.deviceId).filter(Boolean) as string[])],
    evidence: [
      { code: 'logical-role-pattern', detail: `${kind}: ${roles.size} semantische Rolle(n)`, objectKeys: relevant.map((p) => p.key) },
      ...relevant.filter((p) => detectVisualizationRole(p)?.fallback).map((p) => ({ code: 'dpt-flags-fallback', detail: 'Nur DPT und explizite Richtung; fachliche Funktion muss geprüft werden.', objectKeys: [p.key] })),
      ...extraEvidence,
    ],
  };
}
