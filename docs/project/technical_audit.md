# Technical audit (D0) — 2026-11-14

| Area | Status | Notes |
|---|---|---|
| Astronomy (Sun / Earth positions) | **Done, validated** | astronomy-engine; 15″ max vs JPL Horizons |
| Terrain horizon | **Done, validated (Sun)** | LOLA 80 m; Sun ±2 pts vs NASA maps; Earth +2–6 pts open |
| Visibility, windows, metrics | **Done** | contract format v1, 30-min step |
| Comparison | Partial | engine runs any list of sites/dates; no comparison API/UI yet |
| Timeline | Partial | static figure only (`docs/figures/3_timeline.png`) |
| API (FastAPI) | Missing | Pole 2, next task |
| Frontend | Missing | Pole 3; can start from `contract/examples/` |
| Custom coordinates | Partial | engine accepts any lat/lon inside the LDEM; no coverage check yet |
| Terrain 3D view | Missing | P2 |
| Deployment | Missing | public link required for submission |

## Data already available
LOLA DEMs 80 / 40 / 20 m (to 80° S), 10 m (to ~83° S), 240 m (to 60° S) + counts layer;
NASA illumination maps (validation). See [`../../data/README.md`](../../data/README.md).

## Scientific uncertainties
- Earth-visibility offset vs NASA maps (+2 to +6 points), cause unknown.
- Effect of the 2 m sensor height on an 80 m DEM not verified.
- 20 m / 10 m DEMs not tested.

## Priority of remaining work
1. P0 — API returning the contract JSON for catalogue sites; frontend main journey on mock data.
2. P0 — comparison (2 sites same date, 2 dates same site).
3. P1 — custom coordinates with coverage check; minute refinement of set times.
4. P2 — 3D terrain view, finer DEMs.
