# KNX / ETS Discussions & Collaboration Leads
Research date: 2026-10-16. Curated public conversations; links are entry points, not endorsement or permission to advertise. Prioritize substantive replies and check current thread rules/status before posting.

## A — Direct overlaps: ETS editing, AI/MCP, project models

| # | Discussion | Link | Why relevant / useful response |
|---|---|---|---|
| 1 | ETS Power Editor: AI directly in ETS | https://www.reddit.com/r/KNX/comments/1wg4kbr/ets_power_editor_use_your_ai_assistant_directly/ | Structured devices, GA linking, pricing, developer licensing; ask about a shared neutral TS model and integration boundaries |
| 2 | Open-source ETS AddIn + MCP | https://www.reddit.com/r/KNX/comments/1w1t4g4/open_source_ets_addin_mcp_server_to_control_knx/ | Developers already shipping MCP bridge; propose interoperability and fixtures |
| 3 | OpenKNX: read-only KNX MCP to HA | https://github.com/OpenKNX/OpenKNX/discussions/17 | Direct developer exchange about project parsing, validation, YAML export |
| 4 | Reddit: MIT-licensed read-only ETS project auditor | https://www.reddit.com/r/KNX/comments/1walcea/i_built_an_opensource_readonly_ets_project/ | Compare coverage of structural checks, GA planning and model evidence |
| 5 | Cross-platform KNX editor with MCP | https://www.reddit.com/r/KNX/comments/1w7yz8g/opensource_crossplatform_knx_project_editor_and/ | Collaborate on safe KNXPROJ import/export, tests, DCA limitations |
| 6 | Koolenex open KNX project editor | https://www.reddit.com/r/KNX/comments/1ry9pjj/koolenex_open_source_knx_tool/ | React/Node KNX project exploration; technical collaboration |
| 7 | Why is ETS closed to community? | https://www.reddit.com/r/KNX/comments/1wy9qlf/why_is_ets_still_so_closed_to_community/ | Explain free, MIT-licensed, source-first approach without promising official ETS API access |
| 8 | ETS6 production — generate 300 rooms | https://www.reddit.com/r/KNX/comments/1ws97ec/ets6_production/ | Concrete pain point for templates, repeated GAs and bulk project creation |
| 9 | OpenETS discussion | https://github.com/OpenKNX/OpenKNX/issues/5 | Historic open ETS architecture and format interoperability discussion (closed, archival) |
| 10 | OpenKNX discussions | https://github.com/OpenKNX/OpenKNX/discussions | Find current developer-friendly category before posting |
| 11 | Programmatic KNX settings discussion | https://github.com/OpenKNX/OpenKNX/discussions/categories/general | Ask about programmatically generating and validating ETS settings |

## B — KNX project parsing, devices, DPTs and exports

| # | Discussion/project | Link | Why relevant |
|---|---|---|---|
| 12 | XKNX project parser | https://github.com/XKNX/xknxproject | Established parser, potential differential tests and interoperability |
| 13 | ETS file parse failure issue | https://github.com/XKNX/xknxproject/issues/444 | A specific historic failure mode, closed; validate with synthetic fixtures rather than advertise |
| 14 | Oversized ETS project issue | https://github.com/XKNX/xknxproject/issues/258 | Large project handling and UX; historic/closed |
| 15 | KNX DPT feature discussions | https://github.com/XKNX/xknx/issues | Value type compatibility, status semantics, test ideas |
| 16 | XKNX KNX integration issues | https://github.com/XKNX/knx-integration/issues | Upload, large project and multi-project requests (some issue creation restricted) |
| 17 | Node.js ETS project parser | https://github.com/advancedKnx/ets_proj_parser | JS ecosystem precedent; compare models and format support |
| 18 | OpenKNX Producer | https://github.com/OpenKNX/OpenKNXproducer | KNXPROD creation/validation; possible standards and fixture dialogue |
| 19 | OpenKNX Config Transfer | https://github.com/OpenKNX/OFM-ConfigTransfer | ETS module data copying/export/import use cases |
| 20 | OpenKNX state engine | https://github.com/OpenKNX/OAM-StateEngine | Feature models and parameter conventions |

## C — Users asking for exactly these workflows

| # | Discussion | Link | Pain point |
|---|---|---|---|
| 21 | Tired of building group addresses in Excel | https://www.reddit.com/r/KNX/comments/1ptqnqa/i_got_tired_of_building_knx_group_addresses_in/ | GA generation + ETS XML export |
| 22 | Home Assistant: import KNX group addresses | https://community.home-assistant.io/t/knx-integration-import-of-group-addresses/714066 | Generating valid KNX entities from ETS function structures |
| 23 | Read-only ETS → HA YAML | https://www.reddit.com/r/homeassistant/comments/1walk3h/i_made_an_opensource_tool_that_turns_ets_knxproj/ | Cross-system DPT, status/command pair inference |
| 24 | KNX bus monitor with ETS import | https://www.reddit.com/r/KNX/comments/1wdadvz/i_built_an_opensource_alwayson_knx_bus_monitor/ | Parsing, metadata and room/group address search |
| 25 | Direct KNX IP mobile app / ETS import | https://www.reddit.com/r/KNX/comments/1x4s90d/i_built_a_knx_app_that_talks_directly_to_your_ip/ | Recent beta developer, ETS-based scene/room metadata |
| 26 | KNX/HA/AI architecture feedback | https://www.reddit.com/r/KNX/comments/1ti39v8/layering_ha_ai_brain_on_an_existing_premium_knx/ | AI assistant integration and source model needs |
| 27 | KNX programming job cost estimation | https://www.reddit.com/r/KNX/comments/1whczgi/how_do_you_estimate_the_cost_of_a_knx_programming/ | Estimate and reduce repetitive engineering effort |
| 28 | ETS Home license limitations | https://www.reddit.com/r/KNX/comments/1bg6ito | Identify privacy-safe planning tools for hobbyists |
| 29 | BuildingAutomation crosspost: XKNX Editor | https://www.reddit.com/r/BuildingAutomation/comments/1x5lrli/opensource_crossplatform_knx_project_editor_and/ | Relevant broader automation engineering audience |

## Outreach recommendation

**First wave (5 discussions):** 8, 21, 3, 5, 6. Answer the concrete technical question, disclose that you maintain KNX Universal Open, provide a tiny demonstration, then link to https://github.com/fwelpo3/knx-universal-open only if pertinent.

**Second wave:** 1, 2, 4, 7, 22, 23. Offer interoperability examples, benchmarks or neutral fixtures; invite critiques rather than self-promotion.

**Do not** spam old or closed GitHub issues, cold-tag maintainers, claim ETS endorsement, or imply production-grade compatibility.

Suggested follow-up deliverables: compatibility matrix XKNX vs our TypeScript models; reproducible '300 rooms' GA planning test fixture; example ETS→canonical project model report; simple community contribution template.
