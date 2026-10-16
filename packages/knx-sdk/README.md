# KNX SDK

Small high-level facade for apps, scripts, AI agents and future bindings.

```ts
import { knx } from './packages/knx-sdk/src/index.ts';

const raw = knx.groupAddress.toRaw('1/2/3');
const dpt = knx.dpt.normalize('1.001');
```

For ETS parsing, runtime-specific archive/XML implementations are injected rather than hard-coded:

```ts
const session = await knx.ets.openProject(source, { xml });
const summary = await session.materialize();
const detail = await session.loadDeviceDetails?.(summary.devices[0].id);
```

For a complete detailed ETS source snapshot:

```ts
const full = await knx.ets.hydrateProject(session, summary);
```

Consumers should prefer the SDK facade. Lower-level packages remain exported for advanced adapters and tooling, but applications should not couple themselves to parser internals.
