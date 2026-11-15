"""Sun and Earth positions seen from a site on the Moon (topocentric azimuth / elevation).

Pipeline for each time step:
  1. astronomy-engine gives the Moon and the Sun as seen from the Earth's centre (J2000 / EQJ frame).
  2. Change the origin to the Moon's centre: Sun - Moon, and Earth = -Moon.
  3. Rotate into the Moon-fixed frame (IAU 2015 rotation model), where latitude/longitude are fixed.
  4. Subtract the site position (Moon radius + ground elevation).
  5. Project onto the local Up / East / North axes -> elevation and azimuth.

Validated against JPL Horizons: max sky separation 15 arcsec over 4 sites x 30 days
(see validation/README.md).

Written with AI assistance (Claude); reviewed by the team.
"""
import math

import astronomy as ae
import numpy as np

AU_KM = 149_597_870.7
R_MOON_KM = 1737.4
R_SUN_KM = 695_700.0
R_EARTH_KM = 6371.0


def _r3(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, s, 0], [-s, c, 0], [0, 0, 1]])


def _r1(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, s], [0, -s, c]])


def moon_fixed_matrix(t):
    """Rotation matrix J2000 (EQJ) -> Moon-fixed frame (IAU 2015 model)."""
    ax = ae.RotationAxis(ae.Body.Moon, t)
    a, d, w = map(math.radians, (ax.ra * 15.0, ax.dec, ax.spin))
    return _r3(w) @ _r1(math.pi / 2 - d) @ _r3(math.pi / 2 + a)


def site_frame(lat_deg, lon_deg):
    """Unit vectors Up, East, North of the site, in the Moon-fixed frame."""
    la, lo = math.radians(lat_deg), math.radians(lon_deg)
    up = np.array([math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)])
    east = np.array([-math.sin(lo), math.cos(lo), 0.0])
    north = np.cross(up, east)
    return up, east, north


def sun_earth_series(lat_deg, lon_deg, start_utc, days=30, step_min=30, site_height_km=0.0):
    """Elevation, azimuth and apparent radius (degrees) of the Sun and the Earth.

    Returns (times, out) where `times` are astronomy-engine Time objects and `out` holds
    numpy arrays: sun_el, sun_az, sun_r, earth_el, earth_az, earth_r.
    Azimuth: 0 = north, clockwise. Elevation: 0 = flat horizontal plane (no terrain).
    """
    up, east, north = site_frame(lat_deg, lon_deg)
    site_pos = up * (R_MOON_KM + site_height_km)
    t0 = ae.Time.Parse(start_utc)
    n = int(days * 24 * 60 / step_min)
    out = {k: np.empty(n) for k in ("sun_el", "sun_az", "sun_r", "earth_el", "earth_az", "earth_r")}
    times = []
    for i in range(n):
        t = t0.AddDays(i * step_min / 1440.0)
        times.append(t)
        M = moon_fixed_matrix(t)
        moon = ae.GeoMoon(t)
        sun = ae.GeoVector(ae.Body.Sun, t, True)
        moon_km = np.array([moon.x, moon.y, moon.z]) * AU_KM
        sun_km = np.array([sun.x, sun.y, sun.z]) * AU_KM
        for name, vec, radius in (("sun", sun_km - moon_km, R_SUN_KM), ("earth", -moon_km, R_EARTH_KM)):
            v = M @ vec - site_pos  # from the site to the body, Moon-fixed frame
            dist = np.linalg.norm(v)
            u = v / dist
            out[f"{name}_el"][i] = math.degrees(math.asin(np.clip(u @ up, -1, 1)))
            out[f"{name}_az"][i] = math.degrees(math.atan2(u @ east, u @ north)) % 360
            out[f"{name}_r"][i] = math.degrees(math.asin(radius / dist))
    return times, out


def subsolar_series(start_utc, days, step_min=60):
    """Sub-solar point on the Moon (where the Sun is at the zenith), in the Moon-fixed frame.

    Same chain as sun_earth_series (astronomy-engine, IAU 2015 Moon rotation), seen from the Moon's
    centre. Used to light the 3D globe with the real Sun direction.
    Returns (lat_deg, lon_deg) numpy arrays; longitude east -180..180.
    """
    t0 = ae.Time.Parse(start_utc)
    n = int(days * 24 * 60 / step_min)
    lat, lon = np.empty(n), np.empty(n)
    for i in range(n):
        t = t0.AddDays(i * step_min / 1440.0)
        moon = ae.GeoMoon(t)
        sun = ae.GeoVector(ae.Body.Sun, t, True)
        v = moon_fixed_matrix(t) @ (np.array([sun.x - moon.x, sun.y - moon.y, sun.z - moon.z]))
        v /= np.linalg.norm(v)
        lat[i] = math.degrees(math.asin(v[2]))
        lon[i] = math.degrees(math.atan2(v[1], v[0]))
    return lat, lon
