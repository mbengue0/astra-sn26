"""Cutting a period out of a precomputed long result must equal a direct analysis of that period."""
import pytest
import rasterio

from astra_engine.analysis import analyse_site
from astra_engine.horizon import site_horizon
from astra_engine.visibility import slice_result
from conftest import LDEM, needs_ldem

SITE = {"id": "malapert_summit", "latDeg": -85.98763, "lonDeg": 2.0528}
LONG_START, LONG_DAYS = "2026-11-14T00:00:00Z", 90


@pytest.fixture(scope="module")
def long_result():
    with rasterio.open(LDEM) as ds:
        hz = site_horizon(ds, SITE["latDeg"], SITE["lonDeg"], sensor_m=2.0)
    return analyse_site(SITE, LDEM, LONG_START, LONG_DAYS, 30, horizon=dict(hz))[0], hz


@needs_ldem
@pytest.mark.parametrize("start, days", [
    ("2026-11-14T00:00:00Z", 30),   # beginning of the long period
    ("2026-12-01T00:00:00Z", 13),   # Earth set + rise and Sun set + rise inside
    ("2026-12-05T13:30:00Z", 4.5),  # starts and ends in the middle of windows
    ("2027-01-20T00:00:00Z", 22),   # ends exactly at the end of the long period
])
def test_slice_equals_direct_analysis(long_result, start, days):
    res, hz = long_result
    import datetime as dt
    end = (dt.datetime.strptime(start, "%Y-%m-%dT%H:%M:%SZ") + dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    direct = analyse_site(SITE, LDEM, start, days, 30, horizon=dict(hz))[0]
    assert slice_result(res, start, end) == direct


@needs_ldem
def test_slice_refuses_off_grid_or_outside(long_result):
    res, _ = long_result
    with pytest.raises(ValueError):
        slice_result(res, "2026-11-20T00:10:00Z", "2026-11-25T00:00:00Z")   # not on the 30-min grid
    with pytest.raises(ValueError):
        slice_result(res, "2026-11-20T00:00:00Z", "2027-06-01T00:00:00Z")   # beyond the long period


# ---------- the precomputed files stored in contract/precomputed/ (no terrain file needed) ----------

def test_precomputed_files_cover_the_catalogue_and_match_the_examples():
    import json
    from conftest import ROOT, contract_example
    pre = ROOT / "contract" / "precomputed"
    index = json.load(open(pre / "index.json", encoding="utf-8"))
    catalogue = json.load(open(ROOT / "data" / "sites" / "sites.json", encoding="utf-8"))["sites"]
    assert index["sites"] == catalogue
    for s in catalogue:
        assert (pre / f"result_{s['id']}.json").exists() and (pre / f"horizon_{s['id']}.json").exists()
    for sid in ("malapert", "shackleton_rim_high"):
        year = json.load(open(pre / f"result_{sid}.json", encoding="utf-8"))
        assert year["times"][0] == index["startUtc"]
        assert slice_result(year, "2026-11-14T00:00:00Z", "2026-12-14T00:00:00Z") == contract_example(f"result_{sid}.json")


def test_subsolar_point_agrees_with_site_sun_elevations():
    """The sub-solar file (used to light the 3D globe) must agree with the validated site Sun elevations."""
    import json
    import math
    from conftest import ROOT
    pre = ROOT / "contract" / "precomputed"
    sub = json.load(open(pre / "subsolar.json", encoding="utf-8"))
    for sid in ("iau_mons_malapert", "shackleton_rim_high", "iau_mons_mouton"):
        res = json.load(open(pre / f"result_{sid}.json", encoding="utf-8"))
        site = next(s for s in json.load(open(pre / "index.json", encoding="utf-8"))["sites"] if s["id"] == sid)
        la, lo = math.radians(site["latDeg"]), math.radians(site["lonDeg"])
        up = (math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la))
        for h in range(0, len(sub["latDeg"]), 97):               # about 90 hours spread over the year
            sla, slo = math.radians(sub["latDeg"][h]), math.radians(sub["lonDeg"][h])
            s = (math.cos(sla) * math.cos(slo), math.cos(sla) * math.sin(slo), math.sin(sla))
            el = math.degrees(math.asin(sum(a * b for a, b in zip(up, s))))
            assert abs(el - res["sun"]["elevDeg"][2 * h]) < 0.01   # results use a 30-min step
