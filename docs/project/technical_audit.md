# Technical audit (D0) — 2026-11-14

First written on the morning of 2026-11-14; updated the same evening after the Phase 3 API work
(see [`phase3_pole2.md`](phase3_pole2.md)).

| Area | Status | Notes |
|---|---|---|
| Astronomy (Sun / Earth positions) | **Done, validated** | astronomy-engine; 15.5″ max vs JPL Horizons |
| Terrain horizon | **Done, validated (Sun)** | LOLA 80 m; Sun ±2 pts vs NASA maps; Earth +2.1 to +6.1 pts open. Half-pixel terrain shift fixed on 2026-11-14 |
| Visibility, windows, metrics | **Done** | contract format v1, 30-min step |
| API (FastAPI) | **Done** | `GET /sites`, `GET /horizon`, `POST /analysis`, CORS, horizon cache, 40 automated tests |
| Custom coordinates | **Done** | any lat/lon; coverage check (refused outside the map or if the 150 km horizon circle is incomplete) |
| Comparison | Partial | API ready (two `POST /analysis` calls); no comparison UI yet (Pole 3) |
| Timeline | Partial | static figure only (`docs/figures/3_timeline.png`); UI is Pole 3 |
| Frontend | Missing | Pole 3; can call the API or use `contract/examples/` |
| Set/rise times to the minute | Missing | times accurate to one step (30 min by default) |
| Deployment | Missing | public link required for submission; the 189 MB terrain file must be on the server |
| Terrain 3D view | Missing | P2 |

## Data already available
LOLA DEMs 80 / 40 / 20 m (to 80° S), 10 m (to ~83° S), 240 m (to 60° S) + counts layer;
NASA illumination maps (validation). See [`../../data/README.md`](../../data/README.md).

## Scientific uncertainties
- Earth-visibility offset vs NASA maps (+6.1 Shackleton rim, +2.9 Malapert slope, +2.1 Malapert summit),
  cause unknown. Ruled out: Earth positions, disc rule, terrain-reading shift (see
  [`../scientific/limitations.md`](../scientific/limitations.md)).
- Effect of the 2 m sensor height on an 80 m DEM not verified against an independent reference.
- 80 m and 40 m DEMs agree (Earth within 0.8 points); 20 m / 10 m DEMs not tested.

## Priority of remaining work
1. P0 — Pole 3: frontend main journey and comparison, calling the API.
2. P0 — Pole 2: deploy the API publicly.
3. P1 — Pole 2: refine set/rise times to the minute.
4. P1 — Pole 1: Earth-visibility offset.
5. P2 — 3D terrain view, finer DEMs.
