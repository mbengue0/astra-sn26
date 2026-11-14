"""ASTRA-SN web API (Pole 2).

Run from the backend/ folder:
    set ASTRA_LDEM_PATH=<path/to/LDEM_80S_80MPP_ADJ.tiff>     (Windows; macOS/Linux: export ...)
    uvicorn api.main:app --reload
Then open http://127.0.0.1:8000/docs (interactive documentation).
"""
import datetime as dt
import json
import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from astra_engine.analysis import analyse_site

ROOT = Path(__file__).resolve().parents[2]
SITES_FILE = ROOT / "data" / "sites" / "sites.json"
TIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
MAX_STEPS = 20_000  # e.g. 60 days at a 5-minute step; keeps one request under a few seconds

app = FastAPI(title="ASTRA-SN API", version="0.1.0")


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


class AnalysisRequest(BaseModel):
    """One mission analysis. Times are UTC, contract conventions (contract/README.md)."""
    siteId: str = Field(examples=["malapert"])
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
    def check_size(self):
        steps = int(self.days * 24 * 60 / self.stepMinutes)
        if steps < 2:
            raise ValueError("the period must contain at least 2 time steps")
        if steps > MAX_STEPS:
            raise ValueError(f"too many time steps ({steps} > {MAX_STEPS}): shorten the period or use a larger step")
        return self


@app.get("/sites")
def get_sites():
    """Catalogue of candidate sites, in the contract format (contract/README.md, sites.json)."""
    return load_sites()


@app.post("/analysis")
def post_analysis(req: AnalysisRequest):
    """Full Sun/Earth visibility analysis for one catalogue site (result_<siteId>.json format)."""
    site = next((s for s in load_sites()["sites"] if s["id"] == req.siteId), None)
    if site is None:
        raise HTTPException(404, f"Unknown siteId '{req.siteId}'. See GET /sites.")
    res_terrain, res_flat, _ = analyse_site(site, ldem_path(), req.start, req.days, req.stepMinutes,
                                            sensor_m=req.sensorHeightM)
    return res_terrain if req.horizon == "terrain" else res_flat
