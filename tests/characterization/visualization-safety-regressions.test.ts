import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  composeLogicalFunctions,
  detectVisualizationRole,
  type VisualizationPoint,
} from '../../packages/knx-visualization/src/index.ts';

const point = (
  key: string,
  groupAddress: string | undefined,
  groupName: string,
  dpt: string,
  extra: Partial<VisualizationPoint> = {},
): VisualizationPoint => ({ key, groupAddress, groupName, dpt, ...extra });

test('same physical KO with multiple GAs keeps alternatives instead of splitting the function', () => {
  const points = [
    point('O-1@1/1/1', '1/1/1', 'E1 Schalten', '1.001', { deviceId: 'actor', groupAddressPath: ['Licht', 'Halle'] }),
    point('O-1@1/1/2', '1/1/2', 'E1 Schalten', '1.001', { deviceId: 'actor', groupAddressPath: ['Licht', 'Halle'] }),
    point('O-2@1/1/3', '1/1/3', 'E1 Status', '1.011', { deviceId: 'actor', groupAddressPath: ['Licht', 'Halle'] }),
  ];

  const functions = composeLogicalFunctions(points);
  assert.equal(functions.length, 1);
  const command = functions[0].roles.find((role) => role.role === 'switch-command');
  assert.ok(command);
  assert.deepEqual(command.alternativeGroupAddresses, ['1/1/2']);
});

test('one broad channel cannot guess one status for two independent primary commands', () => {
  const metadata = {
    deviceId: 'actor',
    channelId: 'broad',
    groupAddressPath: ['Licht', 'Halle'],
  };
  const functions = composeLogicalFunctions([
    point('a', '1/1/1', 'E1 Schalten', '1.001', metadata),
    point('b', '1/1/2', 'E1 Schalten', '1.001', metadata),
    point('s', '1/1/3', 'E1 Status', '1.011', metadata),
  ]);

  assert.equal(functions.length, 2);
  assert.ok(functions.every((fn) => !fn.roles.some((role) => role.role === 'switch-state')));
  assert.ok(functions.every((fn) =>
    fn.evidence.some((entry) => entry.code === 'ambiguous-partition-role' && entry.objectKeys?.includes('s')),
  ));
});

test('different scene numbers may share one scene-control GA without collapsing', () => {
  const functions = composeLogicalFunctions([
    point('scene-1', '1/1/1', 'Wohnen Szene 1', '18.001', {
      room: 'Wohnen',
      groupAddressPath: ['Wohnen', 'Szenen', 'Szene 1'],
      deviceId: 'panel',
      channelId: 'SC-1',
      activeByProject: true,
    }),
    point('scene-2', '1/1/1', 'Wohnen Szene 2', '18.001', {
      room: 'Wohnen',
      groupAddressPath: ['Wohnen', 'Szenen', 'Szene 2'],
      deviceId: 'panel',
      channelId: 'SC-1',
      activeByProject: true,
    }),
  ]);

  assert.equal(functions.filter((fn) => fn.kind === 'scene').length, 2);
});

test('thermostat cannot become exact without a writable absolute setpoint', () => {
  const base = {
    deviceId: 'controller',
    channelId: 'RTR-1',
    activeByProject: true,
    room: 'Büro',
    groupAddressPath: ['Büro', 'Heizung'],
  };

  const exact = composeLogicalFunctions([
    point('actual', '2/0/1', 'Büro Ist Temperatur', '9.001', {
      ...base,
      direction: 'feedback',
      flags: { communication: true, write: false, transmit: true },
    }),
    point('target', '2/0/2', 'Büro Solltemperatur', '9.001', {
      ...base,
      flags: { communication: true, write: true, transmit: false },
    }),
    point('mode', '2/0/3', 'Büro Betriebsmodus', '20.102', {
      ...base,
      flags: { communication: true, write: true, transmit: false },
    }),
  ]);
  assert.equal(exact.length, 1);
  assert.equal(exact[0].kind, 'thermostat');
  assert.equal(exact[0].matchClass, 'exact');

  const unsafe = composeLogicalFunctions([
    point('actual', '2/0/1', 'Büro Ist Temperatur', '9.001', {
      ...base,
      direction: 'feedback',
      flags: { communication: true, write: false, transmit: true },
    }),
    point('target', '2/0/2', 'Büro Solltemperatur', '9.001', {
      ...base,
      flags: { communication: true, write: false, transmit: false },
    }),
    point('mode', '2/0/3', 'Büro Betriebsmodus', '20.102', {
      ...base,
      flags: { communication: true, write: true, transmit: false },
    }),
  ]);
  assert.ok(unsafe.every((fn) => fn.matchClass !== 'exact'));
});

test('inactive and non-communicating points cannot become roles', () => {
  assert.equal(
    detectVisualizationRole(point('inactive', '1/1/1', 'E1 Schalten', '1.001', {
      activeByProject: false,
      flags: { communication: true, write: true, transmit: false },
    })),
    null,
  );

  assert.equal(
    detectVisualizationRole(point('nocomm', '1/1/1', 'E1 Schalten', '1.001', {
      activeByProject: true,
      flags: { communication: false, write: true, transmit: false },
    })),
    null,
  );
});

test('shared percentage DPT with conflicting application semantics remains unresolved', () => {
  for (const name of ['Dimmwert Jalousie Position', 'Dimmen absolut Ventil Stellgroesse']) {
    assert.equal(
      detectVisualizationRole(point('conflict', '1/1/1', name, '5.001', {
        keywordConfig: { version: 1, synonyms: { dimmer: ['Dimmwert', 'Dimmen absolut'] } },
        flags: { communication: true, write: true, transmit: false },
      })),
      null,
      name,
    );
  }
});

test('generic visualization package contains no Gira/GPA implementation constants', () => {
  const root = path.resolve('packages/knx-visualization');
  const stack = [root];
  const forbidden = [/de\.gira/i, /gira-gpt/i, /\.gpt\b/i, /GPA XML/i];

  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      const source = fs.readFileSync(full, 'utf8');
      for (const pattern of forbidden) {
        assert.equal(pattern.test(source), false, `${full} contains forbidden consumer-specific pattern ${pattern}`);
      }
    }
  }
});
