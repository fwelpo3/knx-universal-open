# AI Contract — knx-ets

## Purpose
Translate ETS/KNXPROJ source data into runtime-neutral, serializable KNX evidence.

## Owns
- KNXPROJ archive layout semantics
- ETS XML interpretation
- products/hardware/ApplicationProgram references
- ETS translations, modules, channels and object definitions
- project topology, placement, GA links and object-instance overrides
- `EtsSourceProject`
- ETS -> canonical KNX mapping

## Layer rules
- Archive and XML implementations are injected ports.
- Runtime indexes may contain `Map`; public source DTOs may not.
- ApplicationProgram XML stays lazy for summary parsing.
- ETS-specific evidence stays in ETS source DTOs and must not redefine the canonical KNX model.

## Must not own
- React/UI
- JSZip implementation
- app persistence state
- engineering policies such as GA allocation or function classification
- Home Assistant entities

## Before changing parser architecture
Read `.ai/platform/17_PHASE_1C_ARCHITECTURE.md` and ADR-0005/0006/0007/0009.
