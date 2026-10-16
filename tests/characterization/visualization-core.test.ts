import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composeLogicalFunctions,
  composeVisualizationCards,
  detectVisualizationRole,
  namedShadingPosition,
} from '../../packages/knx-visualization/src/index.ts';
import type { VisualizationPoint } from '../../packages/knx-visualization/src/types.ts';

const point = (
  key: string,
  groupAddress: string,
  groupName: string,
  dpt: string,
  extra: Partial<VisualizationPoint> = {},
): VisualizationPoint => ({ key, groupAddress, groupName, dpt, ...extra });

test('generic visualization preserves proven named shading position syntax', () => {
  assert.equal(namedShadingPosition('Position Höhe'), 'position-command');
  assert.equal(namedShadingPosition('Position Höhe RM'), 'position-state');
  assert.equal(namedShadingPosition('Position Lamelle'), 'slat-command');
  assert.equal(namedShadingPosition('Position Lamelle Status'), 'slat-state');
});

test('generic role detection rejects misleading shading names on incompatible DPTs', () => {
  const names = ['Fahren','Kurzzeit','Position','Position Status','Lamelle Position','Lamelle Position Status'];
  for (const [index,name] of names.entries()) {
    const role = detectVisualizationRole(point(
      `x-${index}`, `3/0/${index}`, `M1 Jalousie ${name}`, '1.001',
      { flags:{ write: !name.includes('Status'), transmit: name.includes('Status') } },
    ));
    assert.equal(role, null, name);
  }
});

test('project-structured cross-device dimmer composes into one exact generic logical function', () => {
  const actor={deviceId:'actor',channelId:'CH-A',activeByProject:true};
  const touch={deviceId:'touch',channelId:'CH-3',activeByProject:true};
  const points=[
    point('a-sw','1/1/1','Büro Decke Schalten','1.001',actor),
    point('a-dim','1/1/2','Büro Decke Dimmen','3.007',actor),
    point('a-val','1/1/3','Büro Decke Helligkeitswert','5.001',actor),
    point('a-st','1/1/4','Büro Decke Rückmeldung Schalten','1.001',{...actor,direction:'feedback'}),
    point('a-vst','1/1/5','Büro Decke Rückmeldung Helligkeitswert','5.001',{...actor,direction:'feedback'}),
    point('t-sw','1/1/1','Büro Decke Schalten','1.001',touch),
    point('t-dim','1/1/2','Büro Decke Dimmen','3.007',touch),
    point('t-val','1/1/3','Büro Decke Helligkeitswert','5.001',touch),
  ];
  const functions=composeLogicalFunctions(points);
  assert.equal(functions.length,1);
  assert.equal(functions[0].kind,'dimmer');
  assert.equal(functions[0].matchClass,'exact');
  assert.deepEqual(functions[0].sourceDeviceIds.sort(),['actor','touch']);
});

test('semantic-only complete dimmer remains non-exact', () => {
  const points=[
    point('1','1/1/1','Flur Licht Schalten','1.001',{sourceOrder:1}),
    point('2','1/1/2','Flur Licht Dimmen','3.007',{sourceOrder:2}),
    point('3','1/1/3','Flur Licht Helligkeitswert','5.001',{sourceOrder:3}),
    point('4','1/1/4','Flur Licht Rückmeldung Schalten','1.001',{sourceOrder:4,direction:'feedback'}),
    point('5','1/1/5','Flur Licht Rückmeldung Helligkeitswert','5.001',{sourceOrder:5,direction:'feedback'}),
  ];
  const [fn]=composeLogicalFunctions(points);
  assert.equal(fn.kind,'dimmer');
  assert.equal(fn.basis,'sequence-fallback');
  assert.notEqual(fn.matchClass,'exact');
});

test('generic cards compose without Gira/GPA mapping', () => {
  const cards=composeVisualizationCards([
    point('a','1/1/1','Schalten Flur','1.001',{flags:{write:true,transmit:false}}),
    point('b','1/1/2','Schalten Status Flur','1.001',{flags:{write:false,transmit:true},direction:'feedback'}),
  ]);
  assert.equal(cards.length,1);
  assert.equal(cards[0].kind,'switch');
  assert.equal(cards[0].title,'Flur');
  assert.deepEqual(cards[0].controls,['toggle']);
});
