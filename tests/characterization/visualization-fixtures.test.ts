import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  composeLogicalFunctions,
  detectVisualizationRole,
} from '../../packages/knx-visualization/src/index.ts';
import type { VisualizationPoint } from '../../packages/knx-visualization/src/types.ts';

const fixture = JSON.parse(readFileSync(
  new URL('../fixtures/visualization/generic-cards.json', import.meta.url),
  'utf8',
)) as {
  roleCases: { name: string; point: VisualizationPoint; expected: { kind: string; role: string } }[];
  rejectCases: { name: string; point: VisualizationPoint }[];
  functionCases: {
    name: string;
    points: VisualizationPoint[];
    expected: { kind: string; basis: string; matchClass: string; roles: string[]; evidence: string[] };
  }[];
};

for (const entry of fixture.roleCases) {
  test(`synthetic role fixture: ${entry.name}`, () => {
    const detected = detectVisualizationRole(entry.point);
    assert.ok(detected);
    assert.equal(detected.kind, entry.expected.kind);
    assert.equal(detected.role, entry.expected.role);
  });
}

for (const entry of fixture.rejectCases) {
  test(`synthetic reject fixture: ${entry.name}`, () => {
    assert.equal(detectVisualizationRole(entry.point), null);
  });
}

for (const entry of fixture.functionCases) {
  test(`synthetic function golden: ${entry.name}`, () => {
    const functions = composeLogicalFunctions(entry.points);
    assert.equal(functions.length, 1);
    const fn = functions[0];
    assert.equal(fn.kind, entry.expected.kind);
    assert.equal(fn.basis, entry.expected.basis);
    assert.equal(fn.matchClass, entry.expected.matchClass);
    assert.deepEqual(fn.roles.map((role) => role.role).sort(), [...entry.expected.roles].sort());
    const evidence = new Set(fn.evidence.map((item) => item.code));
    for (const code of entry.expected.evidence) assert.equal(evidence.has(code), true, code);
  });
}
