import type {
  PatternStableIdentity,
  PatternVariantChannel,
  PatternVariantIdentity,
  PatternVariantModule,
  PatternVariantParameterValue,
} from './types.ts';

const STABLE_IDENTITY_FIELDS: Array<keyof PatternStableIdentity> = [
  'manufacturerId',
  'catalogItemId',
  'productRefId',
  'hardwareId',
  'hardware2ProgramRefId',
  'applicationProgramId',
  'applicationProgramRefId',
  'applicationNumber',
  'applicationVersion',
  'hardwareSerialNumber',
  'hardwareVersionNumber',
  'orderNumber',
];

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Preserve exact source identifiers while removing empty values; never infer missing IDs. */
export function normalizePatternStableIdentity(input: PatternStableIdentity): PatternStableIdentity {
  const out: PatternStableIdentity = {};
  for (const field of STABLE_IDENTITY_FIELDS) {
    const value = clean(input[field]);
    if (value !== undefined) out[field] = value;
  }
  return out;
}

export function patternStableIdentityKey(input: PatternStableIdentity): string {
  const identity = normalizePatternStableIdentity(input);
  return STABLE_IDENTITY_FIELDS
    .filter((field) => identity[field] !== undefined)
    .map((field) => `${field}=${identity[field]}`)
    .join(';');
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function normalizedParameters(values: readonly PatternVariantParameterValue[]): PatternVariantParameterValue[] {
  return values
    .map(({ parameterRef, value }) => ({ parameterRef: parameterRef.trim(), value: String(value).trim() }))
    .filter(({ parameterRef }) => Boolean(parameterRef))
    .sort((a, b) => a.parameterRef.localeCompare(b.parameterRef) || a.value.localeCompare(b.value));
}

function normalizedModules(values: readonly PatternVariantModule[]): PatternVariantModule[] {
  return values
    .map((item) => ({
      moduleRef: item.moduleRef.trim(),
      ...(item.instanceRef?.trim() ? { instanceRef: item.instanceRef.trim() } : {}),
      ...(item.objectNumberBase !== undefined ? { objectNumberBase: item.objectNumberBase } : {}),
    }))
    .filter(({ moduleRef }) => Boolean(moduleRef))
    .sort((a, b) => a.moduleRef.localeCompare(b.moduleRef) || String(a.instanceRef || '').localeCompare(String(b.instanceRef || '')) || (a.objectNumberBase ?? -1) - (b.objectNumberBase ?? -1));
}

function normalizedChannels(values: readonly PatternVariantChannel[]): PatternVariantChannel[] {
  return values
    .map((item) => ({ channelRef: item.channelRef.trim(), activeObjectRefs: uniqueSorted(item.activeObjectRefs) }))
    .filter(({ channelRef }) => Boolean(channelRef))
    .sort((a, b) => a.channelRef.localeCompare(b.channelRef));
}

export interface CreatePatternVariantIdentityInput {
  activeObjectRefs?: readonly string[];
  resolvedParameters?: readonly PatternVariantParameterValue[];
  modules?: readonly PatternVariantModule[];
  channels?: readonly PatternVariantChannel[];
}

/** Builds a deterministic resolved-variant identity; it performs no recognition/inference. */
export function createPatternVariantIdentity(input: CreatePatternVariantIdentityInput): PatternVariantIdentity {
  const activeObjectRefs = uniqueSorted(input.activeObjectRefs || []);
  const resolvedParameters = normalizedParameters(input.resolvedParameters || []);
  const modules = normalizedModules(input.modules || []);
  const channels = normalizedChannels(input.channels || []);
  const canonicalKey = [
    `active=${activeObjectRefs.join(',') || '-'}`,
    `params=${resolvedParameters.map(({ parameterRef, value }) => `${parameterRef}=${value}`).join(',') || '-'}`,
    `modules=${modules.map(({ moduleRef, instanceRef, objectNumberBase }) => `${moduleRef}@${instanceRef || '-'}#${objectNumberBase ?? '-'}`).join(',') || '-'}`,
    `channels=${channels.map(({ channelRef, activeObjectRefs: refs }) => `${channelRef}[${refs.join(',')}]`).join(',') || '-'}`,
  ].join(';');
  return { activeObjectRefs, resolvedParameters, modules, channels, canonicalKey };
}
