import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildPatternDeviceSignature,
  buildPatternObjectSignature,
  createPatternAssessment,
  createPatternVariantIdentity,
  normalizePatternStableIdentity,
} from '../../packages/knx-engineering/src/index.ts';
import type {
  PatternExactProof,
  PatternStableIdentity,
} from '../../packages/knx-engineering/src/index.ts';
import type { KnxCommunicationObject, KnxDevice } from '../../packages/knx-model/src/index.ts';

const fixturePath = fileURLToPath(new URL('../fixtures/patterns/switching-actuator-realistic.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as { description: string; device: KnxDevice };

const sha256 = (value: string): { algorithm: 'sha256'; value: string } => ({
  algorithm: 'sha256',
  value: createHash('sha256').update(value).digest('hex'),
});

const baseStableIdentity: PatternStableIdentity = {
  manufacturerId: 'M-00FA',
  productRefId: 'M-00FA_H-0101_P-0001',
  hardwareId: 'M-00FA_H-0101',
  hardware2ProgramRefId: 'M-00FA_H-0101_HP-0001',
  applicationProgramId: 'M-00FA_A-0101-01-0000',
  applicationNumber: '0101',
  applicationVersion: '01',
  hardwareVersionNumber: '1.0',
  orderNumber: 'SA-0416',
};

function baseVariant(activeObjectRefs = ['O-0', 'O-1', 'O-2']) {
  return createPatternVariantIdentity({
    activeObjectRefs,
    resolvedParameters: [{ parameterRef: 'P-CHANNEL-A-MODE', value: 'switch' }],
    modules: [{ moduleRef: 'MD-CHANNEL', instanceRef: 'MI-A', objectNumberBase: 0 }],
    channels: [{ channelRef: 'CH-A', activeObjectRefs }],
  });
}

function exactProof(overrides: {
  registryIdentity?: PatternStableIdentity;
  candidateIdentity?: PatternStableIdentity;
  registryStructureKey?: string;
  candidateStructureKey?: string;
  registryStructureDigest?: { algorithm: 'sha256'; value: string };
  candidateStructureDigest?: { algorithm: 'sha256'; value: string };
  registryVariant?: ReturnType<typeof baseVariant>;
  candidateVariant?: ReturnType<typeof baseVariant>;
  provenance?: PatternExactProof['provenance'];
} = {}): PatternExactProof {
  const registryStructureKey = overrides.registryStructureKey || 'dpt=DPST-1-1;direction=consumer;flags=write=1';
  const candidateStructureKey = overrides.candidateStructureKey || registryStructureKey;
  return {
    registryEntryId: 'synthetic.registry.switch-actuator.v1',
    registryRevision: '1',
    provenance: overrides.provenance || {
      sourceArtifact: { kind: 'synthetic', name: 'switching-actuator-realistic.json' },
      internalPath: '/synthetic/application/M-00FA_A-0101-01-0000.xml',
      registryEntryId: 'synthetic.registry.switch-actuator.v1',
      registryRevision: '1',
      digest: sha256('synthetic registry source artifact'),
    },
    registry: {
      stableIdentity: overrides.registryIdentity || baseStableIdentity,
      exactStructureKey: registryStructureKey,
      exactStructureDigest: overrides.registryStructureDigest || sha256(registryStructureKey),
      variantIdentity: overrides.registryVariant || baseVariant(),
    },
    candidate: {
      stableIdentity: overrides.candidateIdentity || baseStableIdentity,
      exactStructureKey: candidateStructureKey,
      exactStructureDigest: overrides.candidateStructureDigest || sha256(candidateStructureKey),
      variantIdentity: overrides.candidateVariant || baseVariant(),
    },
  };
}

test('0.4 assessment contract uses discrete classes and explicit evidence/missing/conflicts only', () => {
  const result = createPatternAssessment({
    matchClass: 'STRONG',
    evidence: [
      { kind: 'application', code: 'APPLICATION_MATCH', message: 'Application program matches.', actual: 'M-00FA_A-0101-01-0000' },
      { kind: 'structure', code: 'CHANNEL_SHAPE_MATCH', message: 'Channel object structure matches.' },
    ],
    missing: [{ code: 'ORDER_NUMBER_NOT_VERIFIED', message: 'Order number was not part of this rule.' }],
  });

  assert.equal(result.matchClass, 'STRONG');
  assert.equal(result.evidence.length, 2);
  assert.equal(result.missing.length, 1);
  assert.deepEqual(result.conflicts, []);
  assert.equal('confidence' in result, false);
  assert.equal('score' in result, false);
});

test('EXACT assessment requires a complete, consistent registry/artifact proof', () => {
  const result = createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [
      { kind: 'registry', code: 'REGISTRY_MATCH', message: 'Stable identity, exact structure and variant matched registry entry.' },
      { kind: 'provenance', code: 'ARTIFACT_DIGEST_MATCH', message: 'Source artifact was cryptographically bound.' },
    ],
    exactProof: exactProof(),
  });

  assert.equal(result.matchClass, 'EXACT');
  assert.equal(result.exactProof?.registryEntryId, 'synthetic.registry.switch-actuator.v1');
});

