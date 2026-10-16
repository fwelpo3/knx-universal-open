import test from 'node:test';
import assert from 'node:assert/strict';
import { knx } from '../../packages/knx-sdk/src/index.ts';

test('SDK facade exposes reusable KNX capabilities without application imports', () => {
  assert.equal(knx.groupAddress.toRaw('1/2/3'), 2563);
  assert.equal(knx.dpt.normalize('1.001'), 'DPST-1-1');
  assert.equal(knx.ets.semanticFunctionName({ Text: 'Licht Büro', FunctionText: 'Ein / Aus' }), 'Licht Büro');
  assert.equal(
    knx.engineering.classifyFunctionalGroup(
      { configSnapshot: { description: 'Heizungsaktor' } },
      { name: 'Status' },
    ),
    'hvac',
  );
});

test('SDK exposes ETS source builder and archive layout discovery', () => {
  const layout = knx.ets.archive.discoverLayout(['P-TEST/0.xml']);
  assert.equal(layout.projectFile, 'P-TEST/0.xml');
  const project = knx.ets.source.buildProject({ devices: [], groupAddresses: [], variants: [] });
  assert.equal(project.schemaVersion, 1);
});

test('SDK maps ETS source DTOs into the canonical KNX model', () => {
  const source = knx.ets.source.buildProject({ devices: [], groupAddresses: [], variants: [] });
  const project = knx.project.fromEtsSource(source);
  assert.equal(project.schemaVersion, 1);
  assert.deepEqual(project.devices, []);
});
