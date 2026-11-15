# Technical audit — updated 2026-11-15

First written on the morning of 2026-11-14 (D0), updated after the Phase 3 API work
(see [`phase3_pole2.md`](phase3_pole2.md)) and again on 2026-11-15 after the frontend was connected to the engine.

| Area | Status | Notes |
|---|---|---|
| Astronomy (Sun / Earth positions) | **Done, validated** | astronomy-engine; 15.5″ max vs JPL Horizons |
| Terrain horizon | **Done, validated (Sun)** | LOLA 80 m; Sun ±2 pts vs NASA maps; Earth +2.1 to +6.1 pts open. Half-pixel terrain shift fixed on 2026-11-14 |
| Visibility, windows, metrics | **Done** | contract format v1, 30-min step, set/rise times refined to the minute |
| API (FastAPI) | **Done** | `GET /sites`, `GET /horizon`, `POST /analysis`, CORS, horizon cache |
| Custom coordinates | **Done** | any lat/lon; coverage check (refused outside the map or if the 150 km horizon circle is incomplete) |
| Precomputed results | **Done** | one year (2026-11-14 → 2027-11-14) for the 16 catalogue sites in `contract/precomputed/` (static files, no server) |
| Frontend (Pole 3 app) | **Connected to the engine** | catalogue, site cards, mission analysis, timeline and comparison use the precomputed engine year; custom coordinates call the API |
| Globe lighting | **Done** | lit from the engine sub-solar point (`subsolar.json`) |
| Celestial Horizon view | **Done (data)** | true engine skyline and engine Sun / Earth positions; Pole 3 rendering kept |
| Local Terrain 3D view | **Done (data)** | real LOLA 80 m tile (20 × 20 km) for the 4 featured sites, light from the engine Sun direction; shadows from terrain beyond 10 km are not drawn (a note says so) |
| Compare sites (launch slips) | **Connected to the engine** | `MultiSiteCompareCockpit`, same engine year |
| ASTRA Copilot | **Not AI, partly inaccurate text** | pre-written answers filled with engine numbers; some fixed sentences are wrong for this project (see `docs/scientific/limitations.md`) |
| Older pages (Site Explorer, Simulator, AI Advisor…) | Not shown | still in the code but not displayed (`SHOW_MOON_VISUALIZATION_ONLY = true`); Site Explorer would use approximate numbers (`solar-data.ts`) |
| Duplicate app at the repository root (`src/`, `public/`, `package.json`) | Not used | earlier copy, not engine-based, not deployed |
| Periods outside the precomputed year | Fallback | the app falls back to its own browser calculation, which is not validated |
| Docker image (API) | **Done** | LOLA file downloaded from NASA PGDA at build with a size check; same answers as the contract; 1 year ≈ 5 s |
| Public deployment | **Done (app)** | live app: <https://astra-sn26.vercel.app/> (Vercel, static files, project root `frontend/`, redeployed on every push to `main`). The API has no public host (no payment card in the team): custom coordinates work only with the local Docker API |

## Automated tests

61 backend tests (`cd backend && python -m pytest -q`, with `ASTRA_LDEM_PATH` set to the 80 m LOLA file;
without it the 36 terrain tests are skipped). They cover the API, the coverage rule, the precomputed files,
`slice_result` and the terrain tiles (orientation checked against the LDEM).
The TypeScript `sliceResult` gives the same answer as Python on 200/200 random periods.

## Data already available
LOLA DEMs 80 / 40 / 20 m (to 80° S), 10 m (to ~83° S), 240 m (to 60° S) + counts layer;
NASA illumination maps (validation). See [`../../data/README.md`](../../data/README.md).

## Scientific uncertainties
- Earth-visibility offset vs NASA maps (+6.1 Shackleton rim, +2.9 Malapert slope, +2.1 Malapert summit),
  cause unknown. Ruled out: Earth positions, disc rule, terrain-reading shift (see
  [`../scientific/limitations.md`](../scientific/limitations.md)).
- Effect of the 2 m sensor height on an 80 m DEM not verified against an independent reference.
- 80 m and 40 m DEMs agree (Earth within 0.8 points); 20 m / 10 m DEMs not tested.
- Local Terrain view: at a grazing Sun (a few degrees) about half of the 80 m terrain facets face away from
  the Sun (Mons Malapert: 49 % at 4°, median slope 19°), so the view shows many dark patches. This is the real
  geometry, not a rendering error.

## Priority of remaining work
1. P1 — ASTRA Copilot: correct its fixed text (data sources, advice not modelled) or label it as a guide.
2. P1 — Public API host (needs a payment card or a free host with enough CPU).
3. P1 — Pole 1: Earth-visibility offset.
4. P2 — Finer DEMs (20 m / 10 m), terrain tiles for more sites.
