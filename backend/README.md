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

## Tests

```bash
# from backend/ — terrain tests need the 80 m LOLA file used for contract/examples/
ASTRA_LDEM_PATH=<path/to/LDEM_80S_80MPP_ADJ.tiff> python -m pytest -v
```

26 tests (about 30 s): the API returns exactly `contract/examples/`, custom coordinates,
cache, terrain coverage rule (checked against real missing pixels), invalid requests.
Without `ASTRA_LDEM_PATH`, the 15 terrain tests are skipped and 11 run.

## Next steps (Pole 2)

- [x] FastAPI `GET /sites` (`api/main.py`; run from backend/: `uvicorn api.main:app --reload`)
- [x] FastAPI `POST /analysis` for catalogue sites → contract JSON (needs `ASTRA_LDEM_PATH`; identical to `contract/examples/` for the 4 sites)
- [x] `POST /analysis` with custom `latDeg`/`lonDeg` (result `siteId` = `"custom"`)
- [x] Cache horizon masks in memory per (lat, lon, LDEM file, sensor height) — repeat request ~0.7 s instead of ~2.3 s
- [ ] Refine set/rise times to the minute around transitions
- [x] Data-coverage check (`horizon.coverage`): outside the map → 422; terrain horizon only if the whole 150 km ray disc is inside the map (80 m map: about 85° S or closer to the pole, depending on longitude), otherwise 422 suggesting `horizon="flat"`
- [ ] Choose the LDEM resolution per site (see `../data/README.md`)
