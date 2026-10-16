import type { RecognitionEvidence } from '../../../knx-engineering/src/index.ts';
import { normalizeRecognitionText } from '../../../knx-engineering/src/index.ts';
import { detectVisualizationRole } from '../roleDetection.ts';
import { visualizationTitle } from '../naming.ts';
import type { VisualizationCardKind, VisualizationPoint } from '../types.ts';
import { DisjointSet, unionByKey } from './graph.ts';
import { logicalHardEvidence } from './hardEvidence.ts';
import { buildLogicalFunction, dominantKind, family, roleMap } from './model.ts';
import type { LogicalFunction, LogicalFunctionBasis } from './types.ts';

function pointSemanticAnchor(point: VisualizationPoint, kind: VisualizationCardKind): string {
  return `${family(kind)}:${normalizeRecognitionText(point.room || '')}:${normalizeRecognitionText(visualizationTitle(point, kind))}`;
}

function semanticFallbackKey(points: VisualizationPoint[]): string {
  const kind = dominantKind(points); if (!kind) return '';
  const representative = points.find((p) => detectVisualizationRole(p)?.kind === kind) || points[0];
  const title = normalizeRecognitionText(visualizationTitle(representative, kind));
  const room = normalizeRecognitionText(representative.room || '');
  return title ? `${family(kind)}|${room}|${title}` : '';
}

function fallbackEvidence(points: VisualizationPoint[]): RecognitionEvidence[] {
  const ordered = [...points].filter((p) => p.sourceOrder !== undefined).sort((a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
  const contiguous = ordered.length > 1 && (ordered[ordered.length - 1].sourceOrder! - ordered[0].sourceOrder! + 1 === ordered.length);
  return [{
    code: contiguous ? 'logical-sequence-fallback' : 'logical-semantic-fallback',
    detail: contiguous
      ? 'Fallback: zusammenhängende KO-Reihenfolge + gleiche semantische Funktion; nicht ausreichend für EXACT'
      : 'Fallback: gleicher semantischer GA-/Objektname; nicht ausreichend für EXACT',
    objectKeys: points.map((p) => p.key),
  }];
}

export function composeLegacyLogicalFunctions(points: VisualizationPoint[]): LogicalFunction[] {
  const typed = points.map((point, index) => ({ index, point, detected: detectVisualizationRole(point) })).filter((x) => x.detected);
  const entries = typed.map((x) => ({ index: x.index, point: x.point, kind: x.detected!.kind }));
  const ds = new DisjointSet(points.length);

  // Phase 2: primary graph only from project structures. Broad ETS channels are partitioned
  // by semantic function identity so a touch-panel channel cannot merge unrelated functions.
  unionByKey(entries, ds, ({ point }) => point.buildingFunctions?.[0]?.id ? `bf:${point.buildingFunctions[0].id}` : '');
  unionByKey(entries, ds, ({ point }) => point.groupAddress ? `ga:${point.groupAddress}` : '');
  unionByKey(entries, ds, ({ point, kind }) => point.deviceId && point.channelId ? `ch:${point.deviceId}:${point.channelId}:${pointSemanticAnchor(point, kind)}` : '');
  unionByKey(entries, ds, ({ point, kind }) => !point.channelId && point.deviceId && point.moduleInstance ? `mod:${point.deviceId}:${point.moduleInstance}:${pointSemanticAnchor(point, kind)}` : '');

  const components = new Map<number, VisualizationPoint[]>();
  for (const entry of entries) {
    const root = ds.find(entry.index);
    if (!components.has(root)) components.set(root, []);
    components.get(root)!.push(entry.point);
  }

  const hardFunctions: LogicalFunction[] = [];
  const hardPoints = new Map<string, VisualizationPoint[]>();
  const hardFragments: { members: VisualizationPoint[]; basis: LogicalFunctionBasis; evidence: RecognitionEvidence[] }[] = [];
  const unresolved: VisualizationPoint[][] = [];
  for (const [root, members] of components) {
    const hard = logicalHardEvidence(members);
    if (!hard || !dominantKind(members)) { unresolved.push(members); continue; }
    if (roleMap(members).size <= 1) { hardFragments.push({ members, basis: hard.basis, evidence: hard.evidence }); continue; }
    const fn = buildLogicalFunction(`logical:hard:${root}`, members, hard.basis, hard.evidence);
    if (fn) { hardFunctions.push(fn); hardPoints.set(fn.id, members); } else unresolved.push(members);
  }

  // Single-role hard GA fragments can complete exactly one matching structured function.
  const unattached: VisualizationPoint[][] = [];
  for (const fragment of hardFragments) {
    const key = semanticFallbackKey(fragment.members);
    const devices = new Set(fragment.members.map((p) => p.deviceId).filter(Boolean));
    const candidates = hardFunctions.filter((fn) => `${family(fn.kind)}|${normalizeRecognitionText(fn.room || '')}|${normalizeRecognitionText(fn.title)}` === key && fn.sourceDeviceIds.some((id) => devices.has(id)));
    if (candidates.length !== 1) { unattached.push(fragment.members); continue; }
    const target = candidates[0];
    const merged = [...(hardPoints.get(target.id) || []), ...fragment.members];
    const rebuilt = buildLogicalFunction(target.id, merged, target.basis, [
      ...target.evidence.filter((e) => e.code !== 'logical-role-pattern'), ...fragment.evidence,
      { code: 'logical-hard-role-attachment', detail: 'Ein einzelner hart belegter GA-Rollenblock ergänzt dieselbe strukturierte Funktion', objectKeys: fragment.members.map((p) => p.key) },
    ]);
    if (!rebuilt) { unattached.push(fragment.members); continue; }
    hardFunctions[hardFunctions.indexOf(target)] = rebuilt;
    hardPoints.set(target.id, merged);
  }
  unresolved.push(...unattached);

  // Phase 3: sequence/name fallback is allowed only for unresolved pieces and never EXACT.
  const fallbackGroups = new Map<string, VisualizationPoint[]>();
  for (const members of unresolved) {
    const key = semanticFallbackKey(members); if (!key) continue;
    if (!fallbackGroups.has(key)) fallbackGroups.set(key, []);
    fallbackGroups.get(key)!.push(...members);
  }
  const fallbackFunctions: LogicalFunction[] = [];
  for (const [key, members] of fallbackGroups) {
    const evidence = fallbackEvidence(members);
    const basis: LogicalFunctionBasis = evidence[0].code === 'logical-sequence-fallback' ? 'sequence-fallback' : 'semantic-fallback';
    const fn = buildLogicalFunction(`logical:fallback:${key}`, members, basis, evidence);
    if (fn) fallbackFunctions.push(fn);
  }

  return [...hardFunctions, ...fallbackFunctions].sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'de'));
}
