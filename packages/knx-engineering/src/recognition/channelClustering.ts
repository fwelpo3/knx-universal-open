import { recognitionChannelLabel } from './recognitionTextPatterns.ts';
import type { RecognitionEvidence, RecognitionObject } from './types.ts';
import { normalizeRecognitionText, slotKey } from './semantics.ts';

export interface RecognitionCluster {
  id: string;
  objects: RecognitionObject[];
  source: 'channel' | 'ets-group' | 'module' | 'module+ets' | 'adjacency';
  label: string;
  alias?: string;
  evidence: RecognitionEvidence[];
}

function structuralLabel(objects: RecognitionObject[]): string {
  const candidates = objects.flatMap((o) => [o.name, o.functionText]).filter(Boolean) as string[];
  return recognitionChannelLabel(candidates);
}


function objectChannelLabel(object: RecognitionObject): string {
  return structuralLabel([object]);
}

function inferAdjacentTextClusters(objects: RecognitionObject[]): { clusters: RecognitionCluster[]; rest: RecognitionObject[] } {
  const byLabel = new Map<string, RecognitionObject[]>();
  for (const object of objects) {
    const label = objectChannelLabel(object);
    if (!label) continue;
    const key = normalizeRecognitionText(label);
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key)!.push(object);
  }
  const consumed = new Set<string>();
  const clusters: RecognitionCluster[] = [];
  for (const members of byLabel.values()) {
    if (members.length < 2) continue;
    const ordered = [...members].sort((a, b) => a.sourceOrder - b.sourceOrder);
    const span = ordered[ordered.length - 1].sourceOrder - ordered[0].sourceOrder + 1;
    if (span !== ordered.length) continue;
    const label = objectChannelLabel(ordered[0]);
    ordered.forEach((o) => consumed.add(o.key));
    clusters.push({
      id: `adjacency:${normalizeRecognitionText(label)}`,
      objects: ordered,
      source: 'adjacency',
      label,
      evidence: [{
        code: 'adjacent-text-block',
        detail: `${ordered.length} direkt aufeinanderfolgende Objekte tragen dasselbe Kanal-Label ${label}`,
        objectKeys: ordered.map((o) => o.key),
      }],
    });
  }
  return { clusters, rest: objects.filter((o) => !consumed.has(o.key)) };
}

function pathInfo(objects: RecognitionObject[]) {
  const paths = objects.map((o) => o.groupPath || []).filter((p) => p.length);
  if (!paths.length) return { id: '', label: '', order: undefined as number | undefined };
  const last = paths[0][paths[0].length - 1];
  return { id: last.id || last.label, label: last.label, order: last.order };
}

function blockEvidence(objects: RecognitionObject[]): RecognitionEvidence | null {
  if (objects.length < 2) return null;
  const orders = objects.map((o) => o.sourceOrder).sort((a, b) => a - b);
  const span = orders[orders.length - 1] - orders[0] + 1;
  if (span !== objects.length) return null;
  return { code: 'adjacent-block', detail: `${objects.length} Objekte liegen im aktiven ETS-Baum direkt als Block untereinander`, objectKeys: objects.map((o) => o.key) };
}

export function clusterRecognitionObjects(objects: RecognitionObject[]): { clusters: RecognitionCluster[]; global: RecognitionObject[] } {
  const groups = new Map<string, RecognitionObject[]>();
  const global: RecognitionObject[] = [];
  for (const object of objects) {
    const path = pathInfo([object]);
    // A channel definition may repeat in multiple module instances. Keep that
    // scope explicit; missing module evidence must not borrow a known scope.
    // Tuple encoding avoids delimiter collisions without normalizing source IDs.
    const key = object.channelId
      ? object.moduleInstance
        ? `module-channel:${JSON.stringify([object.moduleInstance, object.channelId])}`
        : `channel:${object.channelId}`
      : object.moduleInstance ? `module:${object.moduleInstance}`
      : path.id ? `ets:${path.id}` : '';
    if (!key) { global.push(object); continue; }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(object);
  }
  const clusters: RecognitionCluster[] = [];
  for (const [key, members] of groups) {
    const explicitChannel = Boolean(members[0].channelId);
    if (members.length < 2 && !explicitChannel) { global.push(...members); continue; }
    const p = pathInfo(members);
    const structural = structuralLabel(members);
    const alias = p.label && structural && normalizeRecognitionText(p.label) !== normalizeRecognitionText(structural) ? p.label : undefined;
    const source = explicitChannel ? 'channel' : members[0].moduleInstance && p.id ? 'module+ets' : members[0].moduleInstance ? 'module' : 'ets-group';
    const evidence: RecognitionEvidence[] = [];
    if (explicitChannel) evidence.push({ code: 'ets-channel-id', detail: `Expliziter ETS Channel ${members[0].channelId}`, objectKeys: members.map((o) => o.key) });
    if (p.id) evidence.push({ code: 'ets-parent-group', detail: `Gemeinsame ETS-Gruppe: ${p.label}`, objectKeys: members.map((o) => o.key) });
    if (members[0].moduleInstance) evidence.push({ code: 'module-instance', detail: `Gemeinsame Modulinstanz ${members[0].moduleInstance}`, objectKeys: members.map((o) => o.key) });
    const functionalBlocks = [...new Set(members.flatMap((o) => o.channelFunctionalBlocks || []))];
    if (functionalBlocks.length) evidence.push({ code: 'functional-block', detail: `KNX Functional Block ${functionalBlocks.join(', ')}`, objectKeys: members.map((o) => o.key) });
    const adjacent = blockEvidence(members); if (adjacent) evidence.push(adjacent);
    clusters.push({ id: key, objects: members, source, label: structural || p.label || key, alias, evidence });
  }
  const inferred = inferAdjacentTextClusters(global);
  clusters.push(...inferred.clusters);
  return { clusters, global: inferred.rest };
}

export function addRepeatedStructureEvidence(clusters: RecognitionCluster[]): void {
  const byDefinition = new Map<string, RecognitionCluster[]>();
  for (const cluster of clusters) {
    const def = cluster.objects.find((o) => o.moduleDefinition)?.moduleDefinition;
    if (!def) continue;
    if (!byDefinition.has(def)) byDefinition.set(def, []);
    byDefinition.get(def)!.push(cluster);
  }
  for (const [definition, related] of byDefinition) {
    if (related.length < 2) continue;
    const slotSets = related.map((c) => new Set(c.objects.map(slotKey)));
    const common = [...slotSets[0]].filter((slot) => slotSets.every((set) => set.has(slot)));
    if (common.length < 2) continue;
    for (const cluster of related) cluster.evidence.push({ code: 'repeated-module-structure', detail: `${related.length} Kanäle teilen Modul ${definition} mit ${common.length} gleichen semantischen Slots` });
  }
}
