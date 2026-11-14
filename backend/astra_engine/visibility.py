"""Compare Sun / Earth positions with the terrain horizon -> states, windows, metrics.

Output follows the shared JSON contract (contract/README.md, schemaVersion 1).

Rules (team decision):
  - state per time step: "visible" (whole disc above the skyline), "partial", "hidden".
  - windows and metrics use the disc CENTRE above the skyline.
  - rise / set times are refined to the minute between the two time steps around each change
    (decision 2); hours and longest outages are computed from these refined times.
    A window shorter than one time step can still be missed.

Written with AI assistance (Claude); reviewed by the team.
"""
import datetime as dt

import numpy as np

ISO = "%Y-%m-%dT%H:%M:%SZ"


def _dt(s):
    return dt.datetime.strptime(s, ISO)


def _iso(t):
    return t.strftime(ISO)


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


def windows(vis, times, change_time, period_end):
    """Periods when vis is True, as [{startUtc, endUtc}].

    change_time(i) : time of the change between steps i-1 and i (refined to the minute)
    period_end     : end of the analysed period (end of a window still open at the last step)
    """
    out, start = [], None
    for i, v in enumerate(vis):
        if v and start is None:
            start = times[0] if i == 0 else change_time(i)
        if not v and start is not None:
            out.append({"startUtc": start, "endUtc": change_time(i)})
            start = None
    if start is not None:
        out.append({"startUtc": start, "endUtc": period_end})
    return out


def intersect(a, b):
    """Common parts of two window lists (both sorted)."""
    out = []
    for x in a:
        for y in b:
            s, e = max(x["startUtc"], y["startUtc"]), min(x["endUtc"], y["endUtc"])
            if s < e:
                out.append({"startUtc": s, "endUtc": e})
    return out


def total_hours(win):
    return sum((_dt(w["endUtc"]) - _dt(w["startUtc"])).total_seconds() for w in win) / 3600.0


def longest_gap_hours(win, period_start, period_end):
    """Longest period inside [period_start, period_end] not covered by any window."""
    edges = [period_start] + [t for w in win for t in (w["startUtc"], w["endUtc"])] + [period_end]
    return max((_dt(edges[k + 1]) - _dt(edges[k])).total_seconds() for k in range(0, len(edges), 2)) / 3600.0


def _next_set(vis, change_time):
    for i in range(1, len(vis)):
        if vis[i - 1] and not vis[i]:
            return change_time(i)
    return None


def build_result(site, times, o, mask_az, mask_el, horizon_kind, step_min, fine=None):
    """Assemble the result in the contract format (schemaVersion 1).

    site         : dict with at least "id"
    times        : list of ISO UTC strings
    o            : output of ephemeris.sun_earth_series
    horizon_kind : "terrain" (LOLA mask) or "flat" (mask of zeros)
    fine(i)      : optional; Sun/Earth positions every minute from times[i-1] to times[i]
                   (same keys as o). Used to refine rise/set times to the minute.
    """
    hz_sun, hz_earth = mask_at(mask_az, mask_el, o["sun_az"]), mask_at(mask_az, mask_el, o["earth_az"])
    sun_vis = o["sun_el"] > hz_sun          # centre rule for the metrics
    earth_vis = o["earth_el"] > hz_earth
    period_start = times[0]
    period_end = _iso(_dt(times[-1]) + dt.timedelta(minutes=step_min))

    def change_time_for(body, vis):
        def change_time(i):
            if fine is not None:
                m = fine(i)
                v = m[f"{body}_el"] > mask_at(mask_az, mask_el, m[f"{body}_az"])
                for k in range(1, len(v)):          # first minute with the new state
                    if v[k] == vis[i]:
                        return _iso(_dt(times[i - 1]) + dt.timedelta(minutes=k))
            return times[i]
        return change_time

    sun_change, earth_change = change_time_for("sun", sun_vis), change_time_for("earth", earth_vis)
    win_sun = windows(sun_vis, times, sun_change, period_end)
    win_earth = windows(earth_vis, times, earth_change, period_end)
    win_both = intersect(win_sun, win_earth)
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
        "windows": {"sun": win_sun, "earth": win_earth, "both": win_both},
        "metrics": {"sunElevNowDeg": round(float(o["sun_el"][0]), 3),
                    "nextSunsetUtc": _next_set(sun_vis, sun_change),
                    "nextEarthsetUtc": _next_set(earth_vis, earth_change),
                    "sunlitHours": round(total_hours(win_sun), 1),
                    "earthVisibleHours": round(total_hours(win_earth), 1),
                    "bothHours": round(total_hours(win_both), 1),
                    "longestDarkHours": round(longest_gap_hours(win_sun, period_start, period_end), 1),
                    "longestEarthOutageHours": round(longest_gap_hours(win_earth, period_start, period_end), 1)},
        "meta": {"engine": "astronomy-engine (IAU 2015 Moon rotation)",
                 "terrainSource": "NASA LOLA LDEM (PGDA)" if horizon_kind == "terrain" else None,
                 "generatedBy": "ASTRA-SN engine, written with AI assistance (Claude)"},
    }
