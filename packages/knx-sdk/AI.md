# AI Contract — knx-sdk

## Purpose
Primary entry point for external consumers and coding agents.

## Rule for AI
Prefer `knx.<capability>...` over reaching into internal files unless implementing the platform itself.

## Current namespaces
- `knx.groupAddress`
- `knx.dpt`
- `knx.ets`
- `knx.engineering`
- `knx.pde`

## Design constraints
- public API stays small
- no React/UI concepts
- no storage/browser assumptions
- no feature-folder imports
- names should make sense from TypeScript, Python and REST bindings later
