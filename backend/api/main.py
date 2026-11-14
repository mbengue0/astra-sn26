"""ASTRA-SN web API (Pole 2).

Run from the backend/ folder:
    uvicorn api.main:app --reload
Then open http://127.0.0.1:8000/sites or the interactive docs at http://127.0.0.1:8000/docs
"""
import json
from pathlib import Path

from fastapi import FastAPI

ROOT = Path(__file__).resolve().parents[2]
SITES_FILE = ROOT / "data" / "sites" / "sites.json"

app = FastAPI(title="ASTRA-SN API", version="0.1.0")


@app.get("/sites")
def get_sites():
    """Catalogue of candidate sites, in the contract format (contract/README.md, sites.json)."""
    with open(SITES_FILE, encoding="utf-8") as f:
        return json.load(f)
