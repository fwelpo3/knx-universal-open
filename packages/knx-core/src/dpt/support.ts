import { auditDptDefinition } from './catalogAudit.ts';
import { getDptDefinition, getDptOrigin, getDptProvenance } from './registry.ts';
import type { DptGroupTransport, DptIssue } from './types.ts';

export type DptSupportStatus = {
  id: string;
  catalogued: boolean;
  decode: boolean;
  encode: boolean;
  origin?: 'standard' | 'extension';
  context?: string;
  groupTransport?: DptGroupTransport;
  issues: DptIssue[];
  provenance?: { source: string; version?: string; vendor?: string; note?: string };
};

export function dptSupport(id: string): DptSupportStatus {
  const definition = getDptDefinition(id);
  if (!definition) return { id, catalogued: false, decode: false, encode: false, issues: [] };
  const issues = auditDptDefinition(definition);
  const operations = String(definition.operations || '');
  const structurallyValid = !issues.some((issue) => issue.level === 'error');
  return {
    id: definition.id,
    catalogued: true,
    decode: structurallyValid && operations.includes('decode'),
    encode: structurallyValid && operations.includes('encode'),
    origin: getDptOrigin(definition.id),
    context: definition.context,
    groupTransport: definition.groupTransport as DptGroupTransport,
    issues,
    provenance: getDptProvenance(definition.id),
  };
}
