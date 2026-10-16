import test from 'node:test';
import assert from 'node:assert/strict';
import { composeVisualizationCards, detectVisualizationRole } from 'knx-universal-platform/visualization';
import { knx } from 'knx-universal-platform/sdk';

test('visualization and SDK are consumable only through declared package exports', () => {
  assert.equal(typeof composeVisualizationCards, 'function');
  assert.equal(typeof detectVisualizationRole, 'function');
  assert.equal(typeof knx.visualization.compose, 'function');

  const detected = detectVisualizationRole({
    key: 'switch',
    groupAddress: '1/0/1',
    groupName: 'Büro Schalten',
    dpt: '1.001',
    flags: { communication: true, write: true, transmit: false },
  });
  assert.equal(detected?.kind, 'switch');
  assert.equal(detected?.role, 'switch-command');
});
