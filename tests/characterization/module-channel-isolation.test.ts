import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clusterRecognitionObjects,
  recognizeDeviceStructure,
  type RecognitionObject,
} from '../../packages/knx-engineering/src/index.ts';

function object(
  key: string,
  channelId: string,
  moduleInstance: string | undefined,
  sourceOrder: number,
  feedback = false,
): RecognitionObject {
  return {
    key, channelId, moduleInstance, sourceOrder,
    name: feedback ? 'Office Light Status' : 'Office Light Schalten',
    dpt: feedback ? '1.011' : '1.001',
    activeByProject: true,
    flags: { communication: true, write: !feedback, transmit: feedback, read: feedback },
    linkedGroupAddresses: [`1/0/${sourceOrder + 1}`],
  };
}

function memberships(input: RecognitionObject[]): string[][] {
  return clusterRecognitionObjects(input).clusters
    .map((cluster) => cluster.objects.map((item) => item.key).sort())
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

test('module isolation: identical channel IDs in different module instances stay separate', () => {
  const input = [
    object('m1', 'CH-1', 'MD-1_M-1', 0),
    object('m2', 'CH-1', 'MD-1_M-2', 1),
  ];
  assert.deepEqual(memberships(input), [['m1'], ['m2']]);
});

test('module isolation: command and feedback pairs never cross module instances', () => {
  const input = [
    object('m1-command', 'CH-1', 'MD-1_M-1', 0),
    object('m1-state', 'CH-1', 'MD-1_M-1', 1, true),
    object('m2-command', 'CH-1', 'MD-1_M-2', 2),
    object('m2-state', 'CH-1', 'MD-1_M-2', 3, true),
  ];
  const result = recognizeDeviceStructure(input);
  assert.equal(result.channels.length, 2);
  for (const module of ['m1', 'm2']) {
    const channel = result.channels.find((item) => item.objectKeys.includes(`${module}-command`));
    assert.ok(channel);
    const switching = channel.capabilities.find((item) => item.id === 'switching');
    assert.ok(switching);
    assert.equal(switching.matchClass, 'exact');
    assert.deepEqual(switching.commandObjectKeys, [`${module}-command`]);
    assert.deepEqual(switching.feedbackObjectKeys, [`${module}-state`]);
  }
});

test('module isolation: missing module evidence is not assigned to a known module', () => {
  assert.deepEqual(memberships([
    object('known', 'CH-1', 'MD-1_M-1', 0),
    object('unknown', 'CH-1', undefined, 1),
  ]), [['known'], ['unknown']]);
});

test('module isolation: tuple encoding cannot collide through separator characters', () => {
  const input = [
    object('a', 'CH:A', 'M', 0),
    object('b', 'CH', 'A:M', 1),
  ];
  const result = clusterRecognitionObjects(input);
  assert.deepEqual(memberships(input), [['a'], ['b']]);
  assert.equal(new Set(result.clusters.map((item) => item.id)).size, 2);
});

test('module isolation: unscoped channel identity and grouping stay backward compatible', () => {
  const input = [object('command', 'CH-1', undefined, 0), object('state', 'CH-1', undefined, 1, true)];
  const { clusters, global } = clusterRecognitionObjects(input);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].id, 'channel:CH-1');
  assert.equal(clusters[0].source, 'channel');
  assert.deepEqual(clusters[0].objects.map((item) => item.key), ['command', 'state']);
  assert.deepEqual(global, []);
});

test('module isolation: one known module and channel remain one group', () => {
  assert.deepEqual(memberships([
    object('command', 'CH-1', 'MD-1_M-1', 0),
    object('state', 'CH-1', 'MD-1_M-1', 1, true),
  ]), [['command', 'state']]);
});

test('module isolation: different channels in one module remain separate', () => {
  assert.deepEqual(memberships([
    object('a', 'CH-1', 'MD-1_M-1', 0),
    object('b', 'CH-2', 'MD-1_M-1', 1),
  ]), [['a'], ['b']]);
});

test('module isolation: module IDs retain case and exact identity', () => {
  assert.deepEqual(memberships([
    object('lower', 'CH-1', 'module-a', 0),
    object('upper', 'CH-1', 'module-A', 1),
  ]), [['lower'], ['upper']]);
});

test('module isolation: reversing input preserves memberships and cluster identities', () => {
  const input = [
    object('a', 'CH-1', 'MD-1_M-1', 0),
    object('b', 'CH-1', 'MD-1_M-2', 1),
    object('c', 'CH-1', undefined, 2),
  ];
  const ids = (items: RecognitionObject[]) => clusterRecognitionObjects(items).clusters.map((item) => item.id).sort();
  assert.deepEqual(memberships(input), memberships([...input].reverse()));
  assert.deepEqual(ids(input), ids([...input].reverse()));
});

test('module isolation: cluster evidence never claims members from another module', () => {
  const input = [object('a', 'CH-1', 'MD-1_M-1', 0), object('b', 'CH-1', 'MD-1_M-2', 1)];
  const { clusters } = clusterRecognitionObjects(input);
  assert.equal(clusters.length, 2);
  for (const cluster of clusters) {
    const keys = new Set(cluster.objects.map((item) => item.key));
    assert.equal(new Set(cluster.objects.map((item) => item.moduleInstance)).size, 1);
    for (const evidence of cluster.evidence) {
      for (const key of evidence.objectKeys || []) assert.ok(keys.has(key), `${evidence.code}: ${key}`);
    }
  }
});

test('module isolation: recognition leaves caller-owned objects unchanged', () => {
  const input = [object('a', 'CH-1', 'MD-1_M-1', 0), object('b', 'CH-1', 'MD-1_M-2', 1)];
  const before = JSON.stringify(input);
  recognizeDeviceStructure(input);
  assert.equal(JSON.stringify(input), before);
});
