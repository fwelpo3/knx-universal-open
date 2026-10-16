import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dptObjectSize,
  groupAddressToRaw,
  normalizeDptId,
  parseGroupAddress,
} from '../../packages/knx-core/src/index.ts';
import {
  assessConsolidationGroup,
  classifyFunctionalGroup,
  DynamicGroupAllocator,
  functionRoute,
  normalizeConsolidationDpt,
} from '../../packages/knx-engineering/src/index.ts';
import { dptCompatible, semanticEtsFunctionName } from '../../packages/knx-ets/src/index.ts';
import { normalizePdeHardware2ProgramRefId } from '../../packages/knx-pde/src/index.ts';

test('new platform package APIs are directly consumable without the application UI', () => {
  assert.deepEqual(parseGroupAddress('1/2/3'), { main: 1, middle: 2, sub: 3 });
  assert.equal(groupAddressToRaw('1/2/3'), 2563);
  assert.equal(normalizeDptId('1.001'), 'DPST-1-1');
  assert.equal(dptObjectSize('9.001'), '2 Bytes');

  const allocator = new DynamicGroupAllocator();
  allocator.beginArea(0);
  allocator.beginLogicalGroup(0);
  assert.equal(allocator.allocateAddress().sub, 1);

  assert.equal(classifyFunctionalGroup(
    { type: 'x', configSnapshot: { description: 'Jalousieaktor' } },
    { name: 'Status' },
  ), 'shading');
  assert.equal(functionRoute({ isFeedback: true }, { middleGroup: 1, feedbackMiddleGroup: 5, functions: [] }), 'feedback');
  assert.equal(normalizeConsolidationDpt('DPST-1-1'), '1.001');

  const members = [
    { deviceId: 'a', objectSize: '1 Bit', linkedGas: ['1/1/1'], objectFunction: 'Schalten', objectName: 'Licht', variantId: 'v', objectRef: 'o1', direction: 'producer' },
    { deviceId: 'b', objectSize: '1 Bit', linkedGas: ['1/1/1'], objectFunction: 'Schalten', objectName: 'Licht', variantId: 'v', objectRef: 'o1', direction: 'consumer' },
  ] as any;
  assert.equal(assessConsolidationGroup(members, 'licht büro').status, 'confirmed');

  assert.equal(semanticEtsFunctionName({ Text: 'Deckenlicht', FunctionText: 'Ein / Aus' }), 'Deckenlicht');
  assert.equal(dptCompatible({ DatapointType: 'DPT-1 DPST-1-1' }, { dpt: 'DPT-1' }), true);

  assert.equal(
    normalizePdeHardware2ProgramRefId('X_HP-0001-01-abcd'),
    'X_HP-0001-01-0000',
  );
});
