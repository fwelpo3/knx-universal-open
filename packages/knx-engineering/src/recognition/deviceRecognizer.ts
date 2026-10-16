import type { RecognitionKeywordConfig } from './recognitionKeywords.ts';
import type { DeviceRecognition, RecognizedChannel, RecognitionObject } from './types.ts';
import { addRepeatedStructureEvidence, clusterRecognitionObjects } from './channelClustering.ts';
import { detectDeviceCapabilities, detectOptionalCapabilities, pairCommandFeedback } from './capabilities.ts';
import { detectShadingCore } from './shadingPattern.ts';
import { detectDimmingCore, detectSwitchingCore } from './actuatorPatterns.ts';
import { slotKey } from './semantics.ts';
import { dedupeEvidence, gateCapability, hardEvidenceForObject } from './hardEvidence.ts';

function signature(objects: RecognitionObject[]): string {
  return [...objects]
    .sort((a, b) => slotKey(a).localeCompare(slotKey(b)))
    .map((o) => `${slotKey(o)}|${o.dpt || ''}|${o.flags?.write ? 'W' : ''}${o.flags?.transmit ? 'T' : ''}`)
    .join(';;');
}

/**
 * Deterministic device/channel recognition only.
 *
 * Visualization/logical-function composition intentionally happens in the
 * higher knx-visualization layer so engineering stays consumer- and UI-neutral.
 */
export function recognizeDeviceStructure(
  objects: RecognitionObject[],
  config?: RecognitionKeywordConfig,
): DeviceRecognition {
  const ordered = [...objects].sort((a, b) => a.sourceOrder - b.sourceOrder);
  const { clusters, global } = clusterRecognitionObjects(ordered);
  addRepeatedStructureEvidence(clusters);

  const channels: RecognizedChannel[] = clusters.map((cluster) => {
    const shade = detectShadingCore(cluster.objects, config);
    const dimming = detectDimmingCore(cluster.objects, config);
    const switching = detectSwitchingCore(cluster.objects, config);
    const capabilities = [
      ...(shade.capability ? [shade.capability] : []),
      ...(dimming ? [dimming] : []),
      ...(switching ? [switching] : []),
      ...detectOptionalCapabilities(cluster.objects, config),
      ...pairCommandFeedback(cluster.objects, config),
    ].map((capability) => gateCapability(capability, cluster.objects));

    const classes = capabilities.map((capability) => capability.matchClass);
    const matchClass = classes.includes('exact') ? 'exact'
      : classes.includes('variant') ? 'variant'
      : classes.includes('candidate') ? 'candidate'
      : 'unknown';

    return {
      id: cluster.id,
      label: cluster.label,
      alias: cluster.alias,
      source: cluster.source,
      matchClass,
      objectKeys: cluster.objects.map((o) => o.key),
      capabilities,
      evidence: dedupeEvidence([
        ...cluster.evidence,
        ...cluster.objects.flatMap(hardEvidenceForObject),
      ]),
      signature: signature(cluster.objects),
    };
  });

  return {
    channels,
    globalObjectKeys: global.map((o) => o.key),
    deviceCapabilities: detectDeviceCapabilities(global, config)
      .map((capability) => gateCapability(capability, global)),
    evidence: [{
      code: 'deterministic-evidence',
      detail: 'Erkennung basiert auf ETS-Struktur, Modul-Slots, DPT, Flags, Text und Nachbarschaft; keine numerische Confidence.',
    }],
  };
}
