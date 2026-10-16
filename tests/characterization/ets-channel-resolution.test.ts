import test from 'node:test';
import assert from 'node:assert/strict';
import {
  channelKeys,
  resolveProjectChannelLabel,
  resolveProjectChannelLabelRaw,
} from '../../packages/knx-ets/src/parser/channelResolution.ts';

const meta = new Map([
  ['CH-1', { label: 'Kanal 1', rawLabel: 'Channel 1', textParameterRefId: 'P-1' }],
]);

test('channel resolver accepts shortened ETS channel ids', () => {
  assert.deepEqual(channelKeys('M-1_A-1_CH-1'), ['M-1_A-1_CH-1', 'CH-1']);
});

test('project parameter values can override application channel labels', () => {
  const params = new Map([['P-1', 'Fenster Ost']]);
  assert.equal(resolveProjectChannelLabel('M-1_A-1_CH-1', meta, params), 'Fenster Ost');
  assert.equal(resolveProjectChannelLabelRaw('M-1_A-1_CH-1', meta, params), 'Fenster Ost');
});

test('numeric-only parameter values do not replace meaningful labels', () => {
  const params = new Map([['P-1', '123']]);
  assert.equal(resolveProjectChannelLabel('CH-1', meta, params), 'Kanal 1');
  assert.equal(resolveProjectChannelLabelRaw('CH-1', meta, params), 'Channel 1');
});