test('EXACT assessment rejects missing requirements and conflicts before proof acceptance', () => {
  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'structure', code: 'MATCH', message: 'Structure matched.' }],
    missing: [{ code: 'MISSING_APP', message: 'Application id missing.' }],
    exactProof: exactProof(),
  }), /cannot contain missing requirements/);

  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'structure', code: 'MATCH', message: 'Structure matched.' }],
    conflicts: [{ code: 'DPT_CONFLICT', message: 'DPT conflicts.', expected: 'DPST-1-1', actual: 'DPST-5-1' }],
    exactProof: exactProof(),
  }), /cannot contain conflicts/);
});

test('EXACT without exactProof or complete provenance is impossible', () => {
  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'registry', code: 'MATCH', message: 'Claimed registry match.' }],
  }), /requires exactProof/);

  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'registry', code: 'MATCH', message: 'Claimed registry match.' }],
    exactProof: exactProof({ provenance: {} }),
  }), /source-artifact provenance/);
});

test('same human product name cannot hide a different application version', () => {
  const candidateIdentity = { ...baseStableIdentity, applicationVersion: '02' };
  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'version', code: 'SAME_PRODUCT_NAME', message: 'Human product name is deliberately irrelevant to exact identity.' }],
    exactProof: exactProof({ candidateIdentity }),
  }), /stable identity differs/);
});

test('same stable ids with a different exact structure digest cannot be EXACT', () => {
  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'structure', code: 'STRUCTURE_CHECK', message: 'Structure digest compared.' }],
    exactProof: exactProof({
      candidateStructureDigest: sha256('different exact structure'),
    }),
  }), /structure digest differs/);
});

test('OEM manufacturer/product binding deviation prevents EXACT even with the same application and structure', () => {
  const candidateIdentity = {
    ...baseStableIdentity,
    manufacturerId: 'M-0OEM',
    productRefId: 'M-0OEM_H-0101_P-0001',
    hardware2ProgramRefId: 'M-0OEM_H-0101_HP-0001',
  };
  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'manufacturer', code: 'OEM_VARIANT', message: 'OEM identity differs.' }],
    exactProof: exactProof({ candidateIdentity }),
  }), /stable identity differs/);
});

test('different resolved parameterization or active KO set prevents EXACT', () => {
  const candidateVariant = createPatternVariantIdentity({
    activeObjectRefs: ['O-0', 'O-1'],
    resolvedParameters: [{ parameterRef: 'P-CHANNEL-A-MODE', value: 'timed-switch' }],
    modules: [{ moduleRef: 'MD-CHANNEL', instanceRef: 'MI-A', objectNumberBase: 0 }],
    channels: [{ channelRef: 'CH-A', activeObjectRefs: ['O-0', 'O-1'] }],
  });
  assert.throws(() => createPatternAssessment({
    matchClass: 'EXACT',
    evidence: [{ kind: 'variant', code: 'VARIANT_CHECK', message: 'Resolved variant compared.' }],
    exactProof: exactProof({ candidateVariant }),
  }), /variant identity differs/);
});

