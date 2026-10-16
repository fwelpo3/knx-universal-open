import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPdePlan,
  exportProjectDataExchange,
  type PdeGaInputRow,
  type PdeSourceSnapshot,
} from '../../packages/knx-pde/src/index.ts';

const source: PdeSourceSnapshot = {
  schemaVersion: 1,
  sourceFileName: 'test.knxproj', projectId: 'p1', projectName: 'Test', groupAddressStyle: 'ThreeLevel',
  projectStart: '', productDataLanguage: 'de-DE', lastUsedPuid: 100,
  devices: {
    d1: {
      sourceId: 'd1', puid: 10, physicalAddress: '1.1.10', localAddress: '10', name: 'Aktor',
      manufacturerId: 'M-1', lastModified: '', hardware2ProgramRefId: 'M-1_H-1-1-1_HP-0000', orderNumber: 'A1',
      applicationName: 'App', productName: 'Aktor',
      area: { puid: 1, address: '1', name: 'Bereich 1' },
      line: { puid: 2, address: '1', name: 'Linie 1' },
      objects: {
        ko1: {
          ref: 'ko1', number: '1', channelName: 'A', text: 'Schalten', functionText: '', description: '',
          dpt: 'DPST-1-1', objectSize: '1 Bit', priority: 'Low', communicationFlag: 'Enabled', readFlag: 'Disabled',
          writeFlag: 'Enabled', transmitFlag: 'Disabled', updateFlag: 'Disabled', readOnInitFlag: 'Disabled', existingLinks: [],
        },
      },
    },
  },
  groupAddresses: {}, groupRanges: {},
};

const rows: PdeGaInputRow[] = [
  { level: 'main', mainGroup: 1, name: 'EG' },
  { level: 'middle', mainGroup: 1, middleGroup: 0, name: 'Beleuchtung' },
  { level: 'ga', mainGroup: 1, middleGroup: 0, sub: 1, name: 'EG Büro Licht', datapointType: '1.001', targets: [{ deviceId: 'd1', objectRef: 'ko1', objectNumber: '1' }] },
];

test('PDE planning links generated GA to exact communication object', () => {
  const plan = buildPdePlan(rows, structuredClone(source));
  assert.equal(plan.groupAddresses.length, 1);
  const device = plan.areas[0].lines[0].devices[0];
  assert.equal(device.objects.length, 1);
  assert.deepEqual(device.objects[0].connectors.map((item) => item.kind), ['Send']);
});

test('PDE export is deterministic and contains generated group address/connectors', () => {
  const result = exportProjectDataExchange(rows, structuredClone(source));
  assert.equal(result.groupAddressCount, 1);
  assert.equal(result.deviceCount, 1);
  assert.equal(result.objectCount, 1);
  assert.equal(result.connectorCount, 1);
  assert.match(result.xml, /<GroupAddress[^>]+Name="EG Büro Licht"/);
  assert.match(result.xml, /<Send GroupAddressRefId="\$PUID-GA-/);
});
