# Outreach comments — ready for review

These are individually tailored drafts. Do not copy-paste all of them or post where promotion is disallowed. Identify yourself as the maintainer and participate in the technical discussion.

## 1. ETS6: repeated rooms / bulk engineering (Reddit)
I maintain [KNX Universal Open](https://github.com/fwelpo3/knx-universal-open), a MIT-licensed TypeScript project for KNX project models and engineering planning. The repeated-room case is interesting: are the rooms identical in devices, channel mapping and GA structure, or is there a variable naming scheme? A minimal synthetic 2-room example would help us build and test a scalable template workflow. The code and tests are public, but this isn't a drop-in ETS6 replacement.

## 2. Group address creation in Excel (Reddit)
The Excel-to-GA problem is a good candidate for reusable, testable tooling. I maintain [KNX Universal Open](https://github.com/fwelpo3/knx-universal-open); it includes TypeScript primitives for group addresses and engineering planning. I'd be interested in comparing your desired import/export shape against our model and writing a fixture for edge cases (2-level/3-level addressing, status/command separation). No need to share any real customer projects.

## 3. ETS / KNX MCP AddIn (Reddit)
Great to see open tooling around ETS. I'm maintaining an independent [MIT-licensed TypeScript KNX engineering library](https://github.com/fwelpo3/knx-universal-open). Your MCP approach and our project model could be complementary. What is the preferred exchange model for devices, communication objects and group addresses? I'd be happy to coordinate on a small, synthetic cross-project compatibility fixture rather than building another incompatible schema.

## 4. OpenKNX discussion (GitHub)
Thanks for sharing the KNX/ETS MCP work. I'm maintaining [KNX Universal Open](https://github.com/fwelpo3/knx-universal-open), a TypeScript codebase covering KNX/ETS source models, device-function recognition and GA planning. Would a shared synthetic KNXPROJ compatibility fixture help connect these efforts? Our current source/tests are open under MIT, and we're keen to compare schema assumptions without depending on proprietary customer data.

## 5. XKNX parser maintainers (GitHub / relevant existing discussion only)
I've been studying the XKNX project parser as a potential reference implementation while developing [KNX Universal Open](https://github.com/fwelpo3/knx-universal-open) in TypeScript. Rather than filing a promotional issue, I would like to help build a small set of legally redistributable ETS format regression fixtures and compare parser behavior. Is there an existing test/data format or place you recommend for proposing such compatibility cases?

## 6. Home Assistant ETS project import thread
As an open-source KNX library maintainer, I'm especially interested in reliable mappings from ETS projects to Home Assistant entities. [Our TypeScript model and tests](https://github.com/fwelpo3/knx-universal-open) may be useful for exploring DPT normalization and command/status group address pairs. Which specific ETS export cases are most often ambiguous? I'd like to turn a reproducible, anonymized example into a public test case.
