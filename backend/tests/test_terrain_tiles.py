"""The 3D terrain tiles (contract/precomputed/terrain_<id>.bin) must be the real LOLA terrain, correctly oriented."""
import json

import numpy as np
import pytest
import rasterio

from astra_engine.ephemeris import R_MOON_KM
from astra_engine.horizon import local_axes, read_window
from conftest import LDEM, ROOT, needs_ldem

PRE = ROOT / "contract" / "precomputed"
IDS = ["shackleton_rim_high", "iau_mons_malapert", "iau_mons_mouton", "iau_haworth"]


def load_tile(sid):
    meta = json.load(open(PRE / f"terrain_{sid}.json", encoding="utf-8"))
    h = np.fromfile(PRE / f"terrain_{sid}.bin", dtype="<f4").reshape(meta["size"], meta["size"])
    return meta, h


@pytest.mark.parametrize("sid", IDS)
def test_tile_files_are_complete(sid):
    meta, h = load_tile(sid)
    c = meta["size"] // 2
    assert h.shape == (251, 251) and np.isfinite(h).all()
    assert abs(h[c, c]) < 0.01                       # heights are relative to the site ground
    assert meta["minM"] == round(float(h.min()), 1) and meta["maxM"] == round(float(h.max()), 1)


@needs_ldem
@pytest.mark.parametrize("sid", IDS)
def test_tile_orientation_gives_the_engine_skyline(sid):
    """Skyline traced in the tile == skyline traced in the LDEM with the engine axes, for terrain 1-9.5 km away.
    A wrong orientation (north/east swapped or mirrored) would change it by degrees. The first kilometre is left
    out: the tile is a resampling of the map, and next to the observer 1 m of smoothing already moves the angle
    by tenths of a degree."""
    from scipy.ndimage import map_coordinates
    meta, h = load_tile(sid)
    site = next(s for s in json.load(open(ROOT / "data" / "sites" / "sites.json", encoding="utf-8"))["sites"] if s["id"] == sid)
    step, c = meta["stepM"], meta["size"] // 2
    d = np.arange(1000.0, 9500.0, step / 2)
    a = np.radians(np.arange(360.0))[:, None]
    e, n = np.sin(a) * d, np.cos(a) * d                         # azimuth 0 = north, clockwise
    drop = d ** 2 / (2 * R_MOON_KM * 1000.0)
    z_tile = map_coordinates(h.astype(float), [(c - n / step).ravel(), (c + e / step).ravel()], order=1).reshape(e.shape)
    sky_tile = np.degrees(np.arctan2(z_tile - 2.0, d)).max(axis=1)        # tile heights already include the drop
    with rasterio.open(LDEM) as ds:
        x0, y0, north, east = local_axes(ds, site["latDeg"], site["lonDeg"])
        dem, T = read_window(ds, x0, y0, 10_000.0)
        X, Y = x0 + e * east[0] + n * north[0], y0 + e * east[1] + n * north[1]
        col, row = ~T * (X, Y)
        z_dem = map_coordinates(dem, [row.ravel() - 0.5, col.ravel() - 0.5], order=1).reshape(e.shape)
    sky_dem = np.degrees(np.arctan2(z_dem - meta["groundElevationM"] - 2.0 - drop, d)).max(axis=1)
    diff = np.abs(sky_tile - sky_dem)
    # resampling on steep crater walls: a few metres -> up to ~0.2 deg; a wrong orientation -> several degrees
    assert np.median(diff) < 0.02 and diff.max() < 0.3
