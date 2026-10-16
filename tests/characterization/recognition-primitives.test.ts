import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDimmingCore,
  detectOptionalCapabilities,
  detectShadingCore,
  detectSwitchingCore,
  extendRecognitionKeywords,
  gateCapability,
  matchSceneNumber,
  matchesKeyword,
  normalizeRecognitionText,
  pairCommandFeedback,
  parseRecognitionKeywordConfig,
  removeConfiguredKeywords,
  removeKeywords,
} from '../../packages/knx-engineering/src/recognition/index.ts';
import type { RecognitionObject } from '../../packages/knx-engineering/src/recognition/types.ts';

const object = (
  key: string,
  dpt: string,
  direction: 'command' | 'feedback',
  name = '',
  extra: Partial<RecognitionObject> = {},
): RecognitionObject => ({
  key,
  sourceOrder: 0,
  name,
  dpt,
  flags: {
    communication: true,
    write: direction === 'command',
    transmit: direction === 'feedback',
  },
  ...extra,
});

test('recognition keywords normalize German forms and keep configured extensions isolated', () => {
  for (const term of ['EIN/AUS', 'On-Off', 'Betätigen', 'Aus schalten']) {
    assert.equal(matchesKeyword('switch-command', term), true, term);
  }
  for (const term of ['Rückmeldung', 'Rueckmeldung', 'RM', 'Aktueller Sollwert']) {
    assert.equal(matchesKeyword('feedback', term), true, term);
  }
  assert.equal(normalizeRecognitionText('Stellgröße'), 'stellgrosse');

  const initial = { version: 1 as const, synonyms: { 'switch-command': ['Commuter'], feedback: ['Retour'] } };
  const config = extendRecognitionKeywords({ 'switch-command': ['Activer', 'commuter'] }, initial);
  assert.deepEqual(initial.synonyms['switch-command'], ['Commuter']);
  assert.deepEqual(config.synonyms['switch-command'], ['commuter', 'activer']);
  assert.equal(matchesKeyword('switch-command', 'Kanal A Commuter', config), true);
  assert.equal(matchesKeyword('switch-command', 'Commuter'), false);
  assert.throws(() => parseRecognitionKeywordConfig({ version: 2, synonyms: {} }));
  assert.throws(() => extendRecognitionKeywords({ scene: ['(a+)+$'] }));
});

test('configured capability synonyms preserve literal word boundaries', () => {
  const config = extendRecognitionKeywords({ scene: ['Ambiance'], 'window-contact': ['Vitre'] });
  const input = [
    object('scene', '18.001', 'command', 'Ambiance 12'),
    object('window', '1.019', 'feedback', 'Vitre'),
  ];
  assert.deepEqual(detectOptionalCapabilities(input, config).map((item) => item.id), ['scene', 'window-contact']);
  assert.deepEqual(detectOptionalCapabilities(input), []);
  assert.equal(matchSceneNumber('Ambiance #12', config), 12);
  assert.equal(matchSceneNumber('AmbianceExtra 12', config), undefined);
  assert.equal(removeKeywords('identity-role', 'office switching schalten'), 'office switching');
  assert.equal(removeConfiguredKeywords('Büro E1 Activer', config), 'Büro E1 Activer');
});

test('unnamed switch fallback remains candidate and requires exclusive known flags', () => {
  const context = { channelId: 'CH-1', activeByProject: true, linkedGroupAddresses: ['1/0/1'] };
  const input = [
    object('a', '1.001', 'command', '', context),
    object('b', '1.011', 'feedback', '', context),
  ];
  const capability = detectSwitchingCore(input);
  assert.ok(capability);
  assert.equal(capability.matchClass, 'candidate');
  assert.deepEqual(capability.commandObjectKeys, ['a']);
  assert.deepEqual(capability.feedbackObjectKeys, ['b']);
  assert.equal(gateCapability({ ...capability, matchClass: 'exact' }, input).matchClass, 'candidate');

  assert.equal(detectSwitchingCore([
    object('unknown', '1.001', 'command', '', { flags: { write: true } }),
  ]), null);
  assert.equal(detectSwitchingCore([
    object('inactive', '1.001', 'command', '', { activeByProject: false }),
  ]), null);
});

test('fallback rejects ambiguity, conflicting semantics and bidirectional guessing', () => {
  assert.equal(detectSwitchingCore([
    object('a', '1.001', 'command'),
    object('b', '1.001', 'command'),
  ]), null);

  for (const name of ['Sperrfunktion', 'Windalarm', 'Heizen', 'Szene', 'Fensterkontakt', 'Panik']) {
    assert.equal(detectSwitchingCore([object('a', '1.001', 'command', name)]), null, name);
  }

  assert.equal(detectSwitchingCore([
    object('a', '1.001', 'command', '', { flags: { write: true, transmit: true } }),
  ]), null);

  assert.deepEqual(pairCommandFeedback([
    object('a', '1.001', 'command', 'Q47'),
    object('b', '1.001', 'feedback', 'Q47'),
  ]), []);
});

test('dimmer recognition keeps percent-only ambiguity reviewable', () => {
  const input = [
    object('switch', '1.001', 'command'),
    object('relative', '3.007', 'command'),
    object('value', '5.001', 'command'),
    object('state', '1.011', 'feedback'),
    object('value-state', '5.001', 'feedback'),
  ];
  const result = detectDimmingCore(input);
  assert.ok(result);
  assert.equal(result.matchClass, 'candidate');
  assert.deepEqual(result.commandObjectKeys, ['switch', 'relative', 'value']);
  assert.deepEqual(result.feedbackObjectKeys, ['state', 'value-state']);

  const uncertain = detectDimmingCore([...input, object('other-value', '5.001', 'command')]);
  assert.ok(uncertain);
  assert.equal(uncertain.commandObjectKeys.includes('value'), false);
  assert.equal(uncertain.commandObjectKeys.includes('other-value'), false);
  assert.equal(detectDimmingCore([object('only-value', '5.001', 'command')]), null);
});

test('six-slot shading signature requires DPT-compatible named roles', () => {
  const config = extendRecognitionKeywords({ position: ['Hoogte'], slat: ['Lamellenwinkel'] });
  const input = [
    object('move', '1.008', 'command'),
    object('step', '1.007', 'command'),
    object('pos', '5.001', 'command', 'Hoogte'),
    object('slat', '5.001', 'command', 'Lamellenwinkel'),
    object('pos-state', '5.001', 'feedback', 'Hoogte'),
    object('slat-state', '5.001', 'feedback', 'Lamellenwinkel'),
  ];
  assert.equal(detectShadingCore(input, config).matchClass, 'exact');
  assert.notEqual(detectShadingCore(input).matchClass, 'exact');

  const incompatible = input.map((item, index) => index >= 2 ? { ...item, dpt: '1.001' } : item);
  assert.notEqual(detectShadingCore(incompatible, config).matchClass, 'exact');
});

test('explicit named dimming survives unrelated contact-like location prefixes', () => {
  const name = 'Fensterbeleuchtung';
  const points = [
    object('switch', '1.001', 'command', `${name} Schalten`),
    object('relative', '3.007', 'command', `${name} Dimmen`),
    object('value', '5.001', 'command', `${name} Helligkeitswert`),
    object('switch-state', '1.011', 'feedback', `${name} Status`),
    object('value-state', '5.001', 'feedback', `${name} Helligkeitswert Status`),
  ];
  const capability = detectDimmingCore(points);
  assert.ok(capability);
  assert.equal(capability.matchClass, 'exact');
});
