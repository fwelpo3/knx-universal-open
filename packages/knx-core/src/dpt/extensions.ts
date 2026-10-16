import { auditDptDefinition } from './catalogAudit.ts';
import { GENERATED_DPT_CATALOG } from './catalog/generated.ts';
import type { DptDefinition } from './types.ts';

export type DptExtensionMetadata = { source: string; version?: string; vendor?: string; note?: string };
export type DptExtensionRecord = { definition: DptDefinition; metadata: DptExtensionMetadata };
const extensions = new Map<string, DptExtensionRecord>();
const standardIds = new Set((GENERATED_DPT_CATALOG as readonly { id: string }[]).map((item) => item.id));

export function registerDptExtension(definition: DptDefinition, metadata: DptExtensionMetadata): void {
  const issues = auditDptDefinition(definition).filter((issue) => issue.level === 'error');
  if (issues.length) throw new Error(`Invalid DPT extension ${definition.id}: ${issues[0].message}`);
  if (!metadata?.source?.trim()) throw new Error('DPT extension source is required');
  if (standardIds.has(definition.id)) throw new Error(`Standard DPT cannot be overridden: ${definition.id}`);
  if (extensions.has(definition.id)) throw new Error(`DPT extension already registered: ${definition.id}`);
  extensions.set(definition.id, { definition: structuredClone(definition), metadata: { ...metadata } });
}
export function unregisterDptExtension(id: string): boolean { return extensions.delete(id); }
export function clearDptExtensions(): void { extensions.clear(); }
export function getDptExtension(id: string): DptExtensionRecord | undefined { return extensions.get(id); }
export function listDptExtensions(): readonly DptExtensionRecord[] { return [...extensions.values()]; }
