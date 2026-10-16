import { normalizeDptId } from '../../../knx-core/src/index.ts';
import type { KnxCommunicationObject } from '../../../knx-model/src/index.ts';

const STOP_WORDS = new Set([
  'kanal', 'channel', 'objekt', 'object', 'communication', 'kommunikationsobjekt',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '1', '2', '3', '4', '5', '6', '7', '8',
]);

export function normalizeSemanticText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function semanticTokens(...values: unknown[]): string[] {
  const tokens = normalizeSemanticText(values.filter(Boolean).join(' '))
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  return [...new Set(tokens)].sort();
}

export function dptFamily(value: unknown): string | undefined {
  const normalized = normalizeDptId(String(value ?? ''));
  const match = normalized.match(/^(?:DPST|DPT)-(\d+)/i);
  return match ? `DPT-${Number(match[1])}` : undefined;
}

export function communicationRole(object: KnxCommunicationObject): 'producer' | 'consumer' | 'bidirectional' | 'unknown' {
  const receive = object.flags?.write === true || object.flags?.update === true;
  const send = object.flags?.transmit === true || object.flags?.read === true;
  if (receive && send) return 'bidirectional';
  if (send) return 'producer';
  if (receive) return 'consumer';
  return 'unknown';
}
