import type { RecognizedCapability, RecognitionObject } from './types.ts';
import { dptId, objectFlowDirection, objectText, semanticStem } from './semantics.ts';
import { matchesKeyword } from './recognitionKeywords.ts';
import type { RecognitionKeywordConfig, RecognitionKeywordRole } from './recognitionKeywords.ts';

const by = (objects: RecognitionObject[], predicate: (o: RecognitionObject) => boolean) =>
  objects.filter(predicate);
const isCommand = (o: RecognitionObject, config?: RecognitionKeywordConfig) => ['command', 'bidirectional'].includes(objectFlowDirection(o, config));
const isFeedback = (o: RecognitionObject, config?: RecognitionKeywordConfig) => ['feedback', 'bidirectional'].includes(objectFlowDirection(o, config));
const keys = (objects: RecognitionObject[]) => objects.map((o) => o.key);

function capability(
  id: string,
  label: string,
  commands: RecognitionObject[],
  feedbacks: RecognitionObject[],
  detail: string,
): RecognizedCapability {
  return {
    id, label,
    matchClass: commands.length && feedbacks.length ? 'exact' : 'variant',
    commandObjectKeys: keys(commands),
    feedbackObjectKeys: keys(feedbacks),
    evidence: [{ code: 'object-role', detail, objectKeys: keys([...commands, ...feedbacks]) }],
  };
}

export function pairCommandFeedback(objects: RecognitionObject[], config?: RecognitionKeywordConfig): RecognizedCapability[] {
  const commands = objects.filter((o) => isCommand(o, config));
  const feedbacks = objects.filter((o) => isFeedback(o, config));
  const out: RecognizedCapability[] = [];
  for (const command of commands) {
    const stem = semanticStem(command, config);
    const semanticRoles: RecognitionKeywordRole[] = ['switch-command', 'brightness', 'position', 'slat', 'scene',
      'lock', 'sun-protection', 'twilight', 'window-contact', 'door-contact', 'heating', 'cooling', 'hvac-mode'];
    if (!stem || !semanticRoles.some((role) => matchesKeyword(role, stem, config))) continue;
    if (!dptId(command.dpt)) continue;
    const matches = feedbacks.filter((f) => f.key !== command.key && dptId(f.dpt) === dptId(command.dpt) && semanticStem(f, config) === stem);
    const competing = commands.filter((c) => dptId(c.dpt) === dptId(command.dpt) && semanticStem(c, config) === stem);
    if (matches.length !== 1 || competing.length !== 1) continue;
    out.push(capability(`pair:${stem}`, stem, [command], matches, `Command/Feedback-Paar mit DPT ${dptId(command.dpt)}`));
  }
  return out;
}

export function detectOptionalCapabilities(objects: RecognitionObject[], config?: RecognitionKeywordConfig): RecognizedCapability[] {
  const specs: [RecognitionKeywordRole, string][] = [
    ['scene', 'Szenen'],
    ['lock', 'Sperrfunktion'],
    ['sun-protection', 'Sonnenschutz'],
    ['twilight', 'Dämmerung'],
    ['window-contact', 'Fensterkontakt'],
    ['door-contact', 'Türkontakt'],
    ['end-position', 'Endlage'],
    ['function-status', 'Funktionsstatus'],
  ];
  const result: RecognizedCapability[] = [];
  for (const [id, label] of specs) {
    const matched = by(objects, (o) => matchesKeyword(id, objectText(o), config));
    if (!matched.length) continue;
    result.push(capability(
      id, label, matched.filter((o) => isCommand(o, config)), matched.filter((o) => isFeedback(o, config)),
      `${matched.length} passende Kommunikationsobjekte`,
    ));
  }
  return result;
}

export function detectDeviceCapabilities(objects: RecognitionObject[], config?: RecognitionKeywordConfig): RecognizedCapability[] {
  const specs: [RecognitionKeywordRole, string][] = [
    ['safety-wind', 'Windalarm'],
    ['safety-rain', 'Regenalarm'],
    ['safety-frost', 'Frostalarm'],
    ['manual-control', 'Handbedienung'],
    ['central', 'Zentralfunktion'],
  ];
  return specs.flatMap(([id, label]) => {
    const matched = objects.filter((o) => matchesKeyword(id, objectText(o), config));
    return matched.length ? [capability(id, label, matched.filter((o) => isCommand(o, config)), matched.filter((o) => isFeedback(o, config)), `${matched.length} geräteweite Objekte`)] : [];
  });
}
