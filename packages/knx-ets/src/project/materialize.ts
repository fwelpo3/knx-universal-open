import { buildEtsSourceProject } from '../source/buildProject.ts';
import type { EtsSourceDevice, EtsSourceDeviceVariant } from '../source/types.ts';
import { parseDevice } from './devices.ts';
import type { KnxprojParseContext } from './context.ts';
import { addDeviceVariant } from './variants.ts';

export async function materializeKnxprojContext(context: KnxprojParseContext) {
  const startedAt = context.now();
  const devices: EtsSourceDevice[] = [];
  const variantBuckets = new Map<string, EtsSourceDeviceVariant>();
  const deviceNodes = [...context.deviceNodesById.values()];

  for (let index = 0; index < deviceNodes.length; index++) {
    const device = parseDevice({
      xml: context.xml,
      node: deviceNodes[index],
      products: context.products,
      hardwareToApplication: context.hardwareToApplication,
      dptLabels: context.dptLabels,
      placements: context.placements,
      groupAddressById: context.groupAddressById,
    });
    devices.push(device);
    addDeviceVariant(variantBuckets, device);
    await reportDeviceProgress(context, index, deviceNodes.length);
  }

  const variants = [...variantBuckets.values()];
  const parseMs = Math.max(0, Math.round(context.now() - startedAt));
  context.report({
    phase: 'complete',
    percent: 100,
    detail: `${devices.length} devices / ${variants.length} variants`,
  });

  return buildEtsSourceProject({
    fileName: context.bootstrap.source.fileName,
    projectId: context.projectId,
    projectName: context.projectName,
    locations: context.locations,
    devices,
    groupAddresses: context.groupAddresses,
    variants,
    stats: { parseMs, deviceCount: devices.length, variantCount: variants.length },
  });
}

async function reportDeviceProgress(
  context: KnxprojParseContext,
  index: number,
  count: number
): Promise<void> {
  const done = index + 1;
  if (done % 24 !== 0 && done !== count) return;
  context.report({
    phase: 'devices',
    percent: 70 + Math.round((done / Math.max(1, count)) * 22),
    detail: `${done}/${count}`,
  });
  await context.scheduler.yield();
}
