/** Identity extraction patterns, kept separate from configurable functional roles. */
const channelLabels = [
  /\b(Jalousie|Rollo|Raffstore)\s+\d+(?:\s*\/\s*\d+)?\b/i,
  /\b(?:Kanal|Channel|Ausgang|Output|Eingang|Input)\s+[A-Z0-9]+\b/i,
];

export function recognitionChannelLabel(candidates: string[]): string {
  for (const pattern of channelLabels) {
    for (const value of candidates) {
      const match = value.match(pattern);
      if (match) return match[0].replace(/\s*\/\s*/g, '/');
    }
  }
  return '';
}
