import type { RecognizedCapability, RecognitionMatchClass, RecognitionObject } from './types.ts';
import { dptId, objectFlowDirection, objectText, semanticStem } from './semantics.ts';
import { matchesKeyword } from './recognitionKeywords.ts';
import type { RecognitionKeywordConfig } from './recognitionKeywords.ts';
import { uniqueFlagCandidate } from './roleCandidates.ts';

const keys = (xs: RecognitionObject[]) => [...new Set(xs.map((o) => o.key))];
function build(id: string, label: string, matchClass: RecognitionMatchClass,
  commands: RecognitionObject[], feedbacks: RecognitionObject[], detail: string, fallback = false,
): RecognizedCapability {
  return { id, label, matchClass, commandObjectKeys: keys(commands), feedbackObjectKeys: keys(feedbacks),
    evidence: [{ code: fallback ? 'dpt-flags-fallback' : `${id}-signature`, detail, objectKeys: keys([...commands, ...feedbacks]) }] };
}

export function detectDimmingCore(objects: RecognitionObject[], config?: RecognitionKeywordConfig): RecognizedCapability | null {
  const cmd = (o: RecognitionObject) => ['command', 'bidirectional'].includes(objectFlowDirection(o, config));
  const fb = (o: RecognitionObject) => ['feedback', 'bidirectional'].includes(objectFlowDirection(o, config));
  // Explicit semantic roles survive unrelated words in location or product names.
  // Conflicting-role exclusions apply only to the weaker flags-only fallback.
  const allowed = objects.filter((o) => o.activeByProject !== false && o.flags?.communication !== false);
  const keyword = (role: Parameters<typeof matchesKeyword>[0], o: RecognitionObject) => matchesKeyword(role, objectText(o), config);
  let fallback = false;
  const slot = (named: RecognitionObject[], dpts: string[], direction: 'command' | 'feedback') => {
    if (named.length) return named;
    const inferred = uniqueFlagCandidate(allowed, dpts, direction, config, ['position', 'slat']);
    if (inferred.length) fallback = true;
    return inferred;
  };
  const relative = allowed.filter((o) => dptId(o.dpt) === '3.007' && cmd(o));
  if (relative.length !== 1) return null;
  const switchCmd = slot(allowed.filter((o) => dptId(o.dpt) === '1.001' && cmd(o) && keyword('switch-command', o)), ['1.001'], 'command');
  const valueCmd = slot(allowed.filter((o) => ['5.001', '5.004'].includes(dptId(o.dpt)) && cmd(o) && keyword('brightness', o)), ['5.001', '5.004'], 'command');
  const switchFb = slot(allowed.filter((o) => ['1.001', '1.011'].includes(dptId(o.dpt)) && fb(o) && keyword('feedback', o)), ['1.001', '1.011'], 'feedback');
  const valueFb = slot(allowed.filter((o) => ['5.001', '5.004'].includes(dptId(o.dpt)) && fb(o) && keyword('recognition-brightness-feedback', o)), ['5.001', '5.004'], 'feedback');
  const slots = [switchCmd, relative, valueCmd, switchFb, valueFb];
  const present = slots.filter((x) => x.length).length;
  if (present < 2) return null;
  const ambiguous = slots.some((items) => items.length > 1);
  const matchClass: RecognitionMatchClass = fallback || ambiguous ? 'candidate' : present === 5 ? 'exact' : present >= 3 ? 'variant' : 'candidate';
  return build('dimming', 'Dimmen', matchClass, [...switchCmd, ...relative, ...valueCmd],
    ambiguous ? [] : [...switchFb, ...valueFb], `${present}/5 Kernrollen der Dimm-Signatur vorhanden${fallback ? '; nur DPT/Flags, fachlich pruefen' : ''}`, fallback);
}

export function detectSwitchingCore(objects: RecognitionObject[], config?: RecognitionKeywordConfig): RecognizedCapability | null {
  // Explicit semantic roles survive unrelated words in location or product names.
  // Conflicting-role exclusions apply only to the weaker flags-only fallback.
  const allowed = objects.filter((o) => o.activeByProject !== false && o.flags?.communication !== false);
  const commands = allowed.filter((o) => dptId(o.dpt) === '1.001'
    && ['command', 'bidirectional'].includes(objectFlowDirection(o, config)) && matchesKeyword('switch-command', objectText(o), config));
  const inferred = commands.length ? [] : uniqueFlagCandidate(allowed, ['1.001'], 'command', config, ['position', 'slat']);
  const selected = commands.length ? commands : inferred;
  if (!selected.length) return null;
  const feedbackCandidates = allowed.filter((o) => ['1.001', '1.011'].includes(dptId(o.dpt))
    && objectFlowDirection(o, config) === 'feedback' && matchesKeyword('feedback', objectText(o), config));
  let feedbacks = selected.length === 1 ? feedbackCandidates.filter((o) => semanticStem(o, config) === semanticStem(selected[0], config)) : [];
  if (!feedbacks.length && selected.length === 1 && feedbackCandidates.length === 1) feedbacks = feedbackCandidates;
  const inferredFeedback = !feedbackCandidates.length && selected.length === 1
    ? uniqueFlagCandidate(allowed, ['1.001', '1.011'], 'feedback', config, ['position', 'slat']) : [];
  const fallback = Boolean(inferred.length || inferredFeedback.length);
  if (!feedbacks.length) feedbacks = inferredFeedback;
  if (feedbacks.length !== 1) feedbacks = [];
  const matchClass: RecognitionMatchClass = !fallback && selected.length === 1 && feedbacks.length ? 'exact' : 'candidate';
  return build('switching', 'Schalten', matchClass, selected, feedbacks,
    fallback ? 'Eindeutiger DPT-/Flags-Kandidat; Funktion und Paarung fachlich pruefen'
      : feedbacks.length ? 'Schaltbefehl und passende 1-Bit-Rueckmeldung' : 'Schaltbefehl ohne bestaetigte Rueckmeldung', fallback);
}
