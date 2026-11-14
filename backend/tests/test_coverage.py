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
