export interface EtsSemanticObject {
  Text?: string;
  Name?: string;
  Description?: string;
  FunctionText?: string;
  Number?: string;
}

const GENERIC_FUNCTION_PATTERNS = [
  /^(?:ein|aus|eingang|ausgang|input|output|status)$/i,
  /^(?:aktuellen?|aktuelle)\s+werte?\s+empfangen$/i,
  /^(?:receive|read)\s+(?:current\s+)?values?$/i,
  /^(?:messwert|wert)\s+(?:senden|empfangen)$/i,
  /^(?:send|receive|read|write)\s+(?:measured\s+)?value$/i,
  /^(?:ein\s*\/\s*aus|on\s*\/\s*off)$/i,
  /^.+\s*=\s*.+$/,
];

export const cleanEtsText = (value?: string): string =>
  String(value || '').replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();

export function isGenericEtsFunctionText(value?: string): boolean {
  const text = cleanEtsText(value);
  return Boolean(text && GENERIC_FUNCTION_PATTERNS.some((pattern) => pattern.test(text)));
}

export function etsSemanticObjectName(object: EtsSemanticObject): string {
  return cleanEtsText(object.Text || object.Name || object.Description || '');
}

export function etsSemanticObjectFunction(object: EtsSemanticObject): string {
  return cleanEtsText(object.FunctionText || '');
}

export function semanticEtsFunctionName(object: EtsSemanticObject): string {
  const name = etsSemanticObjectName(object);
  const fn = etsSemanticObjectFunction(object);

  if (!fn) return name || `KO ${object.Number || '–'}`;
  if (!name) return fn;
  if (name.toLowerCase() === fn.toLowerCase()) return fn;
  if (isGenericEtsFunctionText(fn)) return name;
  return fn;
}

export function specificEtsChannelLabel(value?: string): string {
  const label = cleanEtsText(value);
  if (!label) return '';
  const specific = /(?:^|\b)(?:kanal|channel|taste|taster|wippe|ausgang|eingang)\s*(?:[A-H]|\d+)(?:\s*[+\/]\s*(?:[A-H]|\d+))?\b/i;
  return specific.test(label) ? label : '';
}
