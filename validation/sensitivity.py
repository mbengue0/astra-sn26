"""Sensitivity of the horizon mask: ray length, sensor height, azimuth step.

(The near-field fix — rays starting at pixel/4 instead of 2 pixels — is documented in
docs/scientific/test_results.md; the old behaviour is no longer in the engine.)

For each variant, recompute the mask and the 18.6-year average illumination, and compare
with NASA's published maps (illumination_check.json from verify_illumination.py).

Usage (from the repo root): python validation/sensitivity.py <LDEM.tif> <results_dir>
Written with AI assistance (Claude); reviewed by the team.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from astra_engine.horizon import elevation_at, horizon_from_grid, local_axes, read_window  # noqa: E402
from verify_illumination import averages, long_series  # noqa: E402

LDEM, OUT = sys.argv[1], Path(sys.argv[2])
ref = {r["site"]: r for r in json.load(open(OUT / "illumination_check.json", encoding="utf-8"))}
sites = json.load(open(OUT / "sites.json", encoding="utf-8"))["sites"]

VARIANTS = [  # (name, ray length m, sensor m, azimuth step deg)
    ("reference (150 km, 0 m, 1 deg)", 150_000, 0.0, 1.0),
    ("sensor 2 m", 150_000, 2.0, 1.0),
    ("rays 300 km", 300_000, 0.0, 1.0),
    ("azimuth step 0.25 deg", 150_000, 0.0, 0.25),
]

ds = rasterio.open(LDEM)
for s in sites:
    r = ref[s["id"]]
    if r["sun_pub"] == 0:
        continue
    x0, y0, north, east = local_axes(ds, s["latDeg"], s["lonDeg"])
    print(f"\n{s['id']}  (NASA: Sun {r['sun_pub']:.1%}, Earth {r['earth_pub']:.1%})")
    o = None
    for name, dmax, sensor, step in VARIANTS:
        dem, T = read_window(ds, x0, y0, dmax)
        ground = elevation_at(dem, T, x0, y0)
        if o is None:
            o = long_series(s, ground)
        az, mask, _ = horizon_from_grid(dem, T, x0, y0, north, east, ground + sensor,
                                        az_step=step, d_max_m=dmax)
        sun, earth = averages(o, az, mask)
        print(f"   {name:32s} Sun {sun:6.1%} ({(sun - r['sun_pub']) * 100:+5.1f} pts)"
              f"   Earth {earth:6.1%} ({(earth - r['earth_pub']) * 100:+5.1f} pts)")
