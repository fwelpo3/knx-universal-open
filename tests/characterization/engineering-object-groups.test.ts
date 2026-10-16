import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupCommunicationObjects,
  inferredObjectGroupLabel,
} from '../../packages/knx-engineering/src/object-groups/groupObjects.ts';

const objects = [
  { ref: 'O1', Number: '1', Text: 'Kanal A', FunctionText: 'Schalten' },
  { ref: 'O2', Number: '2', Text: 'Kanal A', FunctionText: 'Status' },
  { ref: 'O3', Number: '3', Text: 'Einzelobjekt', FunctionText: 'Wert' },
];

test('engineering object grouping infers only repeated auto groups', () => {
  assert.equal(inferredObjectGroupLabel(objects[0]), 'Kanal A');
  const groups = groupCommunicationObjects(objects, 'auto');
  assert.equal(groups[0].source, 'auto');
  assert.equal(groups[0].label, 'Kanal A');
  assert.deepEqual(groups[0].objects.map((o) => o.ref), ['O1', 'O2']);
  assert.equal(groups[1].source, 'root');
  assert.equal(groups[1].objects[0].ref, 'O3');
});

test('smart grouping prefers ETS native paths over inferred labels', () => {
  const smart = groupCommunicationObjects([
    {
      ref: 'O1', Number: '1', Text: 'Kanal A', FunctionText: 'Schalten',
      etsGroupPath: [{ label: 'Ausgang 1', order: 3 }],
    },
    { ref: 'O2', Number: '2', Text: 'Kanal A', FunctionText: 'Status' },
  ], 'smart');

  assert.equal(smart[0].source, 'ets');
  assert.equal(smart[0].label, 'Ausgang 1');
});

test('flat grouping returns communication objects as roots', () => {
  const flat = groupCommunicationObjects(objects.slice(0, 2), 'flat');
  assert.equal(flat.length, 2);
  assert.ok(flat.every((group) => group.source === 'root'));
});
