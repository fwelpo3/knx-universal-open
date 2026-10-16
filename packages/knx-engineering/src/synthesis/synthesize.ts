import type { KnxCommunicationObject, KnxDevice, KnxProjectModel } from '../../../knx-model/src/index.ts';
import { defaultFunctionCatalogEntry, DEFAULT_FUNCTION_CATALOG } from '../catalog/defaultCatalog.ts';
import type { EngineeringFunctionCatalogEntry, EngineeringSlotMatchRule } from '../catalog/types.ts';
import type { EngineeringEndpointBinding, EngineeringFunctionDefinition, EngineeringFunctionInstance } from '../model/types.ts';
import { communicationRole, dptFamily, semanticTokens } from '../patterns/normalize.ts';
import { recognizeDevicePatterns } from '../patterns/devicePatterns.ts';
import type { EngineeringPatternRegistry } from '../patterns/registry.ts';
import type { DevicePatternResult } from '../patterns/types.ts';
import type { FunctionSynthesisDiagnostic, SynthesizedFunction } from './types.ts';

function endpointObjects(device: KnxDevice, pattern: DevicePatternResult): KnxCommunicationObject[] {
  const ids = new Set(pattern.endpointRefs.map((item) => item.communicationObjectId));
  return device.communicationObjects.filter((object) => ids.has(object.id));
}

function ruleBaseCandidates(objects: KnxCommunicationObject[], rule: EngineeringSlotMatchRule): KnxCommunicationObject[] {
  return objects.filter((object) => {
    if (rule.dptFamilies?.length && !rule.dptFamilies.includes(dptFamily(object.datapointType) || '')) return false;
    if (rule.endpointRoles?.length && !rule.endpointRoles.includes(communicationRole(object))) return false;
    return true;
  });
}

function tokenMatches(object: KnxCommunicationObject, rule: EngineeringSlotMatchRule): boolean {
  const tokens = semanticTokens(object.name, object.text, object.functionText, object.description);
  if (rule.semanticTokensAll?.length && !rule.semanticTokensAll.every((needle) => tokens.some((token) => token.startsWith(needle)))) return false;
  if (rule.semanticTokensAny?.length && !rule.semanticTokensAny.some((needle) => tokens.some((token) => token.startsWith(needle)))) return false;
  return true;
}

function resolveSlot(objects: KnxCommunicationObject[], rule: EngineeringSlotMatchRule): { object?: KnxCommunicationObject; ambiguous?: KnxCommunicationObject[] } {
  const base = ruleBaseCandidates(objects, rule);
  if (!base.length) return {};

  const semantic = (rule.semanticTokensAny?.length || rule.semanticTokensAll?.length)
    ? base.filter((object) => tokenMatches(object, rule))
    : base;

  if (semantic.length === 1) return { object: semantic[0] };
  if (semantic.length > 1) return { ambiguous: semantic };

  // Safe fallback: if DPT + direction alone leaves exactly one endpoint, use it.
  if (base.length === 1) return { object: base[0] };
  if (base.length > 1 && rule.required) return { ambiguous: base };
  return {};
}

function cloneDefinition(definition: EngineeringFunctionDefinition): EngineeringFunctionDefinition {
  return {
    ...definition,
    capabilities: definition.capabilities ? [...definition.capabilities] : undefined,
    slots: definition.slots.map((slot) => ({
      ...slot,
      capabilities: slot.capabilities ? [...slot.capabilities] : undefined,
      matchHints: slot.matchHints ? { exactObject: slot.matchHints.exactObject ? { ...slot.matchHints.exactObject } : undefined } : undefined,
    })),
  };
}

