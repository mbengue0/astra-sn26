"""One call = one full site analysis (horizon + Sun/Earth + visibility).

This is the function the future FastAPI endpoint will call.
"""
import datetime as dt

import numpy as np
import rasterio

from .ephemeris import sun_earth_series
from .horizon import site_horizon
from .visibility import build_result


def iso_times(start_utc, days, step_min):
    t0 = dt.datetime.strptime(start_utc, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    n = int(days * 24 * 60 / step_min)
    return [(t0 + dt.timedelta(minutes=i * step_min)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(n)]


def analyse_site(site, ldem_path, start_utc, days=30, step_min=30, sensor_m=2.0, d_max_m=150_000.0,
                 horizon=None):
    """Analyse one site.

    site      : dict with id, latDeg, lonDeg (south latitude negative, east longitude -180..180)
    ldem_path : path to a LOLA LDEM GeoTIFF covering the site
    horizon   : optional precomputed output of horizon.site_horizon (skips the terrain step)
    Returns (result_terrain, result_flat, horizon).
    """
    if horizon is None:
        with rasterio.open(ldem_path) as ds:
            horizon = site_horizon(ds, site["latDeg"], site["lonDeg"], sensor_m=sensor_m, d_max_m=d_max_m)
    height_km = horizon["ground_m"] / 1000.0
    _, o = sun_earth_series(site["latDeg"], site["lonDeg"], start_utc, days, step_min, site_height_km=height_km)
    times = iso_times(start_utc, days, step_min)
    fine_cache = {}

    def fine(i):
        """Sun/Earth positions every minute between times[i-1] and times[i] (computed only around changes)."""
        if i not in fine_cache:
            # (step_min + 0.5) minutes -> exactly step_min samples despite float rounding
            fine_cache[i] = sun_earth_series(site["latDeg"], site["lonDeg"], times[i - 1], (step_min + 0.5) / 1440.0,
                                             1, site_height_km=height_km)[1]
        return fine_cache[i]

    res_t = build_result(site, times, o, horizon["az"], horizon["mask"], "terrain", step_min, fine)
    res_f = build_result(site, times, o, horizon["az"], np.zeros_like(horizon["mask"]), "flat", step_min, fine)
    horizon["series"] = o
    return res_t, res_f, horizon


def horizon_json(site, horizon, sensor_m, source_name):
    return {"schemaVersion": 1, "siteId": site["id"], "azStepDeg": float(horizon["az"][1] - horizon["az"][0]),
            "elevDeg": [round(float(v), 3) for v in horizon["mask"]],
            "groundElevationM": round(horizon["ground_m"], 1), "sensorHeightM": sensor_m,
            "source": source_name,
            "generatedBy": "ASTRA-SN engine, written with AI assistance (Claude)"}
