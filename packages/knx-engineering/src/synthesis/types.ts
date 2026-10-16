import type { EngineeringFunctionDefinition, EngineeringFunctionInstance, EngineeringMatchClass } from '../model/types.ts';
import type { DevicePatternResult } from '../patterns/types.ts';

export interface FunctionSynthesisDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: 'UNKNOWN_FUNCTION_PATTERN' | 'REQUIRED_SLOT_UNRESOLVED' | 'AMBIGUOUS_SLOT';
  message: string;
  deviceId: string;
  channelId?: string;
  functionId: string;
  slotId?: string;
  endpointIds?: string[];
}

export interface SynthesizedFunction {
  definition: EngineeringFunctionDefinition;
  instance: EngineeringFunctionInstance;
  sourcePattern: DevicePatternResult;
  matchClass: EngineeringMatchClass;
  diagnostics: FunctionSynthesisDiagnostic[];
}
