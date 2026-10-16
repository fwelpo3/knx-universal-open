import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanEtsText,
  isGenericEtsFunctionText,
  semanticEtsFunctionName,
  specificEtsChannelLabel,
} from '../../packages/knx-ets/src/semantics/functionName.ts';

test('ETS texts are cleaned without losing their semantic content', () => {
  assert.equal(cleanEtsText('  Licht   Schalten {x} '), 'Licht Schalten');
});

test('generic ETS function text falls back to the object name', () => {
  assert.equal(isGenericEtsFunctionText('Ein / Aus'), true);
  assert.equal(
    semanticEtsFunctionName({ Text: 'Deckenlicht Büro', FunctionText: 'Ein / Aus', Number: '1' }),
    'Deckenlicht Büro',
  );
});

test('specific function text wins when it carries more meaning', () => {
  assert.equal(
    semanticEtsFunctionName({ Text: 'Objekt 1', FunctionText: 'Lamellenposition', Number: '2' }),
    'Lamellenposition',
  );
});

test('specific channel labels are detected but broad labels are rejected', () => {
  assert.equal(specificEtsChannelLabel('Kanal A Schalten'), 'Kanal A Schalten');
  assert.equal(specificEtsChannelLabel('Bedienen / Anzeige'), '');
});
