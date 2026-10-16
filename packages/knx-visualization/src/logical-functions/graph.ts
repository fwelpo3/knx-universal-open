import type { VisualizationCardKind, VisualizationPoint } from '../types.ts';
import { compatibleKinds } from './model.ts';

export class DisjointSet {
  private parent: number[];
  constructor(size: number) { this.parent = Array.from({ length: size }, (_, i) => i); }
  find(x: number): number { return this.parent[x] === x ? x : (this.parent[x] = this.find(this.parent[x])); }
  union(a: number, b: number): void { const ra = this.find(a); const rb = this.find(b); if (ra !== rb) this.parent[rb] = ra; }
}

export interface TypedPointEntry { index: number; point: VisualizationPoint; kind: VisualizationCardKind }

export function unionByKey(entries: TypedPointEntry[], ds: DisjointSet, keyOf: (entry: TypedPointEntry) => string): void {
  const byKey = new Map<string, TypedPointEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry); if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(entry);
  }
  for (const group of byKey.values()) {
    for (let i = 1; i < group.length; i++) {
      if (compatibleKinds(group[0].kind, group[i].kind)) ds.union(group[0].index, group[i].index);
    }
  }
}