test('stable identity preserves only actually supplied source ids and invents no required values', () => {
  assert.deepEqual(normalizePatternStableIdentity({
    manufacturerId: ' M-00FA ',
    applicationProgramRefId: ' M-00FA_A-0101-01-0000 ',
    hardwareVersionNumber: '',
  }), {
    manufacturerId: 'M-00FA',
    applicationProgramRefId: 'M-00FA_A-0101-01-0000',
  });
});

test('object signature normalizes DPT, direction, flags and semantic tokens deterministically', () => {
  const object: KnxCommunicationObject = {
    id: 'ko-1',
    number: '17',
    text: 'Status Schalten',
    functionText: 'Rückmeldung',
    datapointType: '1.001',
    flags: { communication: true, read: true, transmit: true },
    channel: { id: 'A', name: 'Kanal A' },
    groupAddresses: [],
  };

  const signature = buildPatternObjectSignature(object);
  assert.equal(signature.objectNumber, 17);
  assert.equal(signature.normalizedDpt, 'DPST-1-1');
  assert.equal(signature.dptFamily, 'DPT-1');
  assert.equal(signature.direction, 'producer');
  assert.equal(signature.flags.transmit, true);
  assert.deepEqual(signature.semanticTokens, ['ruckmeldung', 'schalten', 'status']);
  assert.equal(signature.exactStructureKey.includes('tokens='), false);
  assert.equal(signature.semanticStructureKey.includes('tokens=ruckmeldung,schalten,status'), true);
  assert.equal(signature.structuralKey, signature.semanticStructureKey);
});

test('translation/name changes affect semantic keys but never exact structure keys', () => {
  const original = structuredClone(fixture.device);
  const translated = structuredClone(fixture.device);
  translated.name = 'Switch actuator translated';
  translated.productName = 'Translated product label';
  translated.communicationObjects[0].text = 'Switch translated';
  translated.communicationObjects[1].text = 'Switching feedback translated';
  translated.communicationObjects[0].channel = { id: 'A', name: 'Translated Channel A' };

  const originalSignature = buildPatternDeviceSignature(original);
  const translatedSignature = buildPatternDeviceSignature(translated);
  assert.equal(originalSignature.exactStructureKey, translatedSignature.exactStructureKey);
  assert.notEqual(originalSignature.semanticStructureKey, translatedSignature.semanticStructureKey);
});

test('realistic synthetic KNX fixture produces serializable device/channel/object signatures without doing 0.5 recognition', () => {
  assert.match(fixture.description, /Synthetic/i);
  const signature = buildPatternDeviceSignature(fixture.device, {
    stableIdentity: baseStableIdentity,
    variantIdentity: baseVariant(),
  });

  assert.equal(signature.schemaVersion, 1);
  assert.equal(signature.deviceId, 'fixture-switch-4x');
  assert.equal(signature.identity.manufacturer, 'knx fixture systems gmbh');
  assert.equal(signature.identity.orderNumber, 'sa 0416');
  assert.equal(signature.stableIdentity?.manufacturerId, 'M-00FA');
  assert.deepEqual(signature.channels.map((channel) => channel.channelId), ['A', 'B']);
  assert.equal(signature.channels[0].objects.length, 3);
  assert.equal(signature.channels[1].objects.length, 3);
  assert.equal(signature.channels[0].exactStructureKey, signature.channels[1].exactStructureKey);
  assert.equal(signature.channels[0].semanticStructureKey, signature.channels[1].semanticStructureKey);
  assert.equal(signature.unassignedObjects.length, 1);
  assert.equal(signature.unassignedObjects[0].objectId, 'ko-global-alarm');

  const roundTrip = JSON.parse(JSON.stringify(signature));
  assert.deepEqual(roundTrip, signature);
  assert.equal('repeatedChannelPatterns' in signature, false);
  assert.equal('recognizedFunctions' in signature, false);
});

test('channel exact and semantic structure keys ignore labels and absolute object-number offsets', () => {
  const [a, b] = buildPatternDeviceSignature(fixture.device).channels;
  assert.notEqual(a.channelId, b.channelId);
  assert.notEqual(a.objects[0].objectNumber, b.objects[0].objectNumber);
  assert.equal(a.exactStructureKey, b.exactStructureKey);
  assert.equal(a.semanticStructureKey, b.semanticStructureKey);
});
