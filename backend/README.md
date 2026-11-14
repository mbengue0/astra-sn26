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

## Next steps (Pole 2)

- [ ] FastAPI: `GET /sites`, `POST /analysis` (site or custom lat/lon, start, duration, step) → contract JSON
- [ ] Cache horizon masks per (site, LDEM file, sensor height)
- [ ] Refine set/rise times to the minute around transitions
- [ ] Data-coverage check for custom coordinates (outside the LDEM → clear error)
- [ ] Choose the LDEM resolution per site (see `../data/README.md`)
