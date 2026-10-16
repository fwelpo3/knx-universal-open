<div align="center">

# KNX Universal Open

### Open-source KNX engineering infrastructure

**Understand KNX projects. Discover device functions. Build better automation tools.**

[![Project status](https://img.shields.io/badge/status-community%20foundation-2563eb?style=for-the-badge)](docs/ROADMAP.md)
[![GitHub issues](https://img.shields.io/github/issues/fwelpo3/knx-universal-open?style=for-the-badge)](https://github.com/fwelpo3/knx-universal-open/issues)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-10b981?style=for-the-badge)](CONTRIBUTING.md)

[**Explore the architecture**](docs/ARCHITECTURE.md) · [**Read the roadmap**](docs/ROADMAP.md) · [**Contribute**](CONTRIBUTING.md) · [**Join the discussion**](https://github.com/fwelpo3/knx-universal-open/issues)

</div>

---

![KNX Universal Open architecture](docs/assets/architecture-hero.svg)

## One foundation. Many KNX applications.

KNX Universal Open is an open-source initiative to create a **reusable, headless KNX engineering engine**. The goal is to make KNX project understanding, device intelligence, and engineering workflows accessible to developers building CLIs, web applications, integrations, and AI-assisted tools.

> **Early-stage public repository:** The existing private platform is being reviewed for publication. **No production-ready engine is included yet.** This repository currently provides the open project foundation, documentation, and contribution process.

### What we're building

| 🧩 KNX project understanding | 🔎 Device intelligence | 🔗 Engineering automation |
| :--- | :--- | :--- |
| Structured KNX/ETS data, devices, topology, communication objects and group addresses. | Explainable recognition using DPTs, object flags, channels and device patterns. | Planning and validation of group addresses, links and engineering changes. |

| 🧱 Reusable SDK | 🧪 Deterministic validation | 🌐 Integrations |
| :--- | :--- | :--- |
| Stable interfaces for use beyond a single application. | Testable rules, evidence-backed matches and safe handling of unknowns. | Future adapters for Node.js, CLI, servers, Home Assistant and developer tools. |

## Architecture at a glance

```mermaid
flowchart TD
  A["KNX / ETS project data"] --> B["Source adapters"]
  B --> C["Canonical KNX model"]
  C --> D["Engineering intelligence"]
  D --> E["Planning & validation"]
  C --> F["Public SDK"]
  E --> F
  F --> G["CLI / Web tools / AI agents / Integrations"]
```

The design separates file formats, runtime dependencies, and engineering logic so that each part can be developed and tested independently. See [architecture](docs/ARCHITECTURE.md).

## Project status

**Public release preparation.** The original private platform has a TypeScript-based modular design and internal tests, but public code transfer, rights review, reproducible builds and documentation are not complete. We will report verified capabilities as components are published.

- [x] Public community repository
- [x] Initial project scope and contributor guidance
- [ ] Code and dependency release audit
- [ ] Publish reviewed core packages and reproducible tests
- [ ] Publish SDK examples and supported capability matrix
- [ ] First tagged release

See the [roadmap](docs/ROADMAP.md) for details.

## Why another KNX project?

Existing projects such as [XKNX Project](https://github.com/XKNX/xknxproject) specialize in project parsing, while [KNXUltimate](https://github.com/Supergiovane/KNXUltimate) addresses KNX communication. Our **intended focus** is a reusable engineering layer: explainable device interpretation, source-independent KNX models, and group-address/link planning. This is a direction for development, **not a claim of feature superiority or current parity**.

## For developers

Interested in KNX, ETS project formats, smart building software, device classification, or open engineering tools?

1. Read the [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md).
2. Check [issues](https://github.com/fwelpo3/knx-universal-open/issues) for proposed work.
3. Read [contribution guidelines](CONTRIBUTING.md).
4. Propose features, integrations, tests, documentation, or manufacturer-neutral device patterns.

**Looking for collaborators.** Independent developers, KNX integrators, open-source maintainers and smart-building researchers are welcome.

## Contribute in three ways

| Build | Validate | Document |
| :-- | :-- | :-- |
| Propose adapters, SDK APIs and developer tools. | Contribute synthetic KNX fixtures and edge-case tests. | Clarify DPT behavior, project models and integration guides. |

Start with [the collaboration discussion](https://github.com/fwelpo3/knx-universal-open/issues/1).

## Community & contact

- **Questions and collaborations:** [Open a GitHub issue](https://github.com/fwelpo3/knx-universal-open/issues/new)
- **Project discussion:** GitHub Discussions (link will be added when enabled)
- **Discord:** Planned; no invitation link available yet

## Licensing and third-party materials

The intended licensing model is **Apache-2.0**, subject to a source and rights audit. **No license is granted for unpublished code.** KNX, ETS and manufacturer names are trademarks of their respective owners. No third-party ETS binaries, manufacturer databases, private project files or license materials are distributed by this repository.

This is an independent community initiative and is **not affiliated with or endorsed by KNX Association**.

---

<div align="center">

**Build an open KNX engineering ecosystem — together.**

[Roadmap](docs/ROADMAP.md) · [Contribution guide](CONTRIBUTING.md) · [Security](SECURITY.md)

</div>
