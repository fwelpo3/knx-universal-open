import type { LogicalFunction } from './types.ts';
import type { VisualizationPoint, VisualizationRoleBinding } from '../types.ts';
import { composeEvidenceGraphFunctions } from './evidenceGraph.ts';
import { composeLegacyLogicalFunctions } from './composeLegacy.ts';
import { isSystemVisualizationPoint } from './systemFilter.ts';
import { parseRecognitionKeywordConfig, type RecognitionKeywordConfig } from '../../../knx-engineering/src/index.ts';
import { hasIncompatibleBindingDpts } from './bindingSafety.ts';

function commandAddress(fn: LogicalFunction): string {
  const roles = fn.kind === 'shading' ? ['move-command'] : fn.kind === 'thermostat' ? ['current-temperature']
    : fn.kind === 'scene' ? ['scene-command'] : fn.kind === 'rgb' ? ['color-command', 'hue-command']
    : fn.kind === 'tunable-white' ? ['color-temperature-command', 'color-temperature-relative'] : ['switch-command'];
  for (const role of roles) {
    const binding = fn.roles.find((item) => item.role === role);
    const address = binding?.preferredGroupAddress || binding?.groupAddresses[0];
    if (address) return address;
  }
  return '';
}

const unique = (values: string[]): string[] => [...new Set(values)].sort();
function uniqueEvidence<T>(values: T[]): T[] {
  return [...new Map(values.map((value) => [JSON.stringify(value), value])).entries()]
    .sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
}

function mergeSamePrimary(functions: LogicalFunction[]): LogicalFunction {
  if (functions.length === 1) return functions[0];
  const ordered = [...functions].sort((a, b) => b.roles.length - a.roles.length || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const base = ordered[0], rooms = unique(functions.map((fn) => fn.room || '').filter(Boolean));
  const roles: VisualizationRoleBinding[] = [], conflicts: string[] = [];
  for (const role of unique(functions.flatMap((fn) => fn.roles.map((binding) => binding.role)))) {
    const bindings = ordered.flatMap((fn) => fn.roles.filter((binding) => binding.role === role));
    const addresses = unique(bindings.flatMap((binding) => binding.preferredGroupAddress ? [binding.preferredGroupAddress] : binding.groupAddresses));
    if (addresses.length !== 1) { conflicts.push(role); continue; }
    roles.push({ ...bindings[0], groupAddresses: addresses, preferredGroupAddress: addresses[0],
      pointKeys: unique(bindings.flatMap((binding) => binding.pointKeys)),
      dpts: unique(bindings.flatMap((binding) => binding.dpts)),
      alternativeGroupAddresses: unique(bindings.flatMap((binding) => binding.alternativeGroupAddresses || [])),
      selectionEvidence: uniqueEvidence(bindings.flatMap((binding) => binding.selectionEvidence || [])),
    });
  }
  const pointKeys = unique(functions.flatMap((fn) => fn.pointKeys));
  const conflict = rooms.length > 1 || conflicts.length > 0 || roles.some(hasIncompatibleBindingDpts);
  const fallback = functions.some((fn) => fn.evidence.some((item) => item.code === 'dpt-flags-fallback'));
  const evidence = uniqueEvidence(functions.flatMap((fn) => fn.evidence));
  evidence.push({ code: 'shared-primary-ga', detail: 'Mehrere Endpunkte derselben Haupt-GA zusammengeführt; alle Quellbelege bleiben erhalten.', objectKeys: pointKeys });
  if (conflict) evidence.push({ code: 'shared-primary-conflict', detail: `Widersprüchliche Räume (${rooms.join(', ')}) oder Nebenrollen (${conflicts.join(', ')}); Zuordnung prüfen.`, objectKeys: pointKeys });
  return { ...base, id: `logical:shared:${base.kind}:${commandAddress(base)}`, roles,
    room: rooms.length === 1 ? rooms[0] : undefined,
    matchClass: conflict || fallback || ordered.some((fn) => fn.matchClass === 'candidate') ? 'candidate'
      : ordered.every((fn) => fn.matchClass === 'exact') ? 'exact' : 'variant',
    pointKeys, groupAddresses: unique(functions.flatMap((fn) => fn.groupAddresses)),
    sourceDeviceIds: unique(functions.flatMap((fn) => fn.sourceDeviceIds)), evidence,
  };
}

function dedupe(functions: LogicalFunction[]): LogicalFunction[] {
  const richLight = new Set(functions.filter((fn) => fn.kind === 'dimmer').map(commandAddress).filter(Boolean));
  const filtered = functions.filter((fn) => !(fn.kind === 'switch' && richLight.has(commandAddress(fn))));
  const byKey = new Map<string, LogicalFunction[]>();
  for (const fn of filtered) {
    const address = commandAddress(fn);
    // Distinct scene numbers intentionally share their scene-control GA.
    const key = address && fn.kind !== 'scene' ? `${fn.kind}|${address}` : `${fn.kind}|${address || 'unbound'}|${fn.id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(fn);
  }
  return [...byKey.values()].map(mergeSamePrimary).sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'de') || a.id.localeCompare(b.id));
}

export function composeLogicalFunctions(points: VisualizationPoint[], config?: RecognitionKeywordConfig): LogicalFunction[] {
  if (config !== undefined) {
    const keywordConfig = parseRecognitionKeywordConfig(config);
    points = points.map((point) => ({ ...point, keywordConfig }));
  }
  const v2 = composeEvidenceGraphFunctions(points);
  const remainder = points.filter((point) => !v2.consumed.has(point.key) && !(point.groupAddressPath?.length && isSystemVisualizationPoint(point)));
  return dedupe([...v2.functions, ...composeLegacyLogicalFunctions(remainder)]);
}
