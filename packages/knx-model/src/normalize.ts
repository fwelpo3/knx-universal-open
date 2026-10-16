import type { KnxProjectModel } from './types.ts';

export function assertSerializableKnxProject(project: KnxProjectModel): void {
  const json = JSON.stringify(project);
  if (!json) throw new Error('KNX project model is not serializable.');
  const parsed = JSON.parse(json) as KnxProjectModel;
  if (parsed.schemaVersion !== 1) throw new Error('Unsupported KNX project schema version.');
  if (!Array.isArray(parsed.locations) || !Array.isArray(parsed.devices) || !Array.isArray(parsed.groupAddresses)) {
    throw new Error('Invalid KNX project collections.');
  }
}

export function normalizeKnxFlag(value?: string | boolean | number | null): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'yes', 'on', 'enabled', 'enable', 'set'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled', 'disable', 'unset'].includes(normalized)) return false;
  return undefined;
}
