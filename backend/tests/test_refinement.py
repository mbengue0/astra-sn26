"""Rise/set times refined to the minute must equal a full minute-by-minute calculation."""
import pytest
import rasterio

from astra_engine.analysis import analyse_site
from astra_engine.horizon import site_horizon
from conftest import LDEM, needs_ldem

MALAPERT_SUMMIT = {"id": "malapert_summit", "latDeg": -85.98763, "lonDeg": 2.0528}


@needs_ldem
@pytest.mark.parametrize("step", [30, 13])   # 13: a step where float rounding used to drop a minute
def test_refined_windows_equal_minute_by_minute(step):
    with rasterio.open(LDEM) as ds:
        hz = site_horizon(ds, MALAPERT_SUMMIT["latDeg"], MALAPERT_SUMMIT["lonDeg"], sensor_m=2.0)
    start, days = "2026-12-01T00:00:00Z", 13  # Earth set + rise, Sun set + rise at this site
    fast, _, _ = analyse_site(MALAPERT_SUMMIT, LDEM, start, days, step, horizon=dict(hz))
    ref, _, _ = analyse_site(MALAPERT_SUMMIT, LDEM, start, days, 1, horizon=dict(hz))
    assert fast["windows"] == ref["windows"]
    assert sum(len(w) for w in ref["windows"].values()) >= 4   # the test really contains changes
    for k in ("nextSunsetUtc", "nextEarthsetUtc", "sunlitHours", "earthVisibleHours", "bothHours"):
        assert fast["metrics"][k] == ref["metrics"][k]
