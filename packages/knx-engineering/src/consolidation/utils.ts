import type {
  ConsolidationDirection,
  ConsolidationMember,
  ConsolidationStatus,
} from './types.ts';

export function normalizeConsolidationText(value: string): string {
  return String(value || '').trim().toLocaleLowerCase('de-DE').replace(/\s+/g, ' ');
}

export function normalizeConsolidationDpt(value: string): string {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/(?:DPST-|DPT-)?(\d+)[.\-](\d+)/);
  return match ? `${Number(match[1])}.${String(Number(match[2])).padStart(3, '0')}` : raw;
}

export function groupConsolidationBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    map.set(key, [...(map.get(key) || []), item]);
  }
  return map;
}

export function distinctConsolidationDevices(items: ConsolidationMember[]): number {
  return new Set(items.map((member) => member.deviceId).filter(Boolean)).size;
}

export function hasRepeatedConsolidationDevice(items: ConsolidationMember[]): boolean {
  const ids = items.map((item) => item.deviceId).filter(Boolean);
  return new Set(ids).size !== ids.length;
}

export function sharedConsolidationGa(items: ConsolidationMember[]): string {
  const first = items[0]?.linkedGas || [];
  return first.find((ga) => items.every((item) => item.linkedGas.includes(ga))) || '';
}

export function linkedGaConflict(items: ConsolidationMember[]): boolean {
  const linked = items.filter((item) => item.linkedGas.length > 0);
  if (linked.length < 2) return false;
  const first = linked[0].linkedGas;
  return !first.some((ga) => linked.every((item) => item.linkedGas.includes(ga)));
}

export function sameNonEmpty(values: string[]): boolean {
  return values.length > 1 && values.every(Boolean) && new Set(values).size === 1;
}

export function sameCompatible(values: string[]): boolean {
  const used = values.filter(Boolean);
  return used.length === 0 || new Set(used).size === 1;
}

export function isGenericConsolidationName(name: string): boolean {
  const generic = new Set([
    'schalten', 'status', 'wert', 'eingang', 'ausgang', 'temperatur',
    'präsenz', 'praesenz', 'helligkeit', 'dimmen', 'jalousie', 'licht',
  ]);
  const words = name.split(/[^a-z0-9äöüß]+/i).filter(Boolean);
  return words.length <= 1 || words.every((word) => generic.has(word));
}

export function flagEnabled(value: string): boolean {
  return /^(enabled|enable|true|1|yes|on)$/i.test(String(value || '').trim());
}

export function objectDirection(transmit: string, write: string, update: string): ConsolidationDirection {
  const tx = flagEnabled(transmit);
  const rx = flagEnabled(write) || flagEnabled(update);
  if (tx && rx) return 'bidirectional';
  if (tx) return 'producer';
  if (rx) return 'consumer';
  return 'unknown';
}

export function productObjectSignature(member: ConsolidationMember): string {
  return [member.variantId || member.articleNumber, member.objectRef || member.objectNumber]
    .map(normalizeConsolidationText).join('|');
}

export function hasComplementaryDirections(items: ConsolidationMember[]): boolean {
  const dirs = new Set(items.map((item) => item.direction));
  const producers = dirs.has('producer') || dirs.has('bidirectional');
  const consumers = dirs.has('consumer') || dirs.has('bidirectional');
  return producers && consumers;
}

export function consolidationStatusOrder(status: ConsolidationStatus): number {
  return status === 'confirmed' ? 0 : status === 'review' ? 1 : 2;
}

export function consolidationHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
