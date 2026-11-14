"""Compare Sun / Earth positions with the terrain horizon -> states, windows, metrics.

Output follows the shared JSON contract (contract/README.md, schemaVersion 1).

Rules (team decision):
  - state per time step: "visible" (whole disc above the skyline), "partial", "hidden".
  - windows and metrics use the disc CENTRE above the skyline.

Written with AI assistance (Claude); reviewed by the team.
"""
import numpy as np


def disc_fraction(el, r, hz):
    """Fraction of a disc (centre elevation el, radius r) above a locally flat skyline hz."""
    h = np.clip((el - hz) / r, -1, 1)
    return 1 - (np.arccos(h) - h * np.sqrt(1 - h * h)) / np.pi


def state(el, r, hz):
    """visible (whole disc), partial (part of it), hidden (none)."""
    return np.where(el - r > hz, "visible", np.where(el + r > hz, "partial", "hidden"))


def mask_at(mask_az, mask_el, az):
    """Horizon elevation in direction az (linear interpolation, wraps at 360)."""
    return np.interp(np.asarray(az) % 360, np.append(mask_az, 360), np.append(mask_el, mask_el[0]))


def windows(vis, times):
    out, start = [], None
    for i, v in enumerate(list(vis) + [False]):
        if v and start is None:
            start = i
        if not v and start is not None:
            out.append({"startUtc": times[start], "endUtc": times[min(i, len(times) - 1)]})
            start = None
    return out


def _longest_false_run(v):
    run = best = 0
    for x in v:
        run = 0 if x else run + 1
        best = max(best, run)
    return best


def _next_set(v, times):
    for i in range(1, len(v)):
        if v[i - 1] and not v[i]:
            return times[i]
    return None


def build_result(site, times, o, mask_az, mask_el, horizon_kind, step_min):
    """Assemble the result in the contract format (schemaVersion 1).

    site         : dict with at least "id"
    times        : list of ISO UTC strings
    o            : output of ephemeris.sun_earth_series
    horizon_kind : "terrain" (LOLA mask) or "flat" (mask of zeros)
    """
    hz_sun, hz_earth = mask_at(mask_az, mask_el, o["sun_az"]), mask_at(mask_az, mask_el, o["earth_az"])
    sun_vis = o["sun_el"] > hz_sun          # centre rule for the metrics
    earth_vis = o["earth_el"] > hz_earth
    both = sun_vis & earth_vis
    h = step_min / 60.0
    r3 = lambda a: [round(float(x), 3) for x in a]
    return {
        "schemaVersion": 1,
        "siteId": site["id"],
        "horizon": horizon_kind,
        "stepMinutes": step_min,
        "times": times,
        "sun": {"elevDeg": r3(o["sun_el"]), "azDeg": r3(o["sun_az"]),
                "horizonDeg": r3(hz_sun),
                "state": state(o["sun_el"], o["sun_r"], hz_sun).tolist()},
        "earth": {"elevDeg": r3(o["earth_el"]), "azDeg": r3(o["earth_az"]),
                  "horizonDeg": r3(hz_earth),
                  "state": state(o["earth_el"], o["earth_r"], hz_earth).tolist()},
        "windows": {"sun": windows(sun_vis, times), "earth": windows(earth_vis, times),
                    "both": windows(both, times)},
        "metrics": {"sunElevNowDeg": round(float(o["sun_el"][0]), 3),
                    "nextSunsetUtc": _next_set(sun_vis, times),
                    "nextEarthsetUtc": _next_set(earth_vis, times),
                    "sunlitHours": round(float(sun_vis.sum() * h), 1),
                    "earthVisibleHours": round(float(earth_vis.sum() * h), 1),
                    "bothHours": round(float(both.sum() * h), 1),
                    "longestDarkHours": round(_longest_false_run(sun_vis) * h, 1),
                    "longestEarthOutageHours": round(_longest_false_run(earth_vis) * h, 1)},
        "meta": {"engine": "astronomy-engine (IAU 2015 Moon rotation)",
                 "terrainSource": "NASA LOLA LDEM (PGDA)" if horizon_kind == "terrain" else None,
                 "generatedBy": "ASTRA-SN engine, written with AI assistance (Claude)"},
    }
