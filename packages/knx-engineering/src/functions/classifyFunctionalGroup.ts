export interface EngineeringFunctionLike {
  name?: string;
  etsObjectName?: string;
  etsObjectFunctionText?: string;
  etsObjectDescription?: string;
  etsChannelName?: string;
  gaFunctionalGroupId?: string;
}

export interface EngineeringInstanceLike {
  type?: string;
  configSnapshot: {
    label?: string;
    description?: string;
    functions?: EngineeringFunctionLike[];
  };
}

function functionText(func: EngineeringFunctionLike): string {
  return [
    func.name,
    func.etsObjectName,
    func.etsObjectFunctionText,
    func.etsObjectDescription,
    func.etsChannelName,
  ].filter(Boolean).join(' ').toLowerCase();
}

function instanceText(instance: EngineeringInstanceLike): string {
  return [
    instance.configSnapshot.label,
    instance.configSnapshot.description,
    instance.type,
    ...(instance.configSnapshot.functions || []).flatMap((func) => [func.name, func.etsObjectName, func.etsObjectFunctionText]),
  ].filter(Boolean).join(' ').toLowerCase();
}

function strongGroup(text: string): string | null {
  if (/jalous|raffstore|rollladen|sonnenschutz|lamelle|beschattung|\bblind\b|\bshade\b/.test(text)) return 'shading';
  if (/heiz|kühl|klima|hvac|stellgröße|ventil|sollwert|komfort|frostschutz|raumtemperaturreg|fan.?coil|wärme|pumpe/.test(text)) return 'hvac';
  if (/licht|beleucht|leuchte|dimm|dali|hell.?dunkel/.test(text)) return 'lighting';
  if (/präsenz|praesenz|bewegung|helligkeit|\blux\b|co2|luftfeuchte|feuchte|sensor|temperaturmess|windsensor|regen/.test(text)) return 'sensors';
  if (/szene|scene|taster|bedien|\btaste\b|display|visualis|wertgeber/.test(text)) return 'operation';
  if (/zentral|uhrzeit|datum|\bzeit\b|logik|tag.?nacht|wochentag|holiday|ferien/.test(text)) return 'central';
  return null;
}

export function classifyFunctionalGroup(
  instance: EngineeringInstanceLike,
  func: EngineeringFunctionLike,
): string {
  if (func.gaFunctionalGroupId) return func.gaFunctionalGroupId;
  const direct = strongGroup(functionText(func));
  if (direct) return direct;

  const instanceGroup = strongGroup(instanceText(instance));
  if (instanceGroup && /schalten|status|rückmeld|rueckmeld|sperr|freigabe|wert|position|fahren|stopp|stop/.test(functionText(func))) {
    return instanceGroup;
  }

  const text = functionText(func);
  if (/schalten|ein.?aus|toggle/.test(text)) return 'lighting';
  if (/störung|stoerung|alarm|meldung|fehler|\bstatus\b|rückmeld|rueckmeld|kontaktmeldung/.test(text)) return 'messages';
  if (/sperr|freigabe|uhrzeit|datum|\bzeit\b|logik|tag.?nacht/.test(text)) return 'central';
  return instanceGroup || 'other';
}
