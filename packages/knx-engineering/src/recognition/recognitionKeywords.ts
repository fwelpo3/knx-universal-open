import { recognitionKeywordDefaults, recognitionKeywordRoles } from './recognitionKeywordDefaults.ts';
import type { RecognitionKeywordRole } from './recognitionKeywordDefaults.ts';
export { recognitionKeywordRoles } from './recognitionKeywordDefaults.ts';
export type { RecognitionKeywordRole } from './recognitionKeywordDefaults.ts';

/** Additive, serializable project settings. Defaults are never replaced or mutated. */
export interface RecognitionKeywordConfig {
  version: 1;
  synonyms: Partial<Record<RecognitionKeywordRole, string[]>>;
}

export function normalizeRecognitionText(value?: string): string {
  return String(value || '').toLocaleLowerCase('de-DE').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizedVariants(value: string): string[] {
  const normalized = normalizeRecognitionText(value);
  return [normalized, normalized.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')];
}

function literalMatches(text: string, synonym: string): boolean {
  const words = normalizedVariants(synonym);
  return normalizedVariants(text).some((value) => words.some((word) => word && ` ${value} `.includes(` ${word} `)));
}

const extensionAliases: Partial<Record<RecognitionKeywordRole, RecognitionKeywordRole[]>> = {
  'visualization-feedback': ['feedback'],
  'recognition-brightness-feedback': ['feedback', 'brightness'],
  dimmer: ['brightness'],
  'dimming-domain': ['dimmer', 'brightness'],
  'identity-role': ['switch-command', 'feedback', 'brightness', 'position', 'slat', 'move-command',
    'step-command', 'current-temperature', 'target-temperature', 'heating', 'cooling', 'hvac-mode'],
};

function extensions(role: RecognitionKeywordRole, config?: RecognitionKeywordConfig): string[] {
  return [role, ...(extensionAliases[role] || [])].flatMap((key) => config?.synonyms[key] || []);
}

export function matchesKeyword(role: RecognitionKeywordRole, text: string, config?: RecognitionKeywordConfig): boolean {
  const pattern = recognitionKeywordDefaults[role];
  if (normalizedVariants(text).some((value) => pattern.test(value))) return true;
  return extensions(role, config).some((synonym) => literalMatches(text, synonym));
}

/** Validates persisted/user JSON before use; does not compile user input as regular expressions. */
export function parseRecognitionKeywordConfig(value: unknown): RecognitionKeywordConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Keyword-Konfiguration muss ein Objekt sein.');
  const record = value as Record<string, unknown>;
  if (record.version !== 1) throw new Error('Keyword-Konfiguration: version muss 1 sein.');
  if (Object.keys(record).some((key) => !['version', 'synonyms'].includes(key))) throw new Error('Unbekanntes Feld in der Keyword-Konfiguration.');
  const source = record.synonyms;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('synonyms muss ein Objekt sein.');
  const synonyms: RecognitionKeywordConfig['synonyms'] = {};
  for (const [role, entries] of Object.entries(source)) {
    if (!recognitionKeywordRoles.includes(role as RecognitionKeywordRole)) throw new Error(`Unbekannte Keyword-Kategorie: ${role}`);
    if (!Array.isArray(entries) || entries.length > 50) throw new Error(`${role}: maximal 50 Begriffe als Liste.`);
    const unique = new Set<string>();
    for (const entry of entries) {
      if (typeof entry !== 'string' || !entry.trim() || entry.length > 80 || /[\\^$*+?{}[\]|\u0000-\u001f]/.test(entry)) {
        throw new Error(`${role}: Begriffe mit 1 bis 80 Zeichen verwenden, keine Regex oder Steuerzeichen.`);
      }
      const normalized = normalizeRecognitionText(entry);
      if (!normalized) throw new Error(`${role}: Begriff muss Buchstaben oder Ziffern enthalten.`);
      unique.add(normalized);
    }
    synonyms[role as RecognitionKeywordRole] = [...unique];
  }
  return { version: 1, synonyms };
}

export function extendRecognitionKeywords(
  additions: RecognitionKeywordConfig['synonyms'],
  base: RecognitionKeywordConfig = { version: 1, synonyms: {} },
): RecognitionKeywordConfig {
  const validatedBase = parseRecognitionKeywordConfig(base);
  const validatedAdditions = parseRecognitionKeywordConfig({ version: 1, synonyms: additions });
  const synonyms = { ...validatedBase.synonyms };
  for (const role of recognitionKeywordRoles) {
    if (validatedAdditions.synonyms[role]) synonyms[role] = [...new Set([...(synonyms[role] || []), ...validatedAdditions.synonyms[role]!])];
  }
  return parseRecognitionKeywordConfig({ version: 1, synonyms });
}

/** Removes role tokens from already normalized identity text, preserving word boundaries. */
export function removeKeywords(role: RecognitionKeywordRole, text: string, config?: RecognitionKeywordConfig): string {
  const pattern = recognitionKeywordDefaults[role];
  let result = text.replace(new RegExp(pattern.source, 'gi'), ' ');
  for (const synonym of extensions(role, config)) {
    for (const phrase of normalizedVariants(synonym)) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

/** Extracts an explicit scene label followed by a number; caller validates its range. */
export function matchSceneNumber(value: string, config?: RecognitionKeywordConfig): number | undefined {
  const text = normalizeRecognitionText(value);
  const labels = ['szene', 'scene', ...(config?.synonyms.scene || [])];
  for (const label of labels) {
    for (const phrase of normalizedVariants(label)) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = text.match(new RegExp(`\\b${escaped}\\s*(\\d{1,2})\\b`));
      if (match) return Number(match[1]);
    }
  }
  return undefined;
}

/** Removes configured semantic phrases while preserving original title spelling and case. */
export function removeConfiguredKeywords(text: string, config?: RecognitionKeywordConfig): string {
  const phrases = extensions('identity-role', config).flatMap((phrase) => normalizedVariants(phrase));
  if (!phrases.length) return text;
  const tokens = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
  const removed = new Set<number>();
  for (const phrase of phrases) {
    const count = phrase.split(' ').length;
    for (let start = 0; start + count <= tokens.length; start++) {
      const segment = tokens.slice(start, start + count).map((token) => token[0]).join(' ');
      if (!normalizedVariants(segment).includes(phrase)) continue;
      for (let offset = 0; offset < count; offset++) removed.add(start + offset);
    }
  }
  let result = '';
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (!removed.has(index)) return;
    result += text.slice(cursor, token.index);
    cursor = token.index! + token[0].length;
  });
  return (result + text.slice(cursor)).replace(/\s+/g, ' ').trim();
}
