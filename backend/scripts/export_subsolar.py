"""Write contract/precomputed/subsolar.json: hourly sub-solar point for the precomputed year.

Usage (from the repository root): python backend/scripts/export_subsolar.py
The frontend uses it to light the 3D Moon globe with the real Sun direction.
"""
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from astra_engine.ephemeris import subsolar_series  # noqa: E402

PRE = ROOT / "contract" / "precomputed"
index = json.load(open(PRE / "index.json", encoding="utf-8"))
t0, t1 = (dt.datetime.strptime(index[k], "%Y-%m-%dT%H:%M:%SZ") for k in ("startUtc", "endUtc"))
days = (t1 - t0).total_seconds() / 86400.0
lat, lon = subsolar_series(index["startUtc"], days, 60)
out = {"schemaVersion": 1, "startUtc": index["startUtc"], "stepHours": 1,
       "note": "Sub-solar point (Sun at the zenith) in the Moon-fixed frame (IAU 2015), from the ASTRA-SN engine. "
               "Degrees; longitude east -180..180.",
       "latDeg": [round(float(x), 3) for x in lat], "lonDeg": [round(float(x), 3) for x in lon]}
json.dump(out, open(PRE / "subsolar.json", "w", encoding="utf-8"), separators=(",", ":"))
print(f"{len(lat)} hours -> {PRE / 'subsolar.json'} | lat {lat.min():.2f}..{lat.max():.2f} deg")
