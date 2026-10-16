import type { KnxProjectModel } from '../../../knx-model/src/index.ts';
import { detectCommunicationObjectCapabilities } from './capabilities.ts';
import { recognizeDevicePatterns } from '../patterns/devicePatterns.ts';
import type { EngineeringPatternRegistry } from '../patterns/registry.ts';
import type { EngineeringAnalysisReport } from './types.ts';

export function analyzeKnxProject(project: KnxProjectModel, registry?: EngineeringPatternRegistry): EngineeringAnalysisReport {
  const diagnostics: EngineeringAnalysisReport['diagnostics'] = [];
  const devices = project.devices.map((device) => {
    const endpoints = device.communicationObjects.map((object) => {
      const capabilities = detectCommunicationObjectCapabilities(object);
      if (capabilities.every((item) => item.matchClass === 'candidate')) {
        diagnostics.push({
          severity: 'info',
          code: 'NO_DETERMINISTIC_SEMANTIC_PATTERN',
          message: 'Kommunikationsobjekt hat nur generische Kandidaten und noch kein eindeutiges semantisches Muster.',
          deviceId: device.id,
          communicationObjectId: object.id,
        });
      }
      return {
        endpoint: { deviceId: device.id, communicationObjectId: object.id },
        label: object.text || object.name || object.functionText || `KO ${object.number || ''}`.trim(),
        datapointType: object.datapointType,
        capabilities,
      };
    });
    return {
      deviceId: device.id,
      label: device.name,
      endpoints,
      capabilityIds: [...new Set(endpoints.flatMap((endpoint) => endpoint.capabilities.map((item) => item.id)))].sort(),
      patterns: recognizeDevicePatterns(device, registry),
    };
  });
  return { schemaVersion: 1, devices, diagnostics };
}
