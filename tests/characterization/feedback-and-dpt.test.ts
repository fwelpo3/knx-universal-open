import test from 'node:test';
import assert from 'node:assert/strict';
import { functionRoute, hasFunctionsForRoute } from '../../packages/knx-engineering/src/routing/feedbackRouting.ts';
import { dptCompatible, resolveEtsDpt } from '../../packages/knx-ets/src/matching/dptCompatible.ts';

test('feedback is routed separately only when a separate feedback middle group exists', () => {
  const feedback = { name: 'Status', isFeedback: true } as any;
  const command = { name: 'Schalten', isFeedback: false } as any;
  const separate = { middleGroup: 1, feedbackMiddleGroup: 5, functions: [command, feedback] } as any;
  const same = { middleGroup: 1, feedbackMiddleGroup: 1, functions: [command, feedback] } as any;

  assert.equal(functionRoute(feedback, separate), 'feedback');
  assert.equal(functionRoute(command, separate), 'main');
  assert.equal(functionRoute(feedback, same), 'main');
  assert.equal(hasFunctionsForRoute(separate, 'feedback'), true);
});

test('disabled feedback functions do not make the feedback route active', () => {
  const config = {
    middleGroup: 1,
    feedbackMiddleGroup: 5,
    functions: [{ name: 'Status', isFeedback: true, enabled: false }],
  } as any;
  assert.equal(hasFunctionsForRoute(config, 'feedback'), false);
});

test('DPT matching accepts exact/listed values, main-type wildcards and unknown DPTs', () => {
  assert.equal(dptCompatible({ DatapointType: 'DPST-1-1 DPT-5' } as any, { dpt: 'DPT-1' }), true);
  assert.equal(dptCompatible({ DatapointType: 'DPST-5-1 DPST-5-3' } as any, { dpt: 'DPST-5-3' }), true);
  assert.equal(dptCompatible({ DatapointType: 'DPT-5' } as any, { dpt: 'DPST-5-1' }), true);
  assert.equal(dptCompatible({ DatapointType: 'DPST-9-1' } as any, { dpt: 'DPST-1-1' }), false);
  assert.equal(dptCompatible({ DatapointType: '' } as any, { dpt: 'DPST-1-1' }), true);
});

test('ETS DPT resolution uses the canonical catalog without guessing main-only subtype', () => {
  const resolved = resolveEtsDpt('DPST-20-102 DPT-20');
  assert.deepEqual(resolved.ids, ['20.102']);
  assert.equal(resolved.primary, '20.102');
  assert.equal(resolved.objectSize, '1 Byte');
  assert.equal(resolved.support?.catalogued, true);

  const mainOnly = resolveEtsDpt('DPT-1');
  assert.deepEqual(mainOnly.ids, []);
  assert.equal(mainOnly.primary, undefined);
});
