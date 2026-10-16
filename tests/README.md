# Baseline / Characterization Tests

These tests freeze behavior that is considered valuable before extracting reusable KNX logic from the 1.24.0 application.

## Goals

- protect GA allocation behavior
- protect PDE address/DPT normalization
- protect ETS semantic naming
- protect engineering functional-group heuristics
- protect command/feedback routing
- protect ETS DPT matching
- protect room-consolidation preconditions

## Run without installing a test framework

Requires Node.js 22.6+ (TypeScript type stripping):

```bash
npm test
```

## Full baseline

Install the pinned development toolchain from the lockfile, then run all checks:

```bash
npm ci
npm run verify
```

`verify` runs the configured TypeScript typecheck, characterization tests and package-boundary checks. There is no distribution build script yet. The current typecheck does not include the optional JSZip runtime adapter or the test files themselves; the tests execute directly through Node.js type stripping.

Characterization tests describe current intentional behavior. If a future migration changes an expected value, first decide whether the change is intentional. Do not update golden expectations merely to make tests green.
