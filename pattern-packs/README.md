# Pattern Packs

Pattern packs contain reviewed KNX device/application knowledge. They are data artifacts consumed by
`EngineeringPatternRegistry`; they must not contain UI logic.

## Trust levels

- `verified/` — backed by a representative product/application source and regression fixture
- `community/` — useful candidate packs awaiting full verification

## Workflow

1. Parse representative `.knxproj` / `.knxprod` data into the canonical model.
2. Run pattern discovery.
3. Confirm channel/function semantics against manufacturer documentation or known engineering data.
4. Promote the mapping with `promoteApplicationFamilyPattern()` or `promoteExactDevicePattern()`.
5. Save as a versioned JSON pattern pack.
6. Add a regression fixture/test.
7. Only then move the pack to `verified/`.

Never encode a guessed function as a verified pack.
