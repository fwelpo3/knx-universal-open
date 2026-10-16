import type { KnxDevice } from '../../../knx-model/src/index.ts';
import { deviceFingerprint } from './fingerprint.ts';
import { buildDeviceStructuralSignature } from './signature.ts';
import type { DevicePatternResult, PatternEvidence } from './types.ts';

export interface EngineeringPatternPack {
  schemaVersion: 1;
  id: string;
  version: string;
  vendor?: string;
  description?: string;
  exactPatterns: ExactDevicePattern[];
  applicationFamilyPatterns?: ApplicationFamilyPattern[];
}

export interface ApplicationFamilyPattern {
  id: string;
  manufacturer?: string;
  applicationProgramRef: string;
  channelFunctions: Array<{
    structuralKey: string;
    functionId: string;
  }>;
  source?: string;
}

export interface ExactDevicePattern {
  id: string;
  fingerprint: string;
  functions: Array<{
    functionId: string;
    channelId?: string;
    channelName?: string;
    objectIds?: string[];
  }>;
  source?: string;
}

/** Versioned in-memory registry; persistence/import of pattern packs is intentionally separate. */
export class EngineeringPatternRegistry {
  readonly #exactByFingerprint = new Map<string, ExactDevicePattern[]>();
  readonly #applicationFamilies: ApplicationFamilyPattern[] = [];

  constructor(patterns: ExactDevicePattern[] = []) {
    for (const pattern of patterns) this.registerExact(pattern);
  }

  registerPack(pack: EngineeringPatternPack): void {
    for (const pattern of pack.exactPatterns) this.registerExact(pattern);
    for (const pattern of pack.applicationFamilyPatterns || []) this.registerApplicationFamily(pattern);
  }

  registerApplicationFamily(pattern: ApplicationFamilyPattern): void {
    if (!this.#applicationFamilies.some((item) => item.id === pattern.id)) this.#applicationFamilies.push({ ...pattern, channelFunctions: pattern.channelFunctions.map((item) => ({ ...item })) });
  }

  registerExact(pattern: ExactDevicePattern): void {
    const list = this.#exactByFingerprint.get(pattern.fingerprint) || [];
    if (!list.some((item) => item.id === pattern.id)) list.push(pattern);
    this.#exactByFingerprint.set(pattern.fingerprint, list);
  }

  exactPatterns(): ExactDevicePattern[] {
    return [...this.#exactByFingerprint.values()].flat().map((pattern) => ({ ...pattern, functions: pattern.functions.map((fn) => ({ ...fn, objectIds: fn.objectIds ? [...fn.objectIds] : undefined })) }));
  }

  matchApplicationFamily(device: KnxDevice): DevicePatternResult[] {
    const manufacturer = String(device.manufacturer || '').trim().toLowerCase();
    const appRef = String(device.applicationProgramRef || '').trim();
    const patterns = this.#applicationFamilies.filter((pattern) =>
      pattern.applicationProgramRef === appRef
      && (!pattern.manufacturer || manufacturer.includes(pattern.manufacturer.trim().toLowerCase()))
    );
    if (!patterns.length) return [];
    const signature = buildDeviceStructuralSignature(device);
    const out: DevicePatternResult[] = [];
    for (const pattern of patterns) {
      for (const mapping of pattern.channelFunctions) {
        for (const channel of signature.channels.filter((item) => item.structuralKey === mapping.structuralKey)) {
          out.push({
            patternId: pattern.id,
            functionId: mapping.functionId,
            matchClass: 'family-pattern',
            channelId: channel.id,
            channelName: channel.name,
            endpointRefs: channel.objectIds.map((communicationObjectId) => ({ deviceId: device.id, communicationObjectId })),
            evidence: [
              { kind: 'application', value: device.applicationProgramRef, detail: 'Registered application-family pattern matched.', source: pattern.source },
              ...(device.manufacturer ? [{ kind: 'manufacturer' as const, value: device.manufacturer }] : []),
              { kind: 'object-sequence', value: mapping.structuralKey },
            ],
          });
        }
      }
    }
    return out;
  }

  matchExact(device: KnxDevice): DevicePatternResult[] {
    const fingerprint = deviceFingerprint(device);
    const patterns = this.#exactByFingerprint.get(fingerprint) || [];
    const out: DevicePatternResult[] = [];
    for (const pattern of patterns) {
      const baseEvidence: PatternEvidence[] = [
        { kind: 'application', value: device.applicationProgramRef, detail: 'Exact device fingerprint matched.', source: pattern.source },
      ];
      if (device.manufacturer) baseEvidence.push({ kind: 'manufacturer', value: device.manufacturer });
      if (device.productName || device.name) baseEvidence.push({ kind: 'product', value: device.productName || device.name });
      for (const fn of pattern.functions) {
        const objectIds = fn.objectIds || device.communicationObjects
          .filter((object) => !fn.channelId || object.channel?.id === fn.channelId)
          .map((object) => object.id);
        out.push({
          patternId: pattern.id,
          functionId: fn.functionId,
          matchClass: 'exact-signature',
          channelId: fn.channelId,
          channelName: fn.channelName,
          endpointRefs: objectIds.map((communicationObjectId) => ({ deviceId: device.id, communicationObjectId })),
          evidence: baseEvidence.map((evidence) => ({ ...evidence })),
        });
      }
    }
    return out;
  }
}
