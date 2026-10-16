import assert from 'node:assert/strict';
import test from 'node:test';
import { hydrateEtsProjectDetails } from '../../packages/knx-ets/src/runtime/hydrate.ts';
import { buildEtsSourceProject } from '../../packages/knx-ets/src/source/buildProject.ts';
import type { EtsProjectSession } from '../../packages/knx-ets/src/runtime/session.ts';

const project = buildEtsSourceProject({
  projectName: 'Hydrate Test',
  devices: Array.from({ length: 12 }, (_, index) => ({
    id: `D-${index + 1}`,
    name: `Device ${index + 1}`,
    topology: { physicalAddress: `1.1.${index + 1}` },
    communicationObjects: [],
  })),
  stats: { deviceCount: 12 },
});

test('full ETS hydration is bounded, deterministic and immutable', async () => {
  let active = 0;
  let maxActive = 0;
  const sourceSnapshot = JSON.stringify(project);
  const session: EtsProjectSession = {
    materialize: async () => project,
    loadDeviceDetails: async (deviceId) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return {
        deviceId,
        communicationObjects: [{ id: `${deviceId}-O-1`, name: 'Schalten' }],
      };
    },
  };

  const progress: number[] = [];
  const hydrated = await hydrateEtsProjectDetails(session, project, {
    concurrency: 3,
    onProgress: (event) => progress.push(event.percent || 0),
  });

  assert.ok(maxActive <= 3);
  assert.ok(maxActive > 1);
  assert.equal(JSON.stringify(project), sourceSnapshot, 'source snapshot must not be mutated');
  assert.equal(hydrated.devices.length, 12);
  assert.equal(hydrated.devices[0].id, 'D-1');
  assert.equal(hydrated.devices[0].communicationObjects?.[0].id, 'D-1-O-1');
  assert.equal(progress.at(-1), 100);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(hydrated)));
});
