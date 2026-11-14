"""Check our horizon masks against NASA's published average-illumination maps.

Reference: Mazarico et al. (2011), Icarus 211, 1066-1081, doi:10.1016/j.icarus.2010.10.030
Data: https://pgda.gsfc.nasa.gov/products/69 (hourly averages over 18.6 years, version 201608)
 - Sun  : average fraction of the solar disc visible
 - Earth: fraction of time any part of the Earth's disc is visible

We compute the same 18.6-year average with OUR mask and compare.
The published maps are computed at ground level: run_sites.py must be run with --sensor 0
for a like-for-like comparison (with the default 2 m sensor, our values are higher; that
difference is physical, not an error).

Usage (from the repo root): python validation/verify_illumination.py <results_dir>
Reference values already read are cached in validation/results/nasa_illumination_reference.json.
For new sites, set NASA_ILLUM_DIR to a folder holding the two GeoTIFFs (remote reads of the
Earth file were unreliable on 2026-11-14).
Written with AI assistance (Claude); reviewed by the team.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import pyproj
import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from astra_engine.ephemeris import sun_earth_series  # noqa: E402
from astra_engine.visibility import disc_fraction, mask_at  # noqa: E402

# Local folder with the two reference GeoTIFFs (about 60 MB total) if set, else remote read.
BASE = os.environ.get("NASA_ILLUM_DIR", "/vsicurl/https://pgda.gsfc.nasa.gov/data/MoonIllumination").rstrip("/") + "/"
REF = {"sun": "AVGVISIB_85S_060M_201608.TIF", "earth": "AVGVISIB_85S_060M_201608_EARTH.TIF"}
YEARS = 18.6
STEP_MIN = 317  # "odd" step (5 h 17 min) so it does not lock onto any cycle


REF_CACHE = Path(__file__).resolve().parent / "results" / "nasa_illumination_reference.json"


def read_ref(fname, sites):
    """Published value at each site; cached in REF_CACHE so the check also runs offline."""
    cache = json.load(open(REF_CACHE, encoding="utf-8")) if REF_CACHE.exists() else {}
    missing = [s for s in sites if f"{fname}|{s['latDeg']}|{s['lonDeg']}" not in cache]
    if missing:
        with rasterio.Env(GDAL_HTTP_MAX_RETRY=5, GDAL_HTTP_RETRY_DELAY=2, GDAL_HTTP_MULTIRANGE="NO"), \
                rasterio.open(BASE + fname) as ds:
            crs = pyproj.CRS.from_wkt(ds.crs.to_wkt())
            fwd = pyproj.Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
            scale = ds.scales[0]
            for s in missing:
                x, y = fwd.transform(s["lonDeg"], s["latDeg"])
                cache[f"{fname}|{s['latDeg']}|{s['lonDeg']}"] = float(next(ds.sample([(x, y)]))[0]) * scale
        REF_CACHE.parent.mkdir(parents=True, exist_ok=True)
        json.dump(cache, open(REF_CACHE, "w", encoding="utf-8"), indent=1)
    return [cache[f"{fname}|{s['latDeg']}|{s['lonDeg']}"] for s in sites]


def long_series(site, ground_m):
    _, o = sun_earth_series(site["latDeg"], site["lonDeg"], "2008-01-01T00:00:00Z",
                            days=YEARS * 365.25, step_min=STEP_MIN, site_height_km=ground_m / 1000.0)
    return o


def averages(o, az, mask):
    sun = disc_fraction(o["sun_el"], o["sun_r"], mask_at(az, mask, o["sun_az"])).mean()
    earth = (o["earth_el"] + o["earth_r"] > mask_at(az, mask, o["earth_az"])).mean()
    return float(sun), float(earth)


def main(out):
    sites = json.load(open(out / "sites.json", encoding="utf-8"))["sites"]
    ref = {k: read_ref(f, sites) for k, f in REF.items()}
    print(f"{'site':26s} | {'Sun: ours':>10s} {'NASA':>7s} | {'Earth: ours':>11s} {'NASA':>7s} | sensor")
    rows = []
    for k, s in enumerate(sites):
        hz = json.load(open(out / f"horizon_{s['id']}.json", encoding="utf-8"))
        mask = np.array(hz["elevDeg"])
        az = np.arange(0, 360, hz["azStepDeg"])
        sun, earth = averages(long_series(s, hz["groundElevationM"]), az, mask)
        rows.append({"site": s["id"], "sensorHeightM": hz["sensorHeightM"],
                     "sun_ours": sun, "sun_pub": ref["sun"][k], "earth_ours": earth, "earth_pub": ref["earth"][k]})
        print(f"{s['id']:26s} | {sun:10.1%} {ref['sun'][k]:7.1%} | {earth:11.1%} {ref['earth'][k]:7.1%} | "
              f"{hz['sensorHeightM']} m")
    json.dump(rows, open(out / "illumination_check.json", "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
