# Validation (Pole 1)

Independent checks of the engine. Run from the repository root, after
`backend/scripts/run_sites.py` has produced a results folder.

| Script | What it checks | Reference | Network |
|---|---|---|---|
| `compare_horizons.py <results> [--plot SITE]` | Sun / Earth azimuth and elevation, every 6 h | JPL Horizons API (`CENTER=coord@301`, geodetic site coordinates, airless apparent az/el) | only for sites/dates not in `results/horizons_cache/` |
| `verify_illumination.py <results>` | 18.6-year average Sun / Earth visibility with our horizon mask | NASA polar illumination maps (Mazarico et al. 2011) | only for sites not in `results/nasa_illumination_reference.json` |
| `sensitivity.py <LDEM> <results>` | effect of ray length, sensor height, azimuth step | same maps | no (after the previous script) |

`verify_illumination.py` must be run on a results folder computed **at ground level**
(`run_sites.py ... --sensor 0`), because the NASA maps are computed at ground level.

## Results stored here

- `results/horizons_check.json` — differences with Horizons (arcseconds), 4 sites × 30 days.
- `results/illumination_check.json` — our averages vs NASA maps, sensor at 0 m.
- `results/figures/4_horizons_check_*.png` — our curves (lines) vs Horizons (points).
- `results/horizons_cache/` — raw Horizons answers, so anyone can re-run offline.

Summary and interpretation: [`../docs/scientific/test_results.md`](../docs/scientific/test_results.md).
