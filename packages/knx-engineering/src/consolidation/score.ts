import type {
  ConsolidationEvidence,
  ConsolidationMember,
  ConsolidationStatus,
} from './types.ts';
import {
  hasComplementaryDirections,
  hasRepeatedConsolidationDevice,
  isGenericConsolidationName,
  linkedGaConflict,
  normalizeConsolidationText,
  productObjectSignature,
  sameCompatible,
  sameNonEmpty,
  sharedConsolidationGa,
} from './utils.ts';

export interface ConsolidationAssessment {
  status: ConsolidationStatus;
  score: number;
  reason: string;
  evidence: ConsolidationEvidence[];
}

export function assessConsolidationGroup(
  members: ConsolidationMember[],
  normalizedName: string,
): ConsolidationAssessment {
  const evidence: ConsolidationEvidence[] = [];
  if (hasRepeatedConsolidationDevice(members)) {
    return blocked('Dieselbe Funktion kommt mehrfach am selben Gerät vor; Kanalzuordnung ist mehrdeutig.', evidence);
  }
  if (!sameCompatible(members.map((item) => normalizeConsolidationText(item.objectSize)))) {
    return blocked('Objektlängen unterscheiden sich; keine gemeinsame GA vorschlagen.', evidence);
  }
  if (linkedGaConflict(members)) {
    return blocked('Bereits vorhandene ETS-GA-Verknüpfungen widersprechen sich.', evidence);
  }

  const sharedGa = sharedConsolidationGa(members);
  if (sharedGa) {
    evidence.push({ kind: 'proof', label: 'Bestehende gemeinsame GA', detail: sharedGa });
    return { status: 'confirmed', score: 100, reason: `In ETS bereits gemeinsam über ${sharedGa} verknüpft.`, evidence };
  }

  let score = 35;
  evidence.push({ kind: 'info', label: 'Gleicher Funktionsname und DPT', detail: 'Nur Kandidat, kein Beweis.' });

  const exactObjectFunction = sameNonEmpty(members.map((item) => normalizeConsolidationText(item.objectFunction)));
  const exactObjectName = sameNonEmpty(members.map((item) => normalizeConsolidationText(item.objectName)));
  const exactSize = sameNonEmpty(members.map((item) => normalizeConsolidationText(item.objectSize)));
  if (exactObjectFunction) { score += 15; evidence.push({ kind: 'positive', label: 'Objektfunktion identisch' }); }
  else evidence.push({ kind: 'warning', label: 'Objektfunktion nicht identisch' });
  if (exactObjectName) { score += 10; evidence.push({ kind: 'positive', label: 'KO-Name identisch' }); }
  else evidence.push({ kind: 'warning', label: 'KO-Name nicht identisch' });
  if (exactSize) { score += 10; evidence.push({ kind: 'positive', label: 'Objektlänge identisch' }); }

  const productSignatures = members.map(productObjectSignature).filter(Boolean);
  if (productSignatures.length === members.length && new Set(productSignatures).size === 1) {
    score += 15;
    evidence.push({ kind: 'positive', label: 'Gleiches Produkt-/KO-Muster', detail: 'Semantik gleich, logische Funktion trotzdem manuell prüfen.' });
  }

  if (hasComplementaryDirections(members)) {
    score += 10;
    evidence.push({ kind: 'positive', label: 'Sender und Empfänger vorhanden' });
  } else {
    evidence.push({ kind: 'warning', label: 'Keine eindeutige Sender/Empfänger-Kombination' });
  }

  const linked = members.filter((item) => item.linkedGas.length > 0);
  if (linked.length > 0) {
    score += 10;
    evidence.push({ kind: 'positive', label: 'ETS-Verknüpfung als Teilhinweis', detail: `${linked.length}/${members.length} KOs bereits verknüpft` });
  }
  if (isGenericConsolidationName(normalizedName)) {
    score -= 15;
    evidence.push({ kind: 'warning', label: 'Generischer Name', detail: 'z. B. Schalten/Status/Wert ist raumweit nicht eindeutig.' });
  }

  score = Math.max(0, Math.min(95, score));
  const reason = score >= 75
    ? 'Starker technischer Kandidat, aber ohne bestehende gemeinsame GA nicht automatisch sicher.'
    : score >= 55
      ? 'Plausibler Kandidat; logische Raumfunktion muss geprüft werden.'
      : 'Schwacher Kandidat; nur wegen gleicher Funktion/DPT gefunden.';
  return { status: 'review', score, reason, evidence };
}

function blocked(reason: string, evidence: ConsolidationEvidence[]): ConsolidationAssessment {
  return {
    status: 'separate', score: 0, reason,
    evidence: [...evidence, { kind: 'blocker', label: reason }],
  };
}
