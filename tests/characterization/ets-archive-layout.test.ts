import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverKnxprojLayout } from '../../packages/knx-ets/src/archive/projectLayout.ts';

test('discovers KNX project, master, hardware and application files deterministically', () => {
  const layout = discoverKnxprojLayout([
    'M-0002/M-0002_A-0001.xml',
    'P-ABC/0.xml',
    'M-0001/Hardware.xml',
    'knx_master.xml',
    'M-0001/M-0001_A-0002.xml',
    'M-0002/Hardware.xml',
  ]);

  assert.deepEqual(layout, {
    projectFile: 'P-ABC/0.xml',
    masterFile: 'knx_master.xml',
    hardwareFiles: ['M-0001/Hardware.xml', 'M-0002/Hardware.xml'],
    applicationFiles: {
      'M-0001_A-0002': 'M-0001/M-0001_A-0002.xml',
      'M-0002_A-0001': 'M-0002/M-0002_A-0001.xml',
    },
  });
});

test('rejects archives without an ETS project structure', () => {
  assert.throws(
    () => discoverKnxprojLayout(['M-0001/Hardware.xml']),
    /Keine lesbare Projektstruktur/
  );
});
