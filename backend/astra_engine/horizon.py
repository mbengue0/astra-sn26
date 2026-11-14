"""Terrain horizon mask from a LOLA elevation model (LDEM, polar stereographic GeoTIFF).

The horizon mask is the elevation angle of the terrain skyline in each azimuth direction.
It is computed once per site (terrain does not move) and reused for every time step.

Validated against NASA polar illumination maps (Mazarico et al. 2011): Sun within
+/-2 points of average illumination at ground level (see validation/README.md).

Written with AI assistance (Claude); reviewed by the team.
"""
import numpy as np
import pyproj
from rasterio.windows import from_bounds
from scipy.ndimage import map_coordinates

from .ephemeris import R_MOON_KM


def elevation_at(dem, transform, x, y):
    """Ground elevation (m) at the exact point (x, y), bilinear interpolation.

    Same method as the horizon rays: on a slope, the nearest pixel can differ by metres.
    """
    col, row = ~transform * (x, y)
    return float(map_coordinates(dem, [[row - 0.5], [col - 0.5]], order=1,
                                 mode="constant", cval=np.nan)[0])


def local_axes(ds, lat_deg, lon_deg):
    """Site position (x0, y0) in map metres and the local north / east unit vectors in the map plane.

    Near the pole, "north" points in a different map direction for every site
    (it always points toward the pole), so it must be computed per site.
    """
    crs = pyproj.CRS.from_wkt(ds.crs.to_wkt())
    fwd = pyproj.Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
    x0, y0 = fwd.transform(lon_deg, lat_deg)
    e = 1e-4
    xn, yn = fwd.transform(lon_deg, lat_deg + e)
    xe, ye = fwd.transform(lon_deg + e / max(np.cos(np.radians(lat_deg)), 1e-6), lat_deg)
    north = np.array([xn - x0, yn - y0]); north /= np.linalg.norm(north)
    east = np.array([xe - x0, ye - y0]); east /= np.linalg.norm(east)
    return x0, y0, north, east


def read_window(ds, x0, y0, d_max_m):
    """Read the square of terrain around the site needed for rays of length d_max_m."""
    pad = d_max_m + 1000
    w = from_bounds(x0 - pad, y0 - pad, x0 + pad, y0 + pad, ds.transform)
    dem = ds.read(1, window=w, boundless=True, fill_value=np.nan)
    return dem, ds.window_transform(w)


def horizon_from_grid(dem, transform, x0, y0, north_xy, east_xy, h0,
                      az_step=1.0, d_max_m=150_000.0, d_step_m=None, near_m=2000.0):
    """Horizon elevation (degrees) in each direction around (x0, y0).

    dem        : 2D array of elevations (m)
    transform  : rasterio affine transform of that window
    north_xy, east_xy : local north and east directions in the map plane
    h0         : observer elevation (m) = ground + sensor height
    near_m     : near zone (m) sampled finely (step = pixel / 4), starting at pixel / 4.
                 Checked against Mazarico et al. 2011: starting the rays at 2 pixels made
                 the mask too optimistic (up to +4 points of illumination at Malapert).
    Returns (azimuths, mask elevations, distance of the skyline point) as numpy arrays.
    """
    inv = ~transform
    px = abs(transform.a)
    d_step = d_step_m or px
    near_m = min(near_m, d_max_m)
    d = np.concatenate([np.arange(px / 4, near_m, px / 4), np.arange(near_m, d_max_m, d_step)])
    az = np.arange(0, 360, az_step)
    a = np.radians(az)[:, None]
    dx = np.cos(a) * north_xy[0] + np.sin(a) * east_xy[0]
    dy = np.cos(a) * north_xy[1] + np.sin(a) * east_xy[1]
    X = x0 + dx * d[None, :]
    Y = y0 + dy * d[None, :]
    col, row = inv * (X, Y)
    h = map_coordinates(dem, [row.ravel() - 0.5, col.ravel() - 0.5], order=1,
                        mode="constant", cval=np.nan).reshape(X.shape)
    drop = d ** 2 / (2 * R_MOON_KM * 1000.0)          # curvature of the Moon
    ang = np.degrees(np.arctan2(h - h0 - drop[None, :], d[None, :]))
    ang = np.where(np.isnan(ang), -90.0, ang)
    return az, ang.max(axis=1), d[ang.argmax(axis=1)]


def site_horizon(ds, lat_deg, lon_deg, sensor_m=2.0, d_max_m=150_000.0, az_step=1.0):
    """Convenience wrapper: ground elevation and horizon mask for one site.

    Returns dict(ground_m, az, mask, dist).
    """
    x0, y0, north, east = local_axes(ds, lat_deg, lon_deg)
    dem, T = read_window(ds, x0, y0, d_max_m)
    ground = elevation_at(dem, T, x0, y0)
    az, mask, dist = horizon_from_grid(dem, T, x0, y0, north, east, ground + sensor_m,
                                       az_step=az_step, d_max_m=d_max_m)
    return {"ground_m": ground, "az": az, "mask": mask, "dist": dist}
