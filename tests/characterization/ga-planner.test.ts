import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planGroupAddresses,
  validateGaPlan,
  type GaPlanningProject,
} from '../../packages/knx-engineering/src/index.ts';

function project(mode: 'device' | 'room-function'): GaPlanningProject {
  return {
    schemaVersion: 1,
    name: 'Test',
    options: {
      mode,
      nameTemplate: '{area.abbr} {room.name} {function.name}',
      descriptionTemplate: '{device.pa} | {function.koNumber}',
      descriptionEnabled: true,
    },
    areas: [{
      id: 'a1', name: 'Erdgeschoss', abbreviation: 'EG', mainGroup: 1,
      rooms: [{
        id: 'r1', name: 'Büro', number: '01',
        instances: [{
          id: 'i1', type: 'switch', label: 'Licht', description: 'MDT Schaltaktor', middleGroup: 0,
          feedbackMiddleGroup: 5,
          source: { imported: true, deviceId: 'dev1', physicalAddress: '1.1.10', deviceName: 'Aktor Büro' },
          functions: [
            { name: 'Schalten', datapointType: '1.001', offset: 0, role: 'command', source: { objectRef: 'ko1', objectNumber: '1' } },
            { name: 'Status', datapointType: '1.001', offset: 1, role: 'feedback', source: { objectRef: 'ko2', objectNumber: '2' } },
          ],
        }],
      }],
    }],
  };
}

test('device GA planning is deterministic and routes feedback separately', () => {
  const rows = planGroupAddresses(project('device'));
  const gas = rows.filter((row) => row.level === 'ga' && !row.name.startsWith('---'));
  assert.equal(gas.length, 2);
  assert.deepEqual(gas.map((row) => `${row.mainGroup}/${row.middleGroup}/${row.sub}`), ['1/0/1', '1/5/1']);
  assert.equal(gas[0].name, 'EG Büro Schalten');
  assert.equal(gas[0].description, '1.1.10 | 1');
  assert.deepEqual(gas[0].targets, [{ deviceId: 'dev1', physicalAddress: '1.1.10', objectRef: 'ko1', objectNumber: '1' }]);
  assert.deepEqual(validateGaPlan(rows), []);
});

test('room-function planning groups semantics independently from device middle groups', () => {
  const input = project('room-function');
  input.areas[0].rooms[0].instances[0].description = 'DALI Lichtaktor';
  const rows = planGroupAddresses(input);
  const gas = rows.filter((row) => row.level === 'ga' && !row.name.startsWith('---') && row.name !== '-');
  assert.equal(gas.length, 2);
  assert.equal(gas[0].middleGroup, 0);
});
