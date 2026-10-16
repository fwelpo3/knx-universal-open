# AI Contract — knx-core

## Purpose
Portable KNX foundation knowledge with no product-specific engineering policy.

## Owns
- KNX address primitives
- DPT primitives
- future protocol/domain primitives that are specification-level rather than app policy

## Forbidden dependencies
- React/UI
- browser APIs
- persistence
- Home Assistant
- feature folders
- project-specific GA naming/allocation policy

## Rule
If the same behavior should be usable by Web, CLI, Python/Home Assistant and future commissioning clients, and it is intrinsic KNX knowledge, prefer this package.
