# KNX Engineering

Reusable engineering intelligence built on KNX concepts. Unlike knx-core, this package may contain project policy and automation algorithms.

Current extracted surface:

- project-wide dynamic three-level group-address allocator

## Milestone 0.4 pattern primitives

Public primitives are exported from `src/patterns/primitives/index.ts` and the package barrel:

- `PatternMatchClass = EXACT | STRONG | PARTIAL | UNKNOWN`
- `PatternAssessment` with `evidence`, `missing`, `conflicts`
- `buildPatternObjectSignature()`
- `buildPatternChannelSignatures()`
- `buildPatternDeviceIdentity()`
- `buildPatternDeviceSignature()`

0.4 performs deterministic signature construction only. It does not infer missing channels, mine repeated sequences, recognize functions or synthesize bindings.


## Pattern primitives 0.4.1

`EXACT` is registry/provenance-bound. Use `PatternStableIdentity`, `PatternVariantIdentity`, separate exact/semantic structure keys and `PatternExactProof`. Display names/translations are semantic fallback data and cannot establish an exact product match.
