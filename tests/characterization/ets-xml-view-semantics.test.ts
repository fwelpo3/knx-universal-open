import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationObjectGroupsFromXml } from '../../packages/knx-ets/src/parser/applicationGroups.ts';
import { translationMapFromXml } from '../../packages/knx-ets/src/parser/translations.ts';
import { fakeXml, fakeXmlRuntime } from '../support/fakeXmlRuntime.ts';

test('neutral XML port extracts ETS translations and application group paths', () => {
  const document = fakeXmlRuntime.parse(fakeXml({
    name: 'KNX',
    children: [
      {
        name: 'Languages',
        children: [{
          name: 'Language', attrs: { Identifier: 'de-DE' },
          children: [{
            name: 'TranslationElement', attrs: { RefId: 'CH-1' },
            children: [{ name: 'Translation', attrs: { AttributeName: 'Text', Text: 'Kanal Licht' } }],
          }],
        }],
      },
      {
        name: 'Dynamic',
        children: [{
          name: 'Channel', attrs: { Id: 'CH-1', Text: 'Channel 1' },
          children: [{ name: 'ComObjectRefRef', attrs: { RefId: 'APP_O-1' } }],
        }],
      },
    ],
  }));

  const translations = translationMapFromXml(fakeXmlRuntime, document);
  assert.equal(translations.get('CH-1')?.Text, 'Kanal Licht');
  const groups = applicationObjectGroupsFromXml(fakeXmlRuntime, document, translations);
  assert.equal(groups.get('APP_O-1')?.[0].label, 'Kanal Licht');
  assert.equal(groups.get('O-1')?.[0].source, 'ets');
});
