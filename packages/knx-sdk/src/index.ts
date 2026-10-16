import {
  dptCandidates,
  dptObjectSize,
  groupAddressToRaw,
  mainGroupRange,
  middleGroupRange,
  normalizeDptId,
  parseGroupAddress,
} from '../../knx-core/src/index.ts';
import {
  analyzeKnxProject,
  assessConsolidationGroup,
  classifyFunctionalGroup,
  DynamicGroupAllocator,
  functionRoute,
  engineeringLocationsFromKnxProject,
  hasFunctionsForRoute,
  planGroupAddresses,
  validateGaPlan,
  normalizeConsolidationDpt,
  objectDirection,
  buildDeviceStructuralSignature,
  deviceFingerprint,
  discoverProjectPatternClusters,
  EngineeringPatternRegistry,
  promoteApplicationFamilyPattern,
  promoteExactDevicePattern,
  recognizeDevicePatterns,
  synthesizeProjectFunctions,
  synthesizeDeviceFunction,
  DEFAULT_FUNCTION_CATALOG,
} from '../../knx-engineering/src/index.ts';
import {
  buildEtsSourceProject,
  discoverKnxprojLayout,
  dptCompatible,
  etsSourceToKnxProject,
  hydrateEtsProjectDetails,
  openEtsProject,
  semanticEtsFunctionName,
  specificEtsChannelLabel,
  discoverKnxprodLayout,
  readKnxprodBootstrap,
  indexKnxprodCatalog,
} from '../../knx-ets/src/index.ts';
import { buildPdePlan, exportProjectDataExchange, mergePdeSourceSnapshots, normalizePdeHardware2ProgramRefId, serializePdeXml } from '../../knx-pde/src/index.ts';
import { etsDeviceToGaPlanningInstance, etsObjectsToEngineeringDefinition } from '../../knx-ets-engineering/src/index.ts';
import {
  composeLogicalFunctions,
  composeLogicalFunctionsFromDevices,
  composeVisualizationCards,
  composeVisualizationCardsFromDevices,
  detectVisualizationRole,
  visualizationPointsFromDevices,
  visualizationPointsFromObjects,
} from '../../knx-visualization/src/index.ts';

/**
 * Stable high-level entry point for consumers that should not know package internals.
 * The surface is intentionally small and will grow by capability, not by UI feature.
 */
export const knx = Object.freeze({
  project: Object.freeze({
    fromEtsSource: etsSourceToKnxProject,
  }),
  groupAddress: Object.freeze({
    parse: parseGroupAddress,
    toRaw: groupAddressToRaw,
    mainRange: mainGroupRange,
    middleRange: middleGroupRange,
  }),
  dpt: Object.freeze({
    normalize: normalizeDptId,
    candidates: dptCandidates,
    objectSize: dptObjectSize,
  }),
  visualization: Object.freeze({
    detectRole: detectVisualizationRole,
    compose: composeVisualizationCards,
    composeDevices: composeVisualizationCardsFromDevices,
    pointsFromObjects: visualizationPointsFromObjects,
    pointsFromDevices: visualizationPointsFromDevices,
    logicalFunctions: Object.freeze({
      compose: composeLogicalFunctions,
      composeDevices: composeLogicalFunctionsFromDevices,
    }),
  }),
  ets: Object.freeze({
    semanticFunctionName: semanticEtsFunctionName,
    specificChannelLabel: specificEtsChannelLabel,
    dptCompatible,
    source: Object.freeze({
      buildProject: buildEtsSourceProject,
    }),
    archive: Object.freeze({
      discoverLayout: discoverKnxprojLayout,
    }),
    productDatabase: Object.freeze({
      discoverLayout: discoverKnxprodLayout,
      readBootstrap: readKnxprodBootstrap,
      indexCatalog: indexKnxprodCatalog,
    }),
    openProject: openEtsProject,
    hydrateProject: hydrateEtsProjectDetails,
    engineering: Object.freeze({
      objectsToDefinition: etsObjectsToEngineeringDefinition,
      deviceToGaPlanningInstance: etsDeviceToGaPlanningInstance,
    }),
  }),
  engineering: Object.freeze({
    analyzeProject: analyzeKnxProject,
    functionCatalog: DEFAULT_FUNCTION_CATALOG,
    synthesizeProject: synthesizeProjectFunctions,
    synthesizeDeviceFunction,
    patterns: Object.freeze({
      recognizeDevice: recognizeDevicePatterns,
      fingerprintDevice: deviceFingerprint,
      buildDeviceSignature: buildDeviceStructuralSignature,
      discoverProjectClusters: discoverProjectPatternClusters,
      Registry: EngineeringPatternRegistry,
      promoteExactDevice: promoteExactDevicePattern,
      promoteApplicationFamily: promoteApplicationFamilyPattern,
    }),
    locationsFromProject: engineeringLocationsFromKnxProject,
    DynamicGroupAllocator,
    groupAddresses: Object.freeze({
      plan: planGroupAddresses,
      validate: validateGaPlan,
    }),
    classifyFunctionalGroup,
    feedback: Object.freeze({
      route: functionRoute,
      hasFunctionsForRoute,
    }),
    consolidation: Object.freeze({
      normalizeDpt: normalizeConsolidationDpt,
      objectDirection,
      assess: assessConsolidationGroup,
    }),
  }),
  pde: Object.freeze({
    normalizeHardware2ProgramRefId: normalizePdeHardware2ProgramRefId,
    buildPlan: buildPdePlan,
    serializeXml: serializePdeXml,
    export: exportProjectDataExchange,
    mergeSourceSnapshots: mergePdeSourceSnapshots,
  }),
});

export type KnxSdk = typeof knx;
