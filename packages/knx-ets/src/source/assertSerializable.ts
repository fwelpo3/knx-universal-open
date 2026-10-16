import type { EtsSourceProject } from './types.ts';

/**
 * Runtime guard for the most important cross-language contract property:
 * parser output must remain JSON serializable and must not contain cyclic data.
 */
export function assertSerializableEtsSourceProject(project: EtsSourceProject): void {
  const text = JSON.stringify(project);
  if (!text) throw new Error('ETS source project is not serializable.');
  const parsed = JSON.parse(text) as EtsSourceProject;
  if (parsed.schemaVersion !== 1 || parsed.source !== 'knxproj') {
    throw new Error('Invalid ETS source project contract.');
  }
  if ((parsed.locations !== undefined && !Array.isArray(parsed.locations)) || !Array.isArray(parsed.devices) || !Array.isArray(parsed.groupAddresses) || !Array.isArray(parsed.variants)) {
    throw new Error('Invalid ETS source project collections.');
  }
}
