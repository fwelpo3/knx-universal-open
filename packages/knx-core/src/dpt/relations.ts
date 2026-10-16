import { normalizeDisposition, strongerDisposition } from './dispositions.ts';
import type {
  DptAbsentValue,
  DptCrossRule,
  DptDecodeResult,
  DptDecodedField,
  DptDefinition,
  DptFieldDefinition,
  DptIssue,
  DptReceiveDisposition,
  DptValidityEdge,
} from './types.ts';

type Owner = Record<string, unknown> | unknown[];
type Occurrence = {
  name: string;
  path: string;
  scope: string[];
  value: unknown;
  owner: Owner;
  key: string | number;
  detail?: DptDecodedField;
};

export function applyValidityRelations(
  definition: DptDefinition,
  fields: Record<string, unknown>,
  details: DptDecodedField[],
): Set<string> {
  const occurrences = collectOccurrences(definition.fields, fields, details);
  const invalid = new Map<string, { edge: DptValidityEdge; target: Occurrence; flag: Occurrence }>();
  for (const edge of definition.validity) {
    const targets = occurrences.filter((item) => item.name === edge.target);
    for (const target of targets) {
      const flag = bestScoped(occurrences.filter((item) => item.name === edge.flag), target.scope);
      if (!flag) continue;
      const active = Boolean(unwrap(flag.value));
      const isInvalid = edge.sense === 'asserts-invalid' ? active : !active;
      if (isInvalid) invalid.set(target.path, { edge, target, flag });
      else if (target.detail && target.detail.valid == null) target.detail.valid = true;
    }
  }
  for (const { edge, target } of invalid.values()) {
    const raw = target.detail?.raw ?? numericRaw(target.value);
    const absent: DptAbsentValue = {
      kind: 'state', state: 'absent', reason: `Validity:${edge.flag}`,
      flag: edge.flag, raw,
    };
    setOwned(target, absent);
    if (target.detail) {
      target.detail.valid = false;
      target.detail.state = 'absent';
      target.detail.value = absent;
      target.detail.validityFlag = edge.flag;
    }
  }
  return new Set(invalid.keys());
}

export function evaluateCrossFieldRules(
  definition: DptDefinition,
  fields: Record<string, unknown>,
  issues: DptIssue[],
  invalidPaths: Set<string>,
  mode: 'receive' | 'transmit',
): DptReceiveDisposition | undefined {
  const occurrences = collectOccurrences(definition.fields, fields, []);
  let disposition: DptReceiveDisposition | undefined;
  for (const rule of definition.rules) {
    if (rule.kind !== 'zero-when') continue;
    for (const trigger of occurrences.filter((item) => item.name === rule.trigger)) {
      if (mode === 'receive' && invalidPaths.has(trigger.path)) continue;
      if (numericValue(trigger.value) !== rule.value) continue;
      for (const targetName of rule.targets) {
        const targets = scopedAll(occurrences.filter((item) => item.name === targetName), trigger.scope);
        for (const target of targets) {
          if (mode === 'receive' && invalidPaths.has(target.path)) continue;
          if (numericValue(target.value) === 0) continue;
          const current = normalizeDisposition(rule.disposition);
          if (mode === 'transmit' && current === 'ignore-message') {
            throw new RangeError(`${rule.trigger}: composing value would require receiver to ignore message`);
          }
          issues.push({
            level: current === 'accept-without-action' ? 'warning' : 'error',
            code: current || 'cross-field', field: rule.trigger, path: trigger.path,
            disposition: current,
            message: `${target.path} must be zero when ${trigger.path}=${rule.value}`,
          });
          disposition = strongerDisposition(disposition, current);
        }
      }
    }
  }
  return disposition;
}

export function filterInvalidatedIssues(issues: DptIssue[], invalidPaths: Set<string>): void {
  for (let index = issues.length - 1; index >= 0; index -= 1) {
    const path = issues[index].path;
    if (path && invalidPaths.has(path)) issues.splice(index, 1);
  }
}

function collectOccurrences(
  definitions: DptFieldDefinition[],
  values: Record<string, unknown>,
  details: DptDecodedField[],
  prefix = '',
  scope: string[] = [],
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const field of definitions) {
    if (field.shape.startsWith('reserved:')) continue;
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    const value = values[field.name];
    const detail = details.find((item) => item.path === path);
    if (field.shape.startsWith('embed:')) {
      out.push(...collectOccurrences(field.children || [], asObject(value), details, path, scope));
    } else if (field.shape.startsWith('repeat:')) {
      const rows = Array.isArray(value) ? value : [];
      rows.forEach((row, index) => {
        const instance = `${path}[${index}]`;
        out.push(...collectOccurrences(field.children || [], asObject(row), details, instance, [...scope, instance]));
      });
    } else {
      out.push({ name: field.name, path, scope, value, owner: values, key: field.name, detail });
      if (field.shape.startsWith('bits:')) {
        const group = asObject(value);
        for (const bit of field.bitSet?.bits || []) {
          const bitPath = `${path}.${bit.name}`;
          out.push({
            name: bit.name, path: bitPath, scope, value: group[bit.name], owner: group, key: bit.name,
            detail: details.find((item) => item.path === bitPath),
          });
        }
      }
    }
  }
  return out;
}

function bestScoped(items: Occurrence[], scope: string[]): Occurrence | undefined {
  const compatible = items.filter((item) => isPrefix(item.scope, scope));
  return compatible.sort((a, b) => b.scope.length - a.scope.length)[0];
}
function scopedAll(items: Occurrence[], scope: string[]): Occurrence[] {
  const exact = items.filter((item) => sameScope(item.scope, scope));
  if (exact.length) return exact;
  return items.filter((item) => isPrefix(item.scope, scope) || isPrefix(scope, item.scope));
}
function sameScope(a: string[], b: string[]): boolean { return a.length === b.length && a.every((item, i) => item === b[i]); }
function isPrefix(a: string[], b: string[]): boolean { return a.length <= b.length && a.every((item, i) => item === b[i]); }
function asObject(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function setOwned(item: Occurrence, value: unknown): void { (item.owner as Record<string | number, unknown>)[item.key] = value; }
function numericRaw(value: unknown): number | bigint | undefined {
  const numeric = numericValue(value); return Number.isFinite(numeric) ? numeric : undefined;
}
function numericValue(value: unknown): number {
  const unwrapped = unwrap(value);
  if (typeof unwrapped === 'bigint') return Number(unwrapped);
  if (typeof unwrapped === 'boolean') return unwrapped ? 1 : 0;
  if (typeof unwrapped === 'number') return unwrapped;
  return Number.NaN;
}
function unwrap(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const object = value as Record<string, unknown>;
  if (object.kind === 'code' && typeof object.code === 'number') return object.code;
  if (object.kind === 'state') return undefined;
  return value;
}
