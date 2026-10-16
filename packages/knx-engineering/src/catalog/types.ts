import type { EngineeringFunctionDefinition, EngineeringFunctionRole } from '../model/types.ts';

export interface EngineeringSlotMatchRule {
  slotId: string;
  dptFamilies?: string[];
  endpointRoles?: Array<'producer' | 'consumer' | 'bidirectional' | 'unknown'>;
  semanticTokensAny?: string[];
  semanticTokensAll?: string[];
  required?: boolean;
  functionRole?: EngineeringFunctionRole;
}

export interface EngineeringFunctionCatalogEntry {
  functionId: string;
  definition: EngineeringFunctionDefinition;
  slotRules: EngineeringSlotMatchRule[];
}
