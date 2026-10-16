import { knx } from '../packages/knx-sdk/src/index.ts';

console.log('GA', knx.groupAddress.parse('1/2/3'), knx.groupAddress.toRaw('1/2/3'));
console.log('DPT', knx.dpt.normalize('1.001'), knx.dpt.objectSize('9.001'));
console.log('ETS name', knx.ets.semanticFunctionName({ Text: 'Deckenlicht', FunctionText: 'Ein / Aus' }));
console.log('Engineering group', knx.engineering.classifyFunctionalGroup(
  { configSnapshot: { description: 'Jalousieaktor' } },
  { name: 'Status' },
));
