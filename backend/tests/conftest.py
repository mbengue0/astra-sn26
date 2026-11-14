"""Shared test setup. Run from backend/:  python -m pytest -v

Tests that need the LOLA terrain file are skipped unless ASTRA_LDEM_PATH points to
LDEM_80S_80MPP_ADJ.tiff (the file used for contract/examples/).
"""
import json
import os
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient  # noqa: E402

from api.main import app  # noqa: E402

LDEM = os.environ.get("ASTRA_LDEM_PATH")
needs_ldem = pytest.mark.skipif(
    not LDEM or not Path(LDEM).is_file() or "80S_80MPP" not in Path(LDEM).name,
    reason="set ASTRA_LDEM_PATH to LDEM_80S_80MPP_ADJ.tiff to run terrain tests",
)
CATALOGUE_IDS = ["shackleton_coords_proto", "shackleton_rim_high", "malapert", "malapert_summit"]
START = "2026-11-14T00:00:00Z"  # same settings as contract/examples/ (30 days, 30-minute step, 2 m sensor)


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


def contract_example(name):
    with open(ROOT / "contract" / "examples" / name, encoding="utf-8") as f:
        return json.load(f)
