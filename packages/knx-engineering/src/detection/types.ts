import type { EngineeringEndpointRef, EngineeringMatchClass } from '../model/types.ts';
import type { DevicePatternResult } from '../patterns/types.ts';

export interface EngineeringEvidence {
  kind: 'name' | 'dpt' | 'flags' | 'channel' | 'device' | 'rule' | 'pattern' | 'manufacturer' | 'application' | 'repeated-structure';
  value?: string;
  detail?: string;
  source?: string;
}

export interface DetectedCapability {
  id: string;
  matchClass: EngineeringMatchClass;
  role: 'producer' | 'consumer' | 'bidirectional' | 'unknown';
  patternId?: string;
  evidence: EngineeringEvidence[];
}

export interface EndpointAnalysis {
  endpoint: EngineeringEndpointRef;
  label: string;
  datapointType?: string;
  capabilities: DetectedCapability[];
}

export interface DeviceEngineeringAnalysis {
  deviceId: string;
  label: string;
  endpoints: EndpointAnalysis[];
  capabilityIds: string[];
  patterns: DevicePatternResult[];
}

export interface EngineeringAnalysisReport {
  schemaVersion: 1;
  devices: DeviceEngineeringAnalysis[];
  diagnostics: EngineeringAnalysisDiagnostic[];
}

export interface EngineeringAnalysisDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  deviceId?: string;
  communicationObjectId?: string;
}
