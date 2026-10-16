import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recognizeDeviceStructure,
  type RecognitionObject,
} from '../../packages/knx-engineering/src/recognition/index.ts';

const input: RecognitionObject[] = [
  {
    key: 'cmd',
    sourceOrder: 0,
    name: 'Office Light Schalten',
    dpt: '1.001',
    channelId: 'CH-1',
    activeByProject: true,
    linkedGroupAddresses: ['1/0/1'],
    flags: { communication: true, write: true, transmit: false },
  },
  {
    key: 'state',
    sourceOrder: 1,
    name: 'Office Light Status',
    dpt: '1.011',
    channelId: 'CH-1',
    activeByProject: true,
    linkedGroupAddresses: ['1/0/2'],
    flags: { communication: true, read: true, write: false, transmit: true },
  },
];

test('device recognition composes deterministic channel capabilities without visualization dependency', () => {
  const result = recognizeDeviceStructure(input);
  assert.equal(result.channels.length, 1);
  assert.equal(result.channels[0].id, 'channel:CH-1');
  assert.equal(result.channels[0].source, 'channel');
  const switching = result.channels[0].capabilities.find((item) => item.id === 'switching');
  assert.ok(switching);
  assert.deepEqual(switching.commandObjectKeys, ['cmd']);
  assert.deepEqual(switching.feedbackObjectKeys, ['state']);
  assert.equal('logicalFunctions' in result, false);
  assert.equal('visualizationCards' in result, false);
});

test('device recognition is stable when input order differs but source order is unchanged', () => {
  const a = recognizeDeviceStructure(input);
  const b = recognizeDeviceStructure([...input].reverse());
  assert.equal(a.channels[0].signature, b.channels[0].signature);
  assert.deepEqual(a.channels[0].objectKeys, b.channels[0].objectKeys);
});
