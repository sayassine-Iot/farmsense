# FarmSense architecture

The target system has six layers. Phase 1 delivers **layer 1** (the React web
dashboard) and the **layer 2 contract** it depends on. Layers 2–6 are
simulated by an in-browser demo backend that sits behind the same contract,
so replacing it with the real platform does not touch the UI.

```
1  User Applications          React web dashboard · future mobile app
        │   FarmSenseApi (src/api/types.ts)
2  API and Access Control     authentication · permissions · validation · REST
        │
3A Water & Crop   3B Livestock   3C Devices   3D Alerts & Analytics
        │
4  IoT Ingestion & Processing MQTT · device identity · validation · offline recovery
        │
5A Operational database       5B Telemetry storage
        │
6  Farm edge devices          soil probes · flow meters · tank sensors · pumps · Nordic tags
```

## Where each layer lives

| Layer | Phase 1 code | Phase 2 replacement |
|---|---|---|
| 1 User applications | `src/app` (shell, pages, view model `overview-model.ts`, CSV export), `src/components`, `src/i18n` | unchanged; add mobile app on the same API |
| 2 API & access control | Contract: `src/api/types.ts` (one interface per module), `src/api/access.ts` (roles → permissions), `src/types/access.ts`. Simulated enforcement in `src/api/mock/mock-backend.ts` | REST service with real authentication; HTTP client implementing `FarmSenseApi`, selected in `src/api/index.ts` |
| 3A Water & Crop | `src/modules/water-crop` (water volumes, zones, field moisture vs per-crop/soil thresholds) | same rules run server-side; UI keeps them for display |
| 3B Livestock | `src/modules/livestock` (species-specific metrics, monitored head, attention) | + GPS / geofencing, history |
| 3C Devices | `src/modules/devices` (connectivity, freshness, battery, reading quality) | + provisioning, firmware |
| 3D Alerts & Analytics | `src/modules/alerts-analytics` (alert workflow, prioritisation, cost estimates). Rules engine emulated in `src/api/mock/alert-rules.ts` | server rules engine, anomaly detection, reports |
| 4 IoT ingestion | not built; reflected in the data model: `TelemetryReading.receivedAt` vs `timestamp` (buffered uploads), explicit `coveredFrom` for history completeness | MQTT broker, device identity, validation, delayed-upload recovery |
| 5A Operational DB | `src/types/operational.ts`; demo records in `src/api/mock/seed` | PostgreSQL |
| 5B Telemetry storage | `src/types/telemetry.ts`; demo series in `src/api/mock/seed` | time-series store (e.g. TimescaleDB) |
| 6 Edge devices | simulated by `src/api/mock/seed`; device types are vendor- and protocol-neutral | soil probes, flow meters, tank sensors, pump monitors, nRF9151 livestock tags |

## Rules that keep the layers honest

- **UI talks only to the API contract.** `src/app`, `src/components` and
  `src/modules` may not import `src/api/mock` — enforced by ESLint
  (`no-restricted-imports`).
- **Domain modules are UI-free.** `src/modules` and `src/types` may not import
  React, components, the app or i18n — enforced by ESLint — so the same
  calculations can run in the backend.
- **The server is the authority on permissions.** The UI hides actions the
  session does not allow (`can(session, …)`), and the demo backend rejects
  them anyway (`ApiError('forbidden')`). Preview roles with `?role=viewer`,
  `?role=worker`, `?role=manager` or `?role=owner`.
- **One snapshot, one instant.** `loadFarmSnapshot()` calls the module APIs in
  parallel and requests irrigation history relative to the telemetry time;
  `buildOverview()` derives every figure from that snapshot.
- **Missing data is unavailable, not zero**, and comparisons are only made
  where the stored history covers the comparison window.

## REST mapping (Phase 2)

| Call | Endpoint |
|---|---|
| `access.getSession` | `GET /me` |
| `farms.listFarms` | `GET /farms` |
| `waterCrop.getSetup` | `GET /farms/:id/water-crop` |
| `waterCrop.listIrrigationEvents` | `GET /farms/:id/irrigation-events?from&to` |
| `livestock.listAnimals` | `GET /farms/:id/animals` |
| `devices.getRegistry` | `GET /farms/:id/devices` |
| `devices.getLatestReadings` | `GET /farms/:id/telemetry/latest` |
| `alerts.listAlerts` | `GET /farms/:id/alerts` |
| `alerts.updateAlertStatus` | `PATCH /farms/:id/alerts/:alertId` |
