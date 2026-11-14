"""Engine test: the coverage rule is exact at the 150 km limit (checked against real missing pixels)."""
import numpy as np
import pytest
import rasterio

from astra_engine.horizon import coverage, local_axes, read_window
from conftest import LDEM, needs_ldem


def missing_pixels_in_ray_disc(ds, lat, lon, d_max_m=150_000.0):
    x0, y0, _, _ = local_axes(ds, lat, lon)
    dem, T = read_window(ds, x0, y0, d_max_m)
    rows, cols = np.indices(dem.shape)
    xs, ys = T * (cols + 0.5, rows + 0.5)
    inside = (xs - x0) ** 2 + (ys - y0) ** 2 <= d_max_m ** 2
    return int(np.isnan(dem[inside]).sum())


@needs_ldem
@pytest.mark.parametrize("lat, lon, complete", [
    (-86.0, 0.1, True),     # Malapert
    (-84.95, 0.0, True),    # 150.8 km from the map edge
    (-84.9, 0.0, False),    # 149.2 km from the map edge
    (-84.0, 45.0, True),    # diagonal of the square map
])
def test_coverage_rule_agrees_with_missing_pixels(lat, lon, complete):
    with rasterio.open(LDEM) as ds:
        cov = coverage(ds, lat, lon)
        assert cov["complete"] is complete
        assert (missing_pixels_in_ray_disc(ds, lat, lon) == 0) is complete


@needs_ldem
@pytest.mark.parametrize("lat, lon", [(-86.0, 0.1), (-89.77967, -156.35098)])
def test_terrain_window_is_not_shifted(lat, lon):
    """Regression (2026-11-14): the ground elevation must not depend on the size of the window read."""
    from rasterio.windows import Window
    from astra_engine.horizon import elevation_at
    with rasterio.open(LDEM) as ds:
        x0, y0, _, _ = local_axes(ds, lat, lon)
        col, row = ~ds.transform * (x0, y0)
        w = Window(int(col) - 5, int(row) - 5, 11, 11)
        ref = elevation_at(ds.read(1, window=w), ds.window_transform(w), x0, y0)
        for d in (500, 2000, 5000, 150_000):
            assert elevation_at(*read_window(ds, x0, y0, d), x0, y0) == pytest.approx(ref, abs=1e-3)
