import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEtsSourceProject } from '../../packages/knx-ets/src/source/buildProject.ts';

test('builds deterministic serializable ETS source projects', () => {
  const links = [{ address: '1/2/3', name: 'Licht Status' }];
  const project = buildEtsSourceProject({
    fileName: 'demo.knxproj',
    devices: [
      {
        id: 'D2', name: 'D2', topology: { physicalAddress: '1.1.20' },
      },
      {
        id: 'D1', name: 'D1', topology: { physicalAddress: '1.1.2' },
        communicationObjects: [{ id: 'O1', linkedGroupAddresses: links }],
      },
    ],
    groupAddresses: [
      { name: 'B', address: '2/0/1' },
      { name: 'A', address: '1/7/255' },
    ],
    variants: [
      { id: 'v2', activeObjectCount: 2, deviceIds: ['D2', 'D1'] },
      { id: 'v1', activeObjectCount: 1, deviceIds: ['D1'] },
    ],
  });

  assert.deepEqual(project.devices.map((d) => d.id), ['D1', 'D2']);
  assert.deepEqual(project.groupAddresses.map((ga) => ga.address), ['1/7/255', '2/0/1']);
  assert.deepEqual(project.variants.map((v) => v.id), ['v1', 'v2']);
  assert.deepEqual(project.variants[1].deviceIds, ['D1', 'D2']);
  assert.equal(project.stats.deviceCount, 2);
  assert.equal(project.stats.variantCount, 2);
  assert.doesNotThrow(() => JSON.stringify(project));

  links[0].name = 'mutated outside';
  assert.equal(project.devices[0].communicationObjects?.[0].linkedGroupAddresses?.[0].name, 'Licht Status');
});
