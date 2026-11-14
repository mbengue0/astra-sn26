"""Precompute one year of results for every catalogue site (static files, no server needed).

Usage (from the backend/ folder):
    python scripts/precompute.py <LDEM_80S_80MPP_ADJ.tiff> <output_dir> [--start 2026-11-14T00:00:00Z] [--days 365]

Writes, in <output_dir>:
  index.json             period, step, sensor height, terrain source, list of sites
  result_<siteId>.json   contract format (contract/README.md), terrain horizon, whole period
  horizon_<siteId>.json  contract format
A shorter period is cut from these files with astra_engine.visibility.slice_result (same answer as a
direct analysis of that period, see tests/test_precompute.py).
"""
import argparse
import datetime as dt
import json
import sys
import time
from pathlib import Path

import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from astra_engine import __version__  # noqa: E402
from astra_engine.analysis import analyse_site, horizon_json  # noqa: E402
from astra_engine.horizon import site_horizon  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]

p = argparse.ArgumentParser()
p.add_argument("ldem")
p.add_argument("out")
p.add_argument("--sites", default=str(ROOT / "data" / "sites" / "sites.json"))
p.add_argument("--start", default="2026-11-14T00:00:00Z")
p.add_argument("--days", type=int, default=365)
p.add_argument("--step", type=int, default=30, help="time step in minutes")
p.add_argument("--sensor", type=float, default=2.0, help="sensor height above ground (m)")
a = p.parse_args()

out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
sites = json.load(open(a.sites, encoding="utf-8"))["sites"]
source = f"NASA PGDA LOLA {Path(a.ldem).stem} (Barker et al. 2023)"
compact = {"separators": (",", ":"), "ensure_ascii": False}

for s in sites:
    t = time.time()
    with rasterio.open(a.ldem) as ds:
        hz = site_horizon(ds, s["latDeg"], s["lonDeg"], sensor_m=a.sensor)
    res, _, hz = analyse_site(s, a.ldem, a.start, a.days, a.step, sensor_m=a.sensor, horizon=hz)
    json.dump(res, open(out / f"result_{s['id']}.json", "w", encoding="utf-8"), **compact)
    json.dump(horizon_json(s, hz, a.sensor, source), open(out / f"horizon_{s['id']}.json", "w", encoding="utf-8"), **compact)
    print(f"{s['id']:26s} {time.time() - t:5.1f} s")

end = (dt.datetime.strptime(a.start, "%Y-%m-%dT%H:%M:%SZ") + dt.timedelta(days=a.days)).strftime("%Y-%m-%dT%H:%M:%SZ")
index = {"schemaVersion": 1, "startUtc": a.start, "endUtc": end, "stepMinutes": a.step,
         "sensorHeightM": a.sensor, "horizon": "terrain", "terrainSource": source,
         "engineVersion": __version__, "sites": sites,
         "files": {"result": "result_<siteId>.json", "horizon": "horizon_<siteId>.json"}}
json.dump(index, open(out / "index.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
