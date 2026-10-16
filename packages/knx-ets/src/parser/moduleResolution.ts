import { stableEtsText } from './text.ts';

export interface EtsModuleInstanceMeta {
  id: string;
  definitionId: string;
  args: Record<string, string>;
  objectNumberBase: number;
}

export function definitionKeyForInstanceRef(ref: string): string {
  return String(ref || '').replace(/(MD-\d+)_M-\d+(?:_MI-\d+)?(?=_)/, '$1');
}

export function resolveModuleNumber(
  rawRef: string,
  relativeNumber: string,
  moduleInstances: ReadonlyMap<string, EtsModuleInstanceMeta>
): string {
  const number = Number(relativeNumber);
  if (!Number.isFinite(number)) return relativeNumber || '';
  const meta = findModuleMeta(rawRef, moduleInstances);
  return meta && Number.isFinite(meta.objectNumberBase)
    ? String(meta.objectNumberBase + number)
    : String(number);
}

export function resolveModuleText(
  rawRef: string,
  template: string,
  textParameterRefId: string,
  moduleInstances: ReadonlyMap<string, EtsModuleInstanceMeta>,
  parameterValues: ReadonlyMap<string, string>
): string {
  const raw = String(template ?? '');
  if (!raw) return '';
  if (!/\{\{[^}]+\}\}/.test(raw) && !stableEtsText(textParameterRefId)) return raw;

  let value = raw;
  const meta = findModuleMeta(rawRef, moduleInstances);
  if (meta) {
    value = value.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g, (_match, name: string) => {
      const found = Object.entries(meta.args).find(([key]) => key.toLowerCase() === name.toLowerCase());
      return found?.[1] ?? '';
    });
  }

  const refs = stableEtsText(textParameterRefId).split(/\s+/).filter(Boolean);
  const rendered = refs.map((ref) => resolveProjectParameter(rawRef, ref, parameterValues));
  value = value.replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, index: string) => rendered[Number(index)] || '');
  return cleanRenderedText(value);
}

export function projectParameterKeys(refId: string): string[] {
  const raw = String(refId || '');
  const keys = [raw];
  const moduleTail = raw.match(/(MD-\d+_M-\d+(?:_MI-\d+)?_(?:U?P)-.+)$/)?.[1];
  if (moduleTail) keys.push(moduleTail);
  const short = raw.match(/(?:^|_)((?:U?P)-.+)$/)?.[1];
  if (short) keys.push(short);
  return [...new Set(keys.filter(Boolean))];
}

function resolveProjectParameter(
  rawRef: string,
  definitionRef: string,
  values: ReadonlyMap<string, string>
): string {
  const instancePrefix = String(rawRef || '').match(/(MD-\d+_M-\d+(?:_MI-\d+)?)(?=_)/)?.[1] || '';
  const suffix = String(definitionRef || '').match(/MD-\d+_((?:U?P)-.+)$/)?.[1] || '';
  const candidates = [instancePrefix && suffix ? `${instancePrefix}_${suffix}` : '', ...projectParameterKeys(definitionRef)]
    .filter(Boolean);

  for (const candidate of candidates) {
    const direct = values.get(candidate);
    if (direct !== undefined && direct !== '') return stableEtsText(direct);
  }
  return '';
}

function findModuleMeta(
  ref: string,
  modules: ReadonlyMap<string, EtsModuleInstanceMeta>
): EtsModuleInstanceMeta | undefined {
  const match = String(ref || '').match(/(MD-\d+_M-\d+)(?:_MI-\d+)?(?=_)/);
  return match ? modules.get(match[1]) : undefined;
}

function cleanRenderedText(value: string): string {
  return stableEtsText(value)
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+([,:;])/g, '$1')
    .replace(/[:;,]\s*$/, '')
    .trim();
}
