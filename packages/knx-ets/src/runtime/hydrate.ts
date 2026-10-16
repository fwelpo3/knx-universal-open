import type { EtsProgressSink } from '../ports/execution.ts';
import { buildEtsSourceProject } from '../source/buildProject.ts';
import type { EtsSourceDevice, EtsSourceProject } from '../source/types.ts';
import type { EtsProjectSession } from './session.ts';

export interface HydrateEtsProjectOptions {
  /** Bounded worker count. Defaults to 8 and is clamped to 1..32. */
  concurrency?: number;
  onProgress?: EtsProgressSink;
}

/**
 * Materialize all lazy device communication-object details into a new serializable snapshot.
 * The input project is never mutated and output ordering remains deterministic.
 */
export async function hydrateEtsProjectDetails(
  session: EtsProjectSession,
  project: EtsSourceProject,
  options: HydrateEtsProjectOptions = {}
): Promise<EtsSourceProject> {
  if (!session.loadDeviceDetails) {
    throw new Error('Diese ETS-Session unterstützt keine Geräte-Detailauflösung.');
  }

  const concurrency = clampConcurrency(options.concurrency ?? 8);
  const report = options.onProgress || (() => {});
  const devices = new Array<EtsSourceDevice>(project.devices.length);
  let cursor = 0;
  let completed = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= project.devices.length) return;
      const device = project.devices[index];
      const details = await session.loadDeviceDetails!(device.id);
      devices[index] = {
        ...device,
        communicationObjects: details.communicationObjects.map((object) => ({ ...object })),
      };
      completed++;
      report({
        phase: 'device-details',
        percent: Math.round((completed / Math.max(1, project.devices.length)) * 100),
        detail: `${completed}/${project.devices.length}`,
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, project.devices.length)) }, () => worker())
  );

  return buildEtsSourceProject({
    fileName: project.fileName,
    projectId: project.projectId,
    projectName: project.projectName,
    devices,
    groupAddresses: project.groupAddresses,
    variants: project.variants,
    stats: project.stats,
  });
}

function clampConcurrency(value: number): number {
  const normalized = Number.isFinite(value) ? Math.floor(value) : 8;
  return Math.max(1, Math.min(32, normalized));
}
