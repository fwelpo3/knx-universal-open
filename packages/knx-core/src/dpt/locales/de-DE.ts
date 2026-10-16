/**
 * German ETS display labels.
 * Primary source: de-DE TranslationUnit from ETS6 knx_master.xml.
 * Missing master translations are completed from user-provided ETS UI screenshots.
 */
import { ETS_DE_MAIN_TYPE_LABELS } from './de-DE-main.ts';
import { ETS_DE_DPT_LABELS_1 } from './de-DE-subtypes-1.ts';
import { ETS_DE_DPT_LABELS_2 } from './de-DE-subtypes-2.ts';
import { ETS_DE_DPT_LABELS_3 } from './de-DE-subtypes-3.ts';

export { ETS_DE_MAIN_TYPE_LABELS };

export const ETS_DE_DPT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ...ETS_DE_DPT_LABELS_1,
  ...ETS_DE_DPT_LABELS_2,
  ...ETS_DE_DPT_LABELS_3,
});

export const ETS_DE_SCREENSHOT_FALLBACK_IDS = Object.freeze([
  '9.031',
  '14.080',
  '20.612',
  '20.613',
  '20.1219',
  '20.1220',
  '20.1221',
  '207.600',
  '247.600',
  '248.600',
  '252.600',
  '252.601',
  '254.600',
  '254.601',
  '272.600',
] as const);
