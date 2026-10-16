import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePlanningRoomConsolidation,
  applyPlanningRoomConsolidation,
  mergeDuplicatePlanningFunctions,
  type GaPlanningRoom,
} from '../../packages/knx-engineering/src/index.ts';

const room: GaPlanningRoom = {
  id: 'r1',
  name: 'Büro',
  instances: [
    {
      id: 'i1', type: 'switch', description: 'Taster', middleGroup: 0,
      source: { imported: true, deviceId: 'd1', deviceName: 'Taster', physicalAddress: '1.1.1' },
      functions: [{
        name: 'Licht Büro', datapointType: '1.001', offset: 0, role: 'command',
        source: { objectRef: 'o1', objectNumber: '1', objectName: 'Schalten', objectSize: '1 Bit', transmitFlag: 'Enabled' },
      }],
    },
    {
      id: 'i2', type: 'switch', description: 'Aktor', middleGroup: 0,
      source: { imported: true, deviceId: 'd2', deviceName: 'Aktor', physicalAddress: '1.1.2' },
      functions: [{
        name: 'Licht Büro', datapointType: '1.001', offset: 0, role: 'command',
        source: { objectRef: 'o2', objectNumber: '1', objectName: 'Schalten', objectSize: '1 Bit', writeFlag: 'Enabled' },
      }],
    },
  ],
};

test('room consolidation produces review candidate from source-independent planning instances', () => {
  const result = analyzePlanningRoomConsolidation(room);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].members.length, 2);
  assert.equal(result.candidates[0].status, 'review');
});

test('approved room consolidation disables duplicate function and merges endpoint targets', () => {
  const summary = analyzePlanningRoomConsolidation(room);
  const candidate = summary.candidates[0];
  const result = applyPlanningRoomConsolidation(room.instances, [candidate], { [candidate.id]: 'merge' });
  assert.equal(result.mergedFunctions, 1);
  const enabled = result.instances.flatMap((instance) => instance.functions.filter((fn) => fn.enabled !== false));
  assert.equal(enabled.length, 1);
  assert.equal(enabled[0].targets?.length, 2);
});

test('duplicate merge preserves one logical function and all physical targets', () => {
  const result = mergeDuplicatePlanningFunctions(room.instances);
  assert.equal(result.mergedFunctions, 1);
  const owner = result.instances.flatMap((instance) => instance.functions).find((fn) => fn.enabled !== false)!;
  assert.equal(owner.targets?.length, 2);
});
