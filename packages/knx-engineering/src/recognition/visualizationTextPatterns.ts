/** Legacy display/identity cleanup, separate from role evidence and user synonyms. */
export const titleRoleWords = /\b(rückmeldung|ruckmeldung|rueckmeldung|status|schalten|dimmen|absolut|relativ|helligkeitswert|brightness|vorgabe|basis wert|aktiver betriebsmodus|verschiebung|temperatursensor|ist temperatur|stellgröße|stellgrosse|heizen|fahren|kurzzeitbetrieb|lamelle|position|eingang|ausgang)\b/gi;
export const titleAbbreviations = /(?:Bel\.?|RGBW\.?)/gi;
export const titleDecorations = /\b(RGB|HSV|TW|Farbtemperatur|Szenen?|Sequenz\s*\d+)\b/gi;
export const titlePrefixes = {
  rgb: /\b(?:RGB|HSV|RGBW)\b/i,
  'tunable-white': /\b(?:TW|Farbtemperatur|Tunable White)\b/i,
  thermostat: /\b(?:Betriebsmodus|Solltemperatur|Temperatursensor|Ist[- ]?Temperatur|Stellgröße|Stellgrosse|Heizen)\b/i,
};
export const genericIdentityToken = /^(?:ch(?:annel)?|kanal|output|ausgang|input|eingang|taste|taster|f)\d+$/i;
export const numberedChannelWords = /\b(?:channel|kanal|output|ausgang|input|eingang)\s*\d+\b/g;
export const distributionRoomType = /^(distributionboard|cabinet)$/i;
export const sceneTitleSuffix = /\s+(?:ein|on)$/i;
