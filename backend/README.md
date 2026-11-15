# Backend — scientific engine (Pole 2)

## `astra_engine` package

| Module | Role | Input → output |
|---|---|---|
| `ephemeris.py` | Sun and Earth seen from a lunar site | lat, lon, ground elevation, times → azimuth, elevation, apparent radius (flat Moon, no terrain) |
| `horizon.py` | Terrain skyline from a LOLA GeoTIFF | lat, lon, LDEM file → horizon elevation for each azimuth (360 values) |
| `visibility.py` | Compare the two | positions + mask → state per step, windows, metrics (contract format) |
| `analysis.py` | One call = one site analysis | `analyse_site(site, ldem_path, start, days, step)` — the function the API will call |

The horizon mask depends only on the site (terrain does not move): compute it once, reuse it
for any date. Sun/Earth positions are cheap and can be computed for any period.

## Scripts

```bash
# from backend/
python scripts/run_sites.py <LDEM.tif> ../outputs [--start 2026-11-14T00:00:00Z --days 30 --step 30 --sensor 2]
python scripts/plots.py <LDEM.tif> ../outputs
```

Sites are read from [`../data/sites/sites.json`](../data/sites/sites.json).
A 4-site, 30-day run on the 80 m map takes about 10 seconds.

## Run the API with Docker

From the repository root (the 80 m LOLA file is downloaded from NASA PGDA during the build, ~190 MB):

```bash
docker build -t astra-sn-api .
docker run -p 8080:8080 astra-sn-api        # http://localhost:8080/docs
```

Checked on 2026-11-14: inside the container, `/analysis` and `/horizon` return exactly `contract/examples/`;
a 30-day analysis takes ~1.2 s and a one-year analysis ~5 s. Set `ASTRA_CORS_ORIGINS` (`docker run -e ...`)
for a deployed frontend. No free host without a credit card was found for it yet; the public frontend can use
`contract/precomputed/` instead.

## Tests

```bash
# from backend/ — terrain tests need the 80 m LOLA file used for contract/examples/
ASTRA_LDEM_PATH=<path/to/LDEM_80S_80MPP_ADJ.tiff> python -m pytest -v
```

61 tests (about a minute): `/analysis` and `/horizon` return exactly `contract/examples/`, custom
coordinates, cache, terrain coverage rule (checked against real missing pixels), invalid requests, CORS,
minute refinement, the precomputed year and `slice_result`, the 3D terrain tiles (orientation checked against the LDEM).
Without `ASTRA_LDEM_PATH`, the terrain tests are skipped. Summary of the API work: `../docs/project/phase3_pole2.md`.

## Next steps (Pole 2)

- [x] FastAPI `GET /sites` (`api/main.py`; run from backend/: `uvicorn api.main:app --reload`)
- [x] FastAPI `POST /analysis` for catalogue sites → contract JSON (needs `ASTRA_LDEM_PATH`; identical to `contract/examples/` for the 4 sites)
- [x] `POST /analysis` with custom `latDeg`/`lonDeg` (result `siteId` = `"custom"`)
- [x] Cache horizon masks in memory per (lat, lon, LDEM file, sensor height) — repeat request ~0.7 s instead of ~2.3 s
- [x] `GET /horizon` (skyline, `horizon_<siteId>.json` format) and CORS for the local frontend (`ASTRA_CORS_ORIGINS`)
- [x] Precomputed year for every catalogue site (`scripts/precompute.py` → `../contract/precomputed/`, `slice_result`)
- [ ] Deploy the API publicly (not done: no payment card in the team; the public app uses the precomputed year)
- [x] Refine set/rise times to the minute around transitions (`tests/test_refinement.py`)
- [x] Data-coverage check (`horizon.coverage`): outside the map → 422; terrain horizon only if the whole 150 km ray disc is inside the map (80 m map: about 85° S or closer to the pole, depending on longitude), otherwise 422 suggesting `horizon="flat"`
- [x] LDEM resolution: 80 m for the horizon and the 3D terrain tiles (`scripts/export_terrain_tiles.py`); 40 m checked, see `../data/README.md`
