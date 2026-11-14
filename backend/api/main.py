"""ASTRA-SN web API (Pole 2).

Run from the backend/ folder:
    set ASTRA_LDEM_PATH=<path/to/LDEM_80S_80MPP_ADJ.tiff>     (Windows; macOS/Linux: export ...)
    uvicorn api.main:app --reload
Then open http://127.0.0.1:8000/docs (interactive documentation).
"""
import datetime as dt
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

import rasterio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

from astra_engine.analysis import analyse_site, horizon_json
from astra_engine.horizon import coverage, site_horizon

ROOT = Path(__file__).resolve().parents[2]
SITES_FILE = ROOT / "data" / "sites" / "sites.json"
TIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
MAX_STEPS = 20_000  # e.g. 60 days at a 5-minute step; keeps one request under a few seconds

# Web pages allowed to call the API from a browser (CORS). Default: local frontend dev servers
# (Vite 5173, 3000). For a deployed frontend, set ASTRA_CORS_ORIGINS="https://site-a,https://site-b".
DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
CORS_ORIGINS = [o.strip() for o in os.environ.get("ASTRA_CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]

app = FastAPI(title="ASTRA-SN API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST"],
                   allow_headers=["Content-Type"])


def load_sites():
    with open(SITES_FILE, encoding="utf-8") as f:
        return json.load(f)


def ldem_path():
    """LOLA GeoTIFF used for the terrain horizon, given by the ASTRA_LDEM_PATH environment variable."""
    path = os.environ.get("ASTRA_LDEM_PATH")
    if not path or not Path(path).is_file():
        raise HTTPException(503, "Terrain data not configured on the server: set ASTRA_LDEM_PATH "
                                 "to a LOLA LDEM GeoTIFF (see data/README.md).")
    return path


@lru_cache(maxsize=256)
def _cached_horizon(lat_deg, lon_deg, path, file_mtime, sensor_m):
    # Terrain does not move: the horizon depends only on the point, the terrain file and the
    # sensor height, never on the date. file_mtime is part of the key so a replaced file is recomputed.
    with rasterio.open(path) as ds:
        return site_horizon(ds, lat_deg, lon_deg, sensor_m=sensor_m)


def get_horizon(lat_deg, lon_deg, path, sensor_m):
    hz = _cached_horizon(lat_deg, lon_deg, path, os.path.getmtime(path), sensor_m)
    return dict(hz)  # shallow copy: analyse_site adds keys to the dict it receives


def check_coverage(site, path, horizon_kind):
    """Refuse results the terrain data cannot support (Product spec 4.2 B and 9.1).

    - point outside the terrain map: no ground elevation, no analysis at all;
    - terrain horizon: every 150 km ray must stay inside the map, otherwise the horizon
      would be silently too low in some directions. A flat horizon is still allowed.
    """
    with rasterio.open(path) as ds:
        cov = coverage(ds, site["latDeg"], site["lonDeg"])
    name = Path(path).stem
    where = f"({site['latDeg']}, {site['lonDeg']})"
    if not cov["onMap"]:
        raise HTTPException(422, f"Site {where} is outside the terrain data ({name}). "
                                 "This map only covers the region around the lunar south pole.")
    if horizon_kind == "terrain" and not cov["complete"]:
        raise HTTPException(422, f"Terrain horizon not available for site {where}: it is "
                                 f"{cov['edgeDistanceKm']} km from the edge of {name}, but the horizon needs "
                                 f"{cov['requiredKm']:.0f} km of terrain in every direction. "
                                 "Use horizon='flat', or a site closer to the pole.")


class AnalysisRequest(BaseModel):
    """One mission analysis: a catalogue site (siteId) OR custom coordinates (latDeg + lonDeg).

    Times are UTC; contract conventions (contract/README.md): latitude south negative,
    longitude east -180..180.
    """
    siteId: Optional[str] = Field(None, examples=["malapert"])
    latDeg: Optional[float] = Field(None, ge=-90, le=90, examples=[-86.0])
    lonDeg: Optional[float] = Field(None, ge=-180, le=180, examples=[0.1])
    start: str = Field(examples=["2026-11-14T00:00:00Z"], description="UTC, format YYYY-MM-DDTHH:MM:SSZ")
    days: float = Field(30, gt=0, le=90, description="analysis period length in days")
    stepMinutes: int = Field(30, ge=1, le=1440, description="time step in minutes")
    sensorHeightM: float = Field(2.0, ge=0, le=100, description="observer height above ground (m)")
    horizon: Literal["terrain", "flat"] = "terrain"

    @field_validator("start")
    @classmethod
    def check_start(cls, v):
        try:
            dt.datetime.strptime(v, TIME_FORMAT)
        except ValueError:
            raise ValueError("start must be UTC in the format YYYY-MM-DDTHH:MM:SSZ, e.g. 2026-11-14T00:00:00Z")
        return v

    @model_validator(mode="after")
    def check_site(self):
        custom = self.latDeg is not None or self.lonDeg is not None
        if self.siteId is not None and custom:
            raise ValueError("give either siteId or latDeg + lonDeg, not both")
        if self.siteId is None and (self.latDeg is None or self.lonDeg is None):
            raise ValueError("give siteId, or both latDeg and lonDeg")
        return self

    @model_validator(mode="after")
    def check_size(self):
        steps = int(self.days * 24 * 60 / self.stepMinutes)
        if steps < 2:
            raise ValueError("the period must contain at least 2 time steps")
        if steps > MAX_STEPS:
            raise ValueError(f"too many time steps ({steps} > {MAX_STEPS}): shorten the period or use a larger step")
        return self


def resolve_site(site_id, lat_deg, lon_deg):
    """Catalogue site by id, or a custom site (id "custom") from coordinates."""
    if site_id is not None:
        site = next((s for s in load_sites()["sites"] if s["id"] == site_id), None)
        if site is None:
            raise HTTPException(404, f"Unknown siteId '{site_id}'. See GET /sites.")
        return site
    return {"id": "custom", "name": "Custom coordinates", "latDeg": lat_deg, "lonDeg": lon_deg}


@app.get("/sites")
def get_sites():
    """Catalogue of candidate sites, in the contract format (contract/README.md, sites.json)."""
    return load_sites()


@app.get("/horizon")
def get_horizon_profile(siteId: Optional[str] = Query(None, examples=["malapert"]),
                        latDeg: Optional[float] = Query(None, ge=-90, le=90),
                        lonDeg: Optional[float] = Query(None, ge=-180, le=180),
                        sensorHeightM: float = Query(2.0, ge=0, le=100)):
    """Terrain skyline of a site (horizon_<siteId>.json format): elevation for each azimuth 0..359."""
    custom = latDeg is not None or lonDeg is not None
    if (siteId is not None) == custom or (custom and (latDeg is None or lonDeg is None)):
        raise HTTPException(422, "give siteId, or both latDeg and lonDeg (not both)")
    site = resolve_site(siteId, latDeg, lonDeg)
    path = ldem_path()
    check_coverage(site, path, "terrain")
    hz = get_horizon(site["latDeg"], site["lonDeg"], path, sensorHeightM)
    return horizon_json(site, hz, sensorHeightM, f"NASA PGDA LOLA {Path(path).stem} (Barker et al. 2023)")


@app.post("/analysis")
def post_analysis(req: AnalysisRequest):
    """Full Sun/Earth visibility analysis (result_<siteId>.json format; siteId "custom" for coordinates)."""
    site = resolve_site(req.siteId, req.latDeg, req.lonDeg)
    path = ldem_path()
    check_coverage(site, path, req.horizon)
    horizon = get_horizon(site["latDeg"], site["lonDeg"], path, req.sensorHeightM)
    res_terrain, res_flat, _ = analyse_site(site, path, req.start, req.days, req.stepMinutes,
                                            sensor_m=req.sensorHeightM, horizon=horizon)
    return res_terrain if req.horizon == "terrain" else res_flat
