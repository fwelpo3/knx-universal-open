import test from 'node:test';
import assert from 'node:assert/strict';
import { etsSourceToKnxProject } from '../../packages/knx-ets/src/mapping/toKnxProject.ts';

test('ETS source maps to a source-independent KNX model', () => {
  const project = etsSourceToKnxProject({
    schemaVersion: 1,
    source: 'knxproj',
    projectId: 'P1',
    projectName: 'Haus',
    devices: [{
      id: 'D1',
      name: 'Aktor',
      productName: 'Schaltaktor',
      topology: { physicalAddress: '1.1.10', areaName: 'Bereich 1', lineName: 'Linie 1' },
      communicationObjects: [{
        id: 'O1', number: '1', text: 'Schalten', datapointType: 'DPT-1',
        flags: { write: 'Enabled', read: 'Disabled' },
        linkedGroupAddresses: [{ address: '1/0/1', name: 'Licht' }],
      }],
    }],
    groupAddresses: [{ id: 'GA1', name: 'Licht', address: '1/0/1', datapointType: 'DPT-1' }],
    variants: [],
    stats: { deviceCount: 1, variantCount: 0 },
  });

  assert.equal(project.schemaVersion, 1);
  assert.equal(project.devices[0].topology.physicalAddress, '1.1.10');
  assert.equal(project.devices[0].communicationObjects[0].flags?.write, true);
  assert.equal(project.devices[0].communicationObjects[0].flags?.read, false);
  assert.deepEqual(project.devices[0].communicationObjects[0].groupAddresses, ['1/0/1']);
  assert.equal(project.devices[0].source?.source, 'ets');
  assert.doesNotThrow(() => JSON.stringify(project));
});
