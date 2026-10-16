# Contributing to KNX Universal Open

Thanks for helping improve the KNX engineering platform. Read the [README](README.md), [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md) first.

## Getting started

Requires Node.js >=22.6 and npm.

```bash
npm ci
npm run verify
```

The verification script runs TypeScript checks, characterization tests and dependency-boundary checks. For a change, open a focused issue or reference an existing one, work in a topic branch, then submit a pull request explaining the behavior and tests. Use a small synthetic input to reproduce bugs.

## Contribution standards

- Keep business logic headless, modular and testable.
- Include characterization or regression tests with functional changes.
- For device recognition, document evidence, ambiguity and limitations.
- Prefer explicit APIs and retain dependency boundaries defined in `docs/PACKAGE_GRAPH.json`.
- Avoid unrelated refactoring in a focused pull request.

**Never submit** customer ETS projects, credentials, license keys, proprietary ETS binaries, decompiled third-party code or manufacturer datasets without redistribution permission.

## Licensing note

This project is licensed under the [MIT License](LICENSE). By contributing, ensure you have permission to submit your code and any associated test data under these terms.

[Open an issue](https://github.com/fwelpo3/knx-universal-open/issues/new).