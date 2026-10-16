import { decodeDpt, encodeDpt, validateDptValue } from './codec.ts';
import { canonicalDptId, dptPayloadBytes, getDptDefinition, getDptFieldByPath, listDptDefinitions, listDptFieldPaths, parseDptWidth } from './registry.ts';
import { getCodeInfo } from './semantics.ts';
import { intervalCountForStepCode, stepCodeForIntervalCount } from './interval.ts';
import { z8Catalog } from './z8.ts';
import { getDptBackReferences, getDptCrossReferences } from './crossReferences.ts';
import { dptGroupTransportInfo } from './groupTransport.ts';
import { listVariableDpts, variableDptInfo } from './variable.ts';
import { dptSupport } from './support.ts';
import { clearDptExtensions, listDptExtensions, registerDptExtension, unregisterDptExtension } from './extensions.ts';
import { auditDptCatalog } from './catalogAudit.ts';
import type { DptCodeValue, DptFieldDefinition, DptSpecial } from './types.ts';
import { getDptDisplayLabel, getDptLabel, getDptLocalizedLabel, getDptMainTypeLabel } from './localization.ts';

export function normalizeDptId(value?: string): string {
  const canonical = canonicalDptId(value);
  const match = canonical.match(/^(\d+)\.(\d+)$/);
  if (!match) return canonical;
  return `DPST-${Number(match[1])}-${Number(match[2])}`;
}

export function dptCandidates(value?: string): string[] {
  return [...new Set(String(value || '').trim().split(/\s+/).map(normalizeDptId).filter(Boolean))];
}

export function dptObjectSize(value?: string): string {
  const definition = getDptDefinition(value || '');
  if (definition) {
    const width = parseDptWidth(definition.width);
    if (width.kind === 'variable') return 'Variable';
    if (width.kind === 'bits') return `${width.value} Bit`;
    return width.value === 1 ? '1 Byte' : `${width.value} Bytes`;
  }

  // Preserve the pre-migration public behavior for main-type-only values
  // such as DPT-1, which intentionally do not resolve to one catalog subtype.
  const normalized = normalizeDptId(value);
  const main = Number(normalized.match(/^(?:DPST-|DPT-)?(\d+)/)?.[1]);
  if ([1].includes(main)) return '1 Bit';
  if ([2].includes(main)) return '2 Bit';
  if ([3].includes(main)) return '4 Bit';
  if ([4, 5, 6, 17, 18, 20, 21, 23].includes(main)) return '1 Byte';
  if ([7, 8, 9, 22].includes(main)) return '2 Bytes';
  if ([10, 11].includes(main)) return '3 Bytes';
  if ([12, 13, 14, 15].includes(main)) return '4 Bytes';
  if ([19, 29].includes(main)) return '8 Bytes';
  if ([16].includes(main)) return '14 Bytes';
  return '';
}

export function getDptFieldDefinition(id: string, fieldName: string): DptFieldDefinition | undefined {
  const definition = getDptDefinition(id);
  if (!definition) return undefined;
  return findField(definition.fields, fieldName);
}

export function getDptCodeInfo(id: string, fieldName: string, code: number): DptCodeValue | undefined {
  const field = getDptFieldDefinition(id, fieldName);
  return field ? getCodeInfo(field, code) : undefined;
}

export function getDptSpecials(id: string, fieldName: string): readonly DptSpecial[] {
  return getDptFieldDefinition(id, fieldName)?.specials || [];
}

export const dptRegistry = Object.freeze({
  get: getDptDefinition,
  list: listDptDefinitions,
  payloadBytes: dptPayloadBytes,
  field: getDptFieldDefinition,
  codeInfo: getDptCodeInfo,
  specials: getDptSpecials,
  fieldPaths: listDptFieldPaths,
  fieldByPath: getDptFieldByPath,
  references: getDptCrossReferences,
  backReferences: getDptBackReferences,
  groupTransport: dptGroupTransportInfo,
  variable: variableDptInfo,
  variableIds: listVariableDpts,
  support: dptSupport,
  audit: () => auditDptCatalog(listDptDefinitions()),
  label: getDptLabel,
  displayLabel: getDptDisplayLabel,
  localized: getDptLocalizedLabel,
  mainTypeLabel: getDptMainTypeLabel,
  extensions: Object.freeze({ register: registerDptExtension, unregister: unregisterDptExtension, clear: clearDptExtensions, list: listDptExtensions }),
});

export const dptInterval = Object.freeze({
  fromStepCode: intervalCountForStepCode,
  toStepCode: stepCodeForIntervalCount,
});

export { z8Catalog };
export { decodeDpt, encodeDpt, validateDptValue, getDptDefinition, listDptDefinitions };

function findField(fields: DptFieldDefinition[], name: string): DptFieldDefinition | undefined {
  for (const field of fields) {
    if (field.name === name) return field;
    const nested = field.children ? findField(field.children, name) : undefined;
    if (nested) return nested;
  }
  return undefined;
}
