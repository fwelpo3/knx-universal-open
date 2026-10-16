import type { EngineeringFunctionCatalogEntry } from './types.ts';

export const DEFAULT_FUNCTION_CATALOG: readonly EngineeringFunctionCatalogEntry[] = [
  {
    functionId: 'switching.output',
    definition: {
      id: 'switching.output', label: 'Schaltausgang', category: 'lighting', capabilities: ['switch'],
      slots: [
        { id: 'switch.command', name: 'Schalten', datapointType: 'DPT-1', role: 'command', capabilities: ['switch'] },
        { id: 'switch.feedback', name: 'Status', datapointType: 'DPT-1', role: 'feedback', capabilities: ['feedback'] },
        { id: 'switch.lock', name: 'Sperren/Freigabe', datapointType: 'DPT-1', role: 'command', capabilities: ['enable-lock'] },
      ],
    },
    slotRules: [
      { slotId: 'switch.command', dptFamilies: ['DPT-1'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['schalt', 'switch', 'ein', 'aus', 'on', 'off'], required: true, functionRole: 'command' },
      { slotId: 'switch.feedback', dptFamilies: ['DPT-1'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['status', 'ruckmeld', 'feedback', 'actual', 'ist'], functionRole: 'feedback' },
      { slotId: 'switch.lock', dptFamilies: ['DPT-1'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['sperr', 'lock', 'freigabe', 'enable'], functionRole: 'command' },
    ],
  },
  {
    functionId: 'lighting.dimming-output',
    definition: {
      id: 'lighting.dimming-output', label: 'Dimmausgang', category: 'lighting', capabilities: ['switch', 'dimming'],
      slots: [
        { id: 'dimming.switch.command', name: 'Schalten', datapointType: 'DPT-1', role: 'command' },
        { id: 'dimming.relative.command', name: 'Relativ dimmen', datapointType: 'DPT-3', role: 'command' },
        { id: 'dimming.value.command', name: 'Dimmwert', datapointType: 'DPT-5', role: 'command' },
        { id: 'dimming.value.feedback', name: 'Dimmwert Status', datapointType: 'DPT-5', role: 'feedback' },
        { id: 'dimming.switch.feedback', name: 'Schaltstatus', datapointType: 'DPT-1', role: 'feedback' },
      ],
    },
    slotRules: [
      { slotId: 'dimming.switch.command', dptFamilies: ['DPT-1'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['schalt', 'switch', 'ein', 'aus', 'on', 'off'], functionRole: 'command' },
      { slotId: 'dimming.relative.command', dptFamilies: ['DPT-3'], endpointRoles: ['consumer', 'bidirectional'], required: true, functionRole: 'command' },
      { slotId: 'dimming.value.command', dptFamilies: ['DPT-5'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['dimm', 'wert', 'value', 'helligkeit', 'brightness'], functionRole: 'command' },
      { slotId: 'dimming.value.feedback', dptFamilies: ['DPT-5'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['status', 'ruckmeld', 'feedback', 'wert', 'value'], functionRole: 'feedback' },
      { slotId: 'dimming.switch.feedback', dptFamilies: ['DPT-1'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['status', 'ruckmeld', 'feedback'], functionRole: 'feedback' },
    ],
  },
  {
    functionId: 'shading.output',
    definition: {
      id: 'shading.output', label: 'Beschattungsausgang', category: 'shading', capabilities: ['shading.move', 'shading.slat', 'position'],
      slots: [
        { id: 'shading.move.command', name: 'Auf/Ab', datapointType: 'DPT-1', role: 'command' },
        { id: 'shading.step.command', name: 'Stop/Lamelle', datapointType: 'DPT-1', role: 'command' },
        { id: 'shading.position.command', name: 'Position', datapointType: 'DPT-5', role: 'command' },
        { id: 'shading.position.feedback', name: 'Position Status', datapointType: 'DPT-5', role: 'feedback' },
        { id: 'shading.slat.command', name: 'Lamellenposition', datapointType: 'DPT-5', role: 'command' },
        { id: 'shading.slat.feedback', name: 'Lamellenposition Status', datapointType: 'DPT-5', role: 'feedback' },
      ],
    },
    slotRules: [
      { slotId: 'shading.move.command', dptFamilies: ['DPT-1'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['auf', 'ab', 'up', 'down', 'fahr', 'move', 'jalous', 'blind', 'shutter'], required: true, functionRole: 'command' },
      { slotId: 'shading.step.command', dptFamilies: ['DPT-1'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['stop', 'step', 'lamell', 'slat'], required: true, functionRole: 'command' },
      { slotId: 'shading.position.command', dptFamilies: ['DPT-5'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['position', 'hohe', 'height'], functionRole: 'command' },
      { slotId: 'shading.position.feedback', dptFamilies: ['DPT-5'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['position', 'hohe', 'height', 'status', 'feedback'], functionRole: 'feedback' },
      { slotId: 'shading.slat.command', dptFamilies: ['DPT-5'], endpointRoles: ['consumer', 'bidirectional'], semanticTokensAny: ['lamell', 'slat'], functionRole: 'command' },
      { slotId: 'shading.slat.feedback', dptFamilies: ['DPT-5'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['lamell', 'slat'], functionRole: 'feedback' },
    ],
  },
  {
    functionId: 'sensor.temperature',
    definition: {
      id: 'sensor.temperature', label: 'Temperatursensor', category: 'hvac', capabilities: ['temperature'],
      slots: [{ id: 'temperature.value', name: 'Temperaturwert', datapointType: 'DPT-9', role: 'feedback' }],
    },
    slotRules: [
      { slotId: 'temperature.value', dptFamilies: ['DPT-9'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['temperatur', 'temperature', 'temp', 'istwert', 'actual'], required: true, functionRole: 'feedback' },
    ],
  },
  {
    functionId: 'sensor.occupancy',
    definition: {
      id: 'sensor.occupancy', label: 'Präsenz/Bewegung', category: 'sensor', capabilities: ['occupancy'],
      slots: [{ id: 'occupancy.state', name: 'Präsenz/Bewegung', datapointType: 'DPT-1', role: 'feedback' }],
    },
    slotRules: [
      { slotId: 'occupancy.state', dptFamilies: ['DPT-1'], endpointRoles: ['producer', 'bidirectional'], semanticTokensAny: ['prasenz', 'presence', 'beweg', 'motion', 'occupancy'], required: true, functionRole: 'feedback' },
    ],
  },
  {
    functionId: 'scene.control',
    definition: {
      id: 'scene.control', label: 'Szenensteuerung', category: 'scene', capabilities: ['scene'],
      slots: [{ id: 'scene.control', name: 'Szene', datapointType: 'DPT-18', role: 'command' }],
    },
    slotRules: [
      { slotId: 'scene.control', dptFamilies: ['DPT-17', 'DPT-18'], endpointRoles: ['consumer', 'producer', 'bidirectional'], required: true, functionRole: 'command' },
    ],
  },
] as const;

export function defaultFunctionCatalogEntry(functionId: string): EngineeringFunctionCatalogEntry | undefined {
  return DEFAULT_FUNCTION_CATALOG.find((entry) => entry.functionId === functionId);
}
