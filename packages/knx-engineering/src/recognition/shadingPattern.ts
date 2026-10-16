import type { RecognizedCapability, RecognitionEvidence, RecognitionMatchClass, RecognitionObject } from './types.ts';
import { dptId, objectFlowDirection, objectText } from './semantics.ts';
import { matchesKeyword } from './recognitionKeywords.ts';
import type { RecognitionKeywordConfig } from './recognitionKeywords.ts';

const find = (objects: RecognitionObject[], pred: (o: RecognitionObject) => boolean) => objects.filter(pred);

export function detectShadingCore(objects: RecognitionObject[], config?: RecognitionKeywordConfig): { matchClass: RecognitionMatchClass; capability?: RecognizedCapability } {
  const command = (o: RecognitionObject) => ['command', 'bidirectional'].includes(objectFlowDirection(o, config));
  const feedback = (o: RecognitionObject) => ['feedback', 'bidirectional'].includes(objectFlowDirection(o, config));
  const move = find(objects, (o) => dptId(o.dpt) === '1.008' && command(o));
  const step = find(objects, (o) => ['1.007', '3.008'].includes(dptId(o.dpt)) && command(o));
  const posCmd = find(objects, (o) => ['5.001', '5.004'].includes(dptId(o.dpt)) && command(o) && matchesKeyword('position', objectText(o), config) && !matchesKeyword('slat', objectText(o), config));
  const slatCmd = find(objects, (o) => ['5.001', '5.004'].includes(dptId(o.dpt)) && command(o) && matchesKeyword('slat', objectText(o), config));
  const posFb = find(objects, (o) => ['5.001', '5.004'].includes(dptId(o.dpt)) && feedback(o) && matchesKeyword('position', objectText(o), config) && !matchesKeyword('slat', objectText(o), config));
  const slatFb = find(objects, (o) => ['5.001', '5.004'].includes(dptId(o.dpt)) && feedback(o) && matchesKeyword('slat', objectText(o), config));
  const slots = [move, step, posCmd, slatCmd, posFb, slatFb];
  const present = slots.filter((x) => x.length).length;
  if (present < 2) return { matchClass: 'unknown' };
  const matchClass: RecognitionMatchClass = slots.some((slot) => slot.length > 1) ? 'candidate' : present === 6 ? 'exact' : present >= 4 ? 'variant' : 'candidate';
  const evidence: RecognitionEvidence[] = [];
  if (move.length) evidence.push({ code: 'shade-move', detail: 'DPT 1.008 Auf/Ab als Befehl', objectKeys: move.map((o) => o.key) });
  if (step.length) evidence.push({ code: 'shade-step', detail: 'Schritt/Kurzzeit-Befehl', objectKeys: step.map((o) => o.key) });
  if (posCmd.length) evidence.push({ code: 'shade-position', detail: 'Absolute Positionsvorgabe', objectKeys: posCmd.map((o) => o.key) });
  if (slatCmd.length) evidence.push({ code: 'shade-slat-position', detail: 'Lamellenpositionsvorgabe', objectKeys: slatCmd.map((o) => o.key) });
  if (posFb.length) evidence.push({ code: 'shade-position-feedback', detail: 'Positionsrückmeldung', objectKeys: posFb.map((o) => o.key) });
  if (slatFb.length) evidence.push({ code: 'shade-slat-feedback', detail: 'Lamellenrückmeldung', objectKeys: slatFb.map((o) => o.key) });
  return {
    matchClass,
    capability: {
      id: 'shading', label: 'Jalousie / Raffstore', matchClass,
      commandObjectKeys: [...move, ...step, ...posCmd, ...slatCmd].map((o) => o.key),
      feedbackObjectKeys: [...posFb, ...slatFb].map((o) => o.key),
      evidence,
    },
  };
}
