import test from 'node:test';
import assert from 'node:assert/strict';
import { knx } from '../../packages/knx-sdk/src/index.ts';

test('SDK exposes vendor-neutral visualization without consumer imports', () => {
  assert.equal(typeof knx.visualization.detectRole, 'function');
  assert.equal(typeof knx.visualization.compose, 'function');
  assert.equal(typeof knx.visualization.composeDevices, 'function');
  assert.equal(typeof knx.visualization.logicalFunctions.compose, 'function');
  assert.equal(typeof knx.visualization.logicalFunctions.composeDevices, 'function');

  const cards = knx.visualization.compose([
    {
      key: 'command',
      groupAddress: '1/1/1',
      groupName: 'Flur Schalten',
      dpt: '1.001',
      flags: { communication: true, write: true, transmit: false },
    },
    {
      key: 'state',
      groupAddress: '1/1/2',
      groupName: 'Flur Schalten Status',
      dpt: '1.001',
      direction: 'feedback',
      flags: { communication: true, write: false, transmit: true },
    },
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, 'switch');
});
