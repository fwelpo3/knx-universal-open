import { canonicalDptId, getDptDefinition } from './registry.ts';
import {
  ETS_DE_DPT_LABELS,
  ETS_DE_MAIN_TYPE_LABELS,
  ETS_DE_SCREENSHOT_FALLBACK_IDS,
} from './locales/de-DE.ts';

export type DptDisplayLocale = 'canonical' | 'de-DE';
export const DEFAULT_DPT_DISPLAY_LOCALE: DptDisplayLocale = 'de-DE';
export type DptLabelSource = 'ets-master-de-DE' | 'ets-ui-screenshot' | 'canonical';

export type DptLocalizedLabel = {
  id: string;
  locale: DptDisplayLocale;
  label: string;
  displayLabel: string;
  source: DptLabelSource;
  exactEtsLabel: boolean;
  catalogued: boolean;
};

const screenshotFallbackIds = new Set<string>(ETS_DE_SCREENSHOT_FALLBACK_IDS);

export function normalizeDptDisplayLocale(locale?: string): DptDisplayLocale {
  const raw = String(locale ?? '').trim().toLowerCase();
  if (!raw) return DEFAULT_DPT_DISPLAY_LOCALE;
  if (raw === 'de' || raw === 'de-de' || raw.startsWith('de-')) return 'de-DE';
  if (raw === 'canonical' || raw === 'technical' || raw === 'raw') return 'canonical';
  return 'canonical';
}

export function getDptLocalizedLabel(id: string, locale: string = DEFAULT_DPT_DISPLAY_LOCALE): DptLocalizedLabel {
  const canonical = canonicalDptId(id);
  const definition = getDptDefinition(canonical);
  const normalizedLocale = normalizeDptDisplayLocale(locale);

  if (normalizedLocale === 'de-DE') {
    const label = ETS_DE_DPT_LABELS[canonical];
    if (label) {
      const screenshot = screenshotFallbackIds.has(canonical);
      return {
        id: canonical,
        locale: normalizedLocale,
        label,
        displayLabel: `${canonical} ${label}`,
        source: screenshot ? 'ets-ui-screenshot' : 'ets-master-de-DE',
        exactEtsLabel: true,
        catalogued: Boolean(definition),
      };
    }
  }

  const label = definition?.name || canonical || String(id || '');
  return {
    id: canonical,
    locale: normalizedLocale,
    label,
    displayLabel: canonical ? `${canonical} ${label}` : label,
    source: 'canonical',
    exactEtsLabel: false,
    catalogued: Boolean(definition),
  };
}

export function getDptLabel(id: string, locale: string = DEFAULT_DPT_DISPLAY_LOCALE): string {
  return getDptLocalizedLabel(id, locale).label;
}

export function getDptDisplayLabel(id: string, locale: string = DEFAULT_DPT_DISPLAY_LOCALE): string {
  return getDptLocalizedLabel(id, locale).displayLabel;
}

export function getDptMainTypeLabel(main: number, locale: string = DEFAULT_DPT_DISPLAY_LOCALE): string {
  const normalizedLocale = normalizeDptDisplayLocale(locale);
  if (normalizedLocale === 'de-DE') return ETS_DE_MAIN_TYPE_LABELS[main] || `DPT ${main}`;
  return `DPT ${main}`;
}

export function listEtsGermanDptLabels(): Readonly<Record<string, string>> {
  return ETS_DE_DPT_LABELS;
}

export function listEtsGermanMainTypeLabels(): Readonly<Record<number, string>> {
  return ETS_DE_MAIN_TYPE_LABELS;
}
