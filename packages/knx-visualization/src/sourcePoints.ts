import type { RecognitionObject } from '../../knx-engineering/src/index.ts';
import { objectFlowDirection } from '../../knx-engineering/src/index.ts';
import type { VisualizationDeviceInput, VisualizationPoint } from './types.ts';
import type { RecognitionKeywordConfig } from '../../knx-engineering/src/index.ts';

function objectName(object: RecognitionObject): string {
  return [object.name, object.functionText].filter(Boolean).join(' - ');
}

export function visualizationPointsFromObjects(
  objects: RecognitionObject[],
  context: Omit<VisualizationDeviceInput, 'objects'> = { deviceId: '' },
  config?: RecognitionKeywordConfig,
): VisualizationPoint[] {
  const points: VisualizationPoint[] = [];
  for (const object of objects) {
    const linked: { address: string; name?: string; dpt?: string; path?: string[] }[] = object.linkedGroups?.length
      ? object.linkedGroups
      : (object.linkedGroupAddresses || []).map((address) => ({ address }));
    const base = {
      deviceId: context.deviceId || undefined,
      physicalAddress: context.physicalAddress,
      deviceName: context.deviceName,
      productName: context.productName,
      room: context.room,
      roomType: context.roomType,
      channelLabel: context.channelLabel,
      channelId: object.channelId,
      moduleInstance: object.moduleInstance,
      sourceOrder: object.sourceOrder,
      objectNumber: object.number,
      activeByProject: object.activeByProject,
      buildingFunctions: object.buildingFunctions ? object.buildingFunctions.map((fn) => ({ ...fn })) : undefined,
      objectName: objectName(object),
      functionText: object.functionText,
      dpt: object.dpt,
      objectDpt: object.dpt,
      direction: objectFlowDirection(object, config),
      keywordConfig: config,
      flags: object.flags ? { ...object.flags } : undefined,
      groupPath: object.groupPath ? object.groupPath.map((item) => ({ ...item })) : undefined,
    };
    if (!linked.length) {
      points.push({ key: object.key, ...base });
      continue;
    }
    linked.forEach((ga, index) => points.push({
      key: `${object.key}@${ga.address || index}`,
      ...base,
      groupAddress: ga.address,
      groupName: ga.name,
      groupAddressPath: ga.path ? [...ga.path] : undefined,
      dpt: object.dpt || ga.dpt,
      groupAddressDpt: ga.dpt,
    }));
  }
  return points;
}

export function visualizationPointsFromDevices(inputs: VisualizationDeviceInput[], config?: RecognitionKeywordConfig): VisualizationPoint[] {
  return inputs.flatMap((input) => visualizationPointsFromObjects(input.objects, input, config));
}
