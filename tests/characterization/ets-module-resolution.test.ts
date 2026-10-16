import test from 'node:test';
import assert from 'node:assert/strict';
import {
  definitionKeyForInstanceRef,
  projectParameterKeys,
  resolveModuleNumber,
  resolveModuleText,
} from '../../packages/knx-ets/src/parser/moduleResolution.ts';

const modules = new Map([
  ['MD-1_M-2', { id: 'MD-1_M-2_MI-1', definitionId: 'MD-1', args: { ObjNumberBase: '100', Channel: 'A' }, objectNumberBase: 100 }],
]);

test('module instance references map back to their definition key', () => {
  assert.equal(definitionKeyForInstanceRef('MD-1_M-2_MI-1_O-7_R-1'), 'MD-1_O-7_R-1');
});

test('module object numbers receive the instance base offset', () => {
  assert.equal(resolveModuleNumber('MD-1_M-2_MI-1_O-7_R-1', '4', modules), '104');
});

test('module text resolves named arguments and project parameters', () => {
  const params = new Map([['MD-1_M-2_MI-1_P-1', 'Deckenlicht']]);
  assert.equal(
    resolveModuleText('MD-1_M-2_MI-1_O-7_R-1', 'Kanal {{Channel}}: {{0}}', 'MD-1_P-1', modules, params),
    'Kanal A: Deckenlicht'
  );
  assert.ok(projectParameterKeys('MD-1_M-2_MI-1_P-1').includes('P-1'));
});
