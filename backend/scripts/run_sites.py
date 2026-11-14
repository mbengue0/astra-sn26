"""Run the full analysis for every site in data/sites/sites.json.

Usage (from the backend/ folder):
    python scripts/run_sites.py <LDEM.tif> <output_dir> [--start 2026-11-14T00:00:00Z] [--days 30] [--step 30]

Writes, per site: horizon_<id>.json, result_<id>.json (contract format), plus sites.json,
_summary.json and _plot_<id>.npz (used by plots.py and the validation scripts).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from astra_engine.analysis import analyse_site, horizon_json  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]

p = argparse.ArgumentParser()
p.add_argument("ldem")
p.add_argument("out")
p.add_argument("--sites", default=str(ROOT / "data" / "sites" / "sites.json"))
p.add_argument("--start", default="2026-11-14T00:00:00Z")
p.add_argument("--days", type=float, default=30)
p.add_argument("--step", type=int, default=30, help="time step in minutes")
p.add_argument("--sensor", type=float, default=2.0, help="sensor height above ground (m)")
p.add_argument("--dmax", type=float, default=150_000.0, help="horizon ray length (m)")
a = p.parse_args()

OUT = Path(a.out)
OUT.mkdir(parents=True, exist_ok=True)
SITES = json.load(open(a.sites, encoding="utf-8"))["sites"]
source = f"NASA PGDA LOLA {Path(a.ldem).stem} (Barker et al. 2023)"

summary = []
for s in SITES:
    res_t, res_f, hz = analyse_site(s, a.ldem, a.start, a.days, a.step, a.sensor, a.dmax)
    json.dump(horizon_json(s, hz, a.sensor, source), open(OUT / f"horizon_{s['id']}.json", "w", encoding="utf-8"))
    json.dump(res_t, open(OUT / f"result_{s['id']}.json", "w", encoding="utf-8"), indent=1)
    np.savez(OUT / f"_plot_{s['id']}.npz", az=hz["az"], mask=hz["mask"], dist=hz["dist"], **hz["series"])
    summary.append({"site": s, "ground": hz["ground_m"], "terrain": res_t["metrics"], "flat": res_f["metrics"],
                    "maskMax": float(hz["mask"].max()), "maskMin": float(hz["mask"].min())})
    print(s["name"], "| ground", round(hz["ground_m"]), "m | horizon",
          round(hz["mask"].min(), 2), "..", round(hz["mask"].max(), 2), "deg")
    print("   terrain:", res_t["metrics"])
    print("   flat   :", res_f["metrics"])

json.dump({"schemaVersion": 1, "sites": SITES}, open(OUT / "sites.json", "w", encoding="utf-8"),
          indent=1, ensure_ascii=False)
json.dump(summary, open(OUT / "_summary.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
