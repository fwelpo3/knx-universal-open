import { cleanEtsObjectText } from './text.ts';

export interface EtsApplicationChannelMeta {
  label: string;
  rawLabel: string;
  textParameterRefId: string;
}

export function resolveProjectChannelLabelRaw(
  refId: string,
  channelMeta: ReadonlyMap<string, EtsApplicationChannelMeta>,
  parameterValues: ReadonlyMap<string, string>
): string {
  const meta = channelKeys(refId).map((key) => channelMeta.get(key)).find(Boolean);
  if (!meta) return String(refId || '');
  const instanceValue = resolveTextParameter(meta.textParameterRefId, parameterValues);
  if (instanceValue && /[A-Za-zÄÖÜäöüß]/.test(instanceValue)) return instanceValue;
  return meta.rawLabel || meta.label || String(refId || '');
}

export function resolveProjectChannelLabel(
  refId: string,
  channelMeta: ReadonlyMap<string, EtsApplicationChannelMeta>,
  parameterValues: ReadonlyMap<string, string>
): string {
  const meta = channelKeys(refId).map((key) => channelMeta.get(key)).find(Boolean);
  if (!meta) return cleanEtsObjectText(refId) || 'Kanal';
  const instanceValue = resolveTextParameter(meta.textParameterRefId, parameterValues);
  if (instanceValue && /[A-Za-zÄÖÜäöüß]/.test(instanceValue)) return instanceValue;
  return meta.label || cleanEtsObjectText(refId) || 'Kanal';
}

export function channelKeys(id: string): string[] {
  const keys = [String(id || '')];
  const short = String(id || '').match(/(?:^|_)(CH-[^_]+)$/)?.[1];
  if (short) keys.push(short);
  return [...new Set(keys.filter(Boolean))];
}

export function channelParameterKeys(id: string): string[] {
  const keys = [String(id || '')];
  const short = String(id || '').match(/(?:^|_)((?:U?P)-.+)$/)?.[1];
  if (short) keys.push(short);
  return [...new Set(keys.filter(Boolean))];
}

function resolveTextParameter(
  refId: string,
  values: ReadonlyMap<string, string>
): string {
  if (!refId) return '';
  return channelParameterKeys(refId).map((key) => values.get(key)).find(Boolean) || '';
}
