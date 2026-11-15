"""Write contract/precomputed/terrain_<siteId>.bin (+ .json) for the 3D local terrain view.

Usage (from the repository root): python backend/scripts/export_terrain_tiles.py <LDEM_80S_80MPP_ADJ.tiff> [siteId ...]
Default sites: the 4 shown in the web app. Each tile: 20 km x 20 km at the LDEM resolution (80 m -> 251 x 251),
float32 little-endian, heights in metres relative to the site ground, row 0 = north edge, col 0 = west edge,
Moon curvature included (see astra_engine.horizon.local_terrain_tile).
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from astra_engine.horizon import local_terrain_tile  # noqa: E402

ldem = sys.argv[1]
ids = sys.argv[2:] or ["shackleton_rim_high", "iau_mons_malapert", "iau_mons_mouton", "iau_haworth"]
PRE = ROOT / "contract" / "precomputed"
sites = {s["id"]: s for s in json.load(open(ROOT / "data" / "sites" / "sites.json", encoding="utf-8"))["sites"]}
with rasterio.open(ldem) as ds:
    for sid in ids:
        s = sites[sid]
        t = local_terrain_tile(ds, s["latDeg"], s["lonDeg"])
        h = t["heights"].astype("<f4")
        assert np.isfinite(h).all(), sid
        h.tofile(PRE / f"terrain_{sid}.bin")
        meta = {"schemaVersion": 1, "siteId": sid, "size": h.shape[0], "stepM": t["stepM"],
                "halfSizeM": float(t["eastM"][-1]), "groundElevationM": round(t["groundM"], 1),
                "minM": round(float(h.min()), 1), "maxM": round(float(h.max()), 1),
                "layout": "float32 little-endian, row 0 = north edge (rows go south), col 0 = west edge (cols go east)",
                "heights": "metres relative to the site ground, Moon curvature included",
                "source": f"NASA PGDA LOLA {Path(ldem).stem} (Barker et al. 2023)"}
        json.dump(meta, open(PRE / f"terrain_{sid}.json", "w", encoding="utf-8"), indent=1)
        print(f"{sid:22s} {h.shape} relief {meta['minM']:8.1f} .. {meta['maxM']:7.1f} m around the site")
