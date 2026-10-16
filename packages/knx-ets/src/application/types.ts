import type { EtsApplicationChannelMeta } from '../parser/channelResolution.ts';
import type { EtsModuleInstanceMeta } from '../parser/moduleResolution.ts';
import type { EtsObjectGroupPathItem } from '../parser/applicationGroups.ts';

export interface EtsApplicationObjectDefinition {
  id?: string;
  refId?: string;
  number?: string;
  name?: string;
  text?: string;
  functionText?: string;
  description?: string;
  datapointType?: string;
  objectSize?: string;
  priority?: string;
  textParameterRefId?: string;
  links?: string[];
  flags?: {
    communication?: string;
    read?: string;
    write?: string;
    transmit?: string;
    update?: string;
    readOnInit?: string;
  };
  etsGroupPath?: EtsObjectGroupPathItem[];
}

/** Runtime-only lookup index. Maps are intentional here and never cross the public source DTO boundary. */
export interface EtsApplicationProgramIndex {
  applicationId: string;
  objects: Map<string, EtsApplicationObjectDefinition>;
  channelMeta: Map<string, EtsApplicationChannelMeta>;
  moduleInstances: Map<string, EtsModuleInstanceMeta>;
}
