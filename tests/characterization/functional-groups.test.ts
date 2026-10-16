import test from 'node:test';
import assert from 'node:assert/strict';
import { functionalGroupId } from '../../packages/knx-engineering/src/group-addresses/functionalGroups.ts';

const instance = (description: string, type = 'custom') => ({
  type,
  label: '', description, middleGroup: 0, functions: [],
}) as any;
const fn = (name: string, extra: Record<string, unknown> = {}) => ({ name, datapointType: '1.001', offset: 0, ...extra }) as any;

test('strong KNX semantics classify lighting, shading and HVAC', () => {
  assert.equal(functionalGroupId(instance(''), fn('DALI Licht dimmen')), 'lighting');
  assert.equal(functionalGroupId(instance(''), fn('Jalousie Lamelle Position')), 'shading');
  assert.equal(functionalGroupId(instance(''), fn('Heizung Sollwert Komfort')), 'hvac');
});

test('generic status inherits the semantic group of its device instance', () => {
  assert.equal(
    functionalGroupId(instance('MDT Jalousieaktor 8-fach'), fn('Status')),
    'shading',
  );
});

test('explicit functional-group assignment overrides heuristics', () => {
  assert.equal(
    functionalGroupId(instance('Lichtaktor'), fn('Schalten', { functionalGroupId: 'central' })),
    'central',
  );
});

test('unknown semantics remain in other rather than receiving an invented meaning', () => {
  assert.equal(functionalGroupId(instance('Spezialgerät'), fn('Herstellerspezifisch')), 'other');
});
