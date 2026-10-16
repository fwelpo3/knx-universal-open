export * from './group-addresses/DynamicGroupAllocator.ts';
export * from './consolidation/types.ts';
export * from './consolidation/utils.ts';
export * from './consolidation/score.ts';
export * from './functions/classifyFunctionalGroup.ts';
export * from './routing/feedbackRouting.ts';
export * from './object-groups/types.ts';
export * from './object-groups/groupObjects.ts';
export * from './model/types.ts';
export * from './matching/exactObject.ts';
export * from './naming/functionName.ts';
export * from './group-addresses/types.ts';
export * from './group-addresses/template.ts';
export * from './group-addresses/functionalGroups.ts';
export * from './group-addresses/targets.ts';
export * from './group-addresses/planner.ts';
export * from './group-addresses/validation.ts';
export * from './detection/types.ts';
export * from './detection/capabilities.ts';
export * from './detection/analyzeProject.ts';
export * from './consolidation/planning.ts';
export * from './consolidation/deduplicate.ts';
export * from './locations/fromKnx.ts';

export * from './patterns/types.ts';
export * from './patterns/normalize.ts';
export * from './patterns/signature.ts';
export * from './patterns/fingerprint.ts';
export * from './patterns/registry.ts';
export * from './patterns/devicePatterns.ts';
export * from './patterns/discovery.ts';
export * from './patterns/promotion.ts';
export * from './catalog/types.ts';
export * from './catalog/defaultCatalog.ts';
export * from './synthesis/types.ts';
export * from './synthesis/synthesize.ts';
export * from './patterns/structureAtoms.ts';
export * from './patterns/sequenceMining.ts';

// Milestone 0.4 public pattern/signature primitives. Later recognition layers may
// migrate to these contracts in their own milestones; 0.4 intentionally does not
// alter sequence mining, discovery or synthesis behavior.
export * from './patterns/primitives/index.ts';

// Generic deterministic recognition primitives.
export * from './recognition/index.ts';