export function synthesizeDeviceFunction(
  device: KnxDevice,
  pattern: DevicePatternResult,
  catalog: readonly EngineeringFunctionCatalogEntry[] = DEFAULT_FUNCTION_CATALOG,
  locationId?: string,
): SynthesizedFunction | null {
  const entry = catalog.find((item) => item.functionId === pattern.functionId) || defaultFunctionCatalogEntry(pattern.functionId);
  if (!entry) return null;

  const objects = endpointObjects(device, pattern);
  const bindings: EngineeringEndpointBinding[] = [];
  const diagnostics: FunctionSynthesisDiagnostic[] = [];

  for (const rule of entry.slotRules) {
    const resolved = resolveSlot(objects, rule);
    if (resolved.object) {
      bindings.push({
        slotId: rule.slotId,
        endpoint: { deviceId: device.id, communicationObjectId: resolved.object.id },
        method: pattern.matchClass === 'exact-signature' ? 'exact' : 'rule',
        matchClass: pattern.matchClass,
        evidence: pattern.evidence.map((item) => ({ kind: item.kind, detail: item.detail || item.value, source: item.source })),
      });
      continue;
    }
    if (resolved.ambiguous?.length) {
      diagnostics.push({
        severity: 'warning', code: 'AMBIGUOUS_SLOT',
        message: `Slot '${rule.slotId}' has multiple valid endpoints and was not auto-bound.`,
        deviceId: device.id, channelId: pattern.channelId, functionId: pattern.functionId, slotId: rule.slotId,
        endpointIds: resolved.ambiguous.map((object) => object.id),
      });
    } else if (rule.required) {
      diagnostics.push({
        severity: 'warning', code: 'REQUIRED_SLOT_UNRESOLVED',
        message: `Required slot '${rule.slotId}' could not be resolved.`,
        deviceId: device.id, channelId: pattern.channelId, functionId: pattern.functionId, slotId: rule.slotId,
      });
    }
  }

  const instance: EngineeringFunctionInstance = {
    id: `${device.id}:${pattern.channelId || 'device'}:${pattern.functionId}`,
    definitionId: entry.definition.id,
    label: pattern.channelName || device.productName || device.name,
    locationId,
    bindings,
  };
  return { definition: cloneDefinition(entry.definition), instance, sourcePattern: pattern, matchClass: pattern.matchClass, diagnostics };
}

function deviceLocation(project: KnxProjectModel, deviceId: string): string | undefined {
  return project.locations.find((location) => location.deviceIds.includes(deviceId))?.id;
}

export interface SynthesizedEngineeringProject {
  schemaVersion: 1;
  definitions: EngineeringFunctionDefinition[];
  instances: EngineeringFunctionInstance[];
  synthesized: SynthesizedFunction[];
  diagnostics: FunctionSynthesisDiagnostic[];
}

export function synthesizeProjectFunctions(
  project: KnxProjectModel,
  registry?: EngineeringPatternRegistry,
  catalog: readonly EngineeringFunctionCatalogEntry[] = DEFAULT_FUNCTION_CATALOG,
): SynthesizedEngineeringProject {
  const synthesized: SynthesizedFunction[] = [];
  const diagnostics: FunctionSynthesisDiagnostic[] = [];

  for (const device of project.devices) {
    const patterns = recognizeDevicePatterns(device, registry);
    for (const pattern of patterns) {
      const item = synthesizeDeviceFunction(device, pattern, catalog, deviceLocation(project, device.id));
      if (!item) {
        diagnostics.push({
          severity: 'info', code: 'UNKNOWN_FUNCTION_PATTERN',
          message: `Pattern '${pattern.functionId}' has no function-catalog entry.`,
          deviceId: device.id, channelId: pattern.channelId, functionId: pattern.functionId,
        });
        continue;
      }
      synthesized.push(item);
      diagnostics.push(...item.diagnostics);
    }
  }

  const definitions = new Map<string, EngineeringFunctionDefinition>();
  for (const item of synthesized) definitions.set(item.definition.id, item.definition);
  return {
    schemaVersion: 1,
    definitions: [...definitions.values()].sort((a, b) => a.id.localeCompare(b.id)),
    instances: synthesized.map((item) => item.instance).sort((a, b) => a.id.localeCompare(b.id)),
    synthesized,
    diagnostics,
  };
}
