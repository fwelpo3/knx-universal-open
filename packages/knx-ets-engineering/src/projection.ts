import type { EtsSourceCommunicationObject, EtsSourceDevice } from '../../knx-ets/src/index.ts';
import type {
  EngineeringCommunicationObject,
  EngineeringFunctionDefinition,
  GaPlanningFunction,
  GaPlanningInstance,
} from '../../knx-engineering/src/index.ts';
import { importedEtsObjectNames, type EtsObjectNameMode } from './naming.ts';

function clean(value: unknown): string { return String(value ?? '').trim().replace(/\s+/g, ' '); }

export interface EtsEngineeringDefinitionOptions {
  id: string;
  label: string;
  objects: EtsSourceCommunicationObject[];
  nameMode?: EtsObjectNameMode;
}

export function etsObjectsToEngineeringDefinition(options: EtsEngineeringDefinitionOptions): EngineeringFunctionDefinition {
  const names = importedEtsObjectNames(options.objects, options.nameMode || 'smart');
  return {
    id: options.id,
    label: options.label,
    slots: options.objects.map((object, index) => ({
      id: `${options.id}:${index}:${index}`,
      name: names[index],
      datapointType: object.datapointType || undefined,
      offset: index,
      role: inferRole(object),
      matchHints: {
        exactObject: {
          number: clean(object.number),
          name: clean(object.text || object.name),
          functionText: clean(object.functionText),
          objectSize: clean(object.objectSize),
          datapointTypeLabel: clean(object.datapointTypeLabel || object.datapointType),
        },
      },
    })),
  };
}

export interface EtsPlanningInstanceOptions {
  id?: string;
  type: string;
  label?: string;
  description?: string;
  middleGroup: number;
  feedbackMiddleGroup?: number;
  objects?: EtsSourceCommunicationObject[];
  nameMode?: EtsObjectNameMode;
}

export function etsDeviceToGaPlanningInstance(device: EtsSourceDevice, options: EtsPlanningInstanceOptions): GaPlanningInstance {
  const objects = options.objects || device.communicationObjects || [];
  const names = importedEtsObjectNames(objects, options.nameMode || 'smart');
  return {
    id: options.id || `${device.id}:${options.type}`,
    type: options.type,
    label: options.label || options.description || device.productName || device.name,
    description: options.description || device.productName || device.name,
    middleGroup: options.middleGroup,
    feedbackMiddleGroup: options.feedbackMiddleGroup,
    source: {
      imported: true,
      deviceId: device.id,
      physicalAddress: device.topology.physicalAddress,
      deviceAddress: device.topology.deviceAddress,
      deviceName: device.name,
      productName: device.productName,
      article: device.orderNumber,
      manufacturer: device.manufacturer,
      areaId: device.topology.areaId,
      areaName: device.topology.areaName,
      areaAddress: device.topology.areaAddress,
      mainLineId: device.topology.mainLineId,
      mainLineName: device.topology.mainLineName,
      mainLineAddress: device.topology.mainLineAddress,
      lineId: device.topology.lineId,
      lineName: device.topology.lineName,
      lineAddress: device.topology.lineAddress,
      topologyPath: device.topology.path?.join(' / '),
    },
    functions: objects.map((object, index) => objectToPlanningFunction(object, names[index], index)),
  };
}

export function etsObjectToEngineeringCommunicationObject(object: EtsSourceCommunicationObject): EngineeringCommunicationObject {
  return {
    ref: object.id,
    Number: object.number,
    Text: object.text || object.name,
    Name: object.name,
    FunctionText: object.functionText,
    etsGroupPath: object.etsGroupPath,
  };
}

function objectToPlanningFunction(object: EtsSourceCommunicationObject, name: string, offset: number): GaPlanningFunction {
  return {
    name,
    datapointType: object.datapointType || '',
    offset,
    enabled: true,
    role: inferRole(object),
    source: {
      objectNumber: object.number,
      objectRef: object.id,
      objectName: clean(object.text || object.name),
      objectFunctionText: clean(object.functionText),
      objectDescription: clean(object.description),
      channelName: object.channelName,
      channelId: object.channelId,
      datapointTypeLabel: object.datapointTypeLabel,
      objectSize: object.objectSize,
      communicationFlag: object.flags?.communication,
      readFlag: object.flags?.read,
      writeFlag: object.flags?.write,
      transmitFlag: object.flags?.transmit,
      updateFlag: object.flags?.update,
      readOnInitFlag: object.flags?.readOnInit,
      priority: object.priority,
      links: object.groupAddressRefs ? [...object.groupAddressRefs] : undefined,
      linkedGroupAddresses: object.linkedGroupAddresses?.map((link) => ({ ...link })),
    },
  };
}

function inferRole(object: EtsSourceCommunicationObject): 'command' | 'feedback' | 'unknown' {
  const text = [object.text, object.name, object.functionText, object.description].filter(Boolean).join(' ').toLowerCase();
  if (/status|rückmeld|rueckmeld|feedback|istwert|actual/.test(text)) return 'feedback';
  const transmit = /enabled|true|1/i.test(object.flags?.transmit || '');
  const write = /enabled|true|1/i.test(object.flags?.write || '');
  if (transmit && !write) return 'feedback';
  if (write) return 'command';
  return 'unknown';
}
