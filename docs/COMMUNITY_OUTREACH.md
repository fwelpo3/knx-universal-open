# Community outreach plan (October 2026)

Goal: recruit KNX integrators, ETS power users and TypeScript developers for feedback, synthetic test cases and pull requests. Do not mass-post generic advertisements or imply ETS certification.

## Suggested priority

1. **Reddit r/KNX** — active discussion about ETS developer access and community tooling: https://www.reddit.com/r/KNX/comments/1wy9qlf/why_is_ets_still_so_closed_to_community/ . Join the technical discussion with a specific offer to share readable source, comparisons and test cases. Disclose affiliation.
2. **GitHub OpenKNX Discussions** — relevant MCP/ETS read-only project: https://github.com/OpenKNX/OpenKNX/discussions/17 . Discuss overlapping parser validation and integration interfaces, not a generic repository advertisement.
3. **Home Assistant community** — KNX/ETS MCP project showcase: https://community.home-assistant.io/t/nickol-knx-mcp-server-for-knx-ets-design-time-knx-helper-that-validates-your-knxproj-and-generates-the-ha-knx-yaml/1021687 . Ask whether a reusable TS canonical KNX model or GA planning tests would be useful.
4. **XKNX developer ecosystem** — https://github.com/XKNX/xknxproject and https://github.com/XKNX/knx-integration . Read relevant issues first and propose a precise interoperability or fixture discussion; do not create off-topic issues solely for promotion.
5. **German KNX User Forum** — https://knx-user-forum.de/ . Share a detailed technical introduction in the appropriate software/project area, following the forum rules. The community also maintains a user download portal (https://service.knx-user-forum.de/).
6. **KNX Professionals Germany** — https://www.knx-professionals.de/ . Approach relevant working groups or event organizers for engineering feedback; not an unsolicited mass mailing.
7. **KNX Association user clubs** — https://www.knx.org/community/userclubs . Find regional groups interested in collaborative tooling and testing.

## Three message angles

**Developer angle:** “We published an MIT-licensed TypeScript KNX engineering codebase: project models, ETS source parsing, device-function intelligence and group-address planning. The verification suite is runnable via `npm ci && npm run verify`. I'm looking for reviewers of the package APIs and reproducible edge cases. Repo: https://github.com/fwelpo3/knx-universal-open”

**Integrator angle (German):** “Ich entwickle eine frei verfügbare TypeScript-Basis für KNX/ETS-Projektanalyse, Gerätefunktionserkennung und Gruppenadressplanung. Der Quellcode und Tests sind jetzt unter MIT verfügbar. Mich interessieren konkrete, anonymisierte Fehlerfälle aus ETS-Projekten und Feedback zur Praxistauglichkeit. Wer möchte mit testen? https://github.com/fwelpo3/knx-universal-open”

**Interop angle:** “Would it be useful to compare our TypeScript ETS project model and validation primitives against existing Python KNX project parsers? Happy to open a focused compatibility test issue rather than duplicate work.”

## Rules

- Post once per relevant community, engage with actual questions, and follow local self-promotion rules.
- Do not claim production readiness, official ETS integration, KNX certification or licensed access to proprietary SDKs.
- Avoid publishing private project archives, license keys or copyrighted manufacturer databases.
- Record community feedback as actionable issues and acknowledge existing maintainers.
