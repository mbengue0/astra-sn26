# Phase 3 — Pole 2 summary: the engine is connected through an API

Execution plan, Phase 3 (Saturday 14:30–17:00): *"Connect the scientific engine to the existing application."*
Pole 2 delivers a web API (FastAPI, as recommended in the Product & Technical Specification §8.2)
that returns the **same JSON as [`contract/examples/`](../../contract/examples/)**, so the frontend (Pole 3)
can switch from the example files to live results without changing its code.

## What the API does

| Endpoint | Question it answers | Answer format |
|---|---|---|
| `GET /sites` | Which candidate sites exist? | `sites.json` |
| `GET /horizon?siteId=malapert` (or `?latDeg=-86&lonDeg=0.1`) | What does the terrain skyline look like from this site? | `horizon_<siteId>.json` |
| `POST /analysis` | When are the Sun and the Earth visible from this site during this period? | `result_<siteId>.json` |

`POST /analysis` request:

```json
{ "siteId": "malapert", "start": "2026-11-14T00:00:00Z", "days": 30, "stepMinutes": 30 }
```

or, for any point, `"latDeg": -86.0, "lonDeg": 0.1` instead of `siteId` (the result then has `siteId: "custom"`).
Optional: `sensorHeightM` (default 2), `horizon`: `"terrain"` (default) or `"flat"`.

**Comparing scenarios** (same site / two dates, or two sites / same date) needs nothing new:
the frontend calls `POST /analysis` twice and shows the two results side by side.

## Safeguards

| Situation | Answer |
|---|---|
| Unknown site | 404 with a pointer to `GET /sites` |
| Wrong inputs (date format, negative period, latitude −95, …) | 422 with an explanation |
| More than 20,000 time steps in one request | 422 (keeps answers within seconds) |
| Point outside the terrain map | 422 "outside the terrain data" |
| Terrain incomplete around the point (the 150 km horizon rays leave the map) | 422 for the terrain horizon; `"flat"` still allowed |
| Terrain file not configured on the server | 503 |

Why the coverage rule matters: outside the map the terrain height is unknown. Before this rule the engine
ignored those samples silently, so the horizon looked lower than it is. With the 80 m map (a ±304 km square
around the pole) terrain analysis works down to about 85° S; the exact limit depends on longitude.

## Speed

The terrain horizon does not depend on the date, so it is computed once per site and kept in memory.

| Request (30 days, 30-minute step) | Time measured |
|---|---|
| First request for a site | ~2.3 s |
| Same site again, any date | ~0.7 s |
| Heaviest allowed request (60 days, 5-minute step) | ~8 s |
| One year (366 days, 30-minute step, the maximum period) | ~6 s, 1.4 MB answer |

The memory cache is emptied when the server restarts.

## How it was checked

51 automated tests (`backend/tests/`, run with `python -m pytest -v` from `backend/`):

- for the 4 catalogue sites, `/analysis` and `/horizon` return **exactly** the files in `contract/examples/`
  (themselves validated against JPL Horizons and NASA illumination maps, see
  [`../scientific/test_results.md`](../scientific/test_results.md));
- custom coordinates of Malapert give the same result as the catalogue site;
- the coverage rule agrees with the real missing pixels at the 150 km limit (−84.95° accepted, −84.9° refused);
- every error case above;
- CORS: the local frontend (`http://localhost:5173` or `:3000`) may call the API from a browser; unknown websites may not.

The tests were also run against deliberately broken code: removing the coverage rule makes 3 tests fail,
changing the default sensor height makes 5 fail. A manual check on a running server gave the same answers.

## How to run it

From `backend/`, with the 80 m LOLA file (see [`../../data/README.md`](../../data/README.md)):

```bash
ASTRA_LDEM_PATH=<path/to/LDEM_80S_80MPP_ADJ.tiff> uvicorn api.main:app --reload
```

Interactive documentation: http://127.0.0.1:8000/docs. For a deployed frontend, list its address in
`ASTRA_CORS_ORIGINS` (comma-separated).

## Not done (next phases)

- **Public deployment of the API** — not done (no payment card in the team). The public app
  (<https://astra-sn26.vercel.app/>) uses the precomputed year instead; the API runs locally with Docker
  (decision 12 in [`decisions_log.md`](decisions_log.md)).
- ~~Set/rise times to the minute~~: done after Phase 3 (see `../scientific/test_results.md`, section 4).
- Earth horizon check +2 to +6 points vs NASA maps — open question (Pole 1).
- Pole 3 to confirm the new value `siteId: "custom"` in the contract.
