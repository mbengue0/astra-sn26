"""Compare our Sun / Earth positions with JPL Horizons (independent reference).

Usage (from the repo root):
    python validation/compare_horizons.py <results_dir> [--plot SITE_ID]

Reads result_*.json, horizon_*.json and sites.json produced by backend/scripts/run_sites.py.
Horizons answers are cached in validation/results/horizons_cache/ (one file per site and body),
so the check can be re-run offline. With --plot, also writes 4_horizons_check_<site>.png.

Source: JPL Horizons API, https://ssd-api.jpl.nasa.gov/doc/horizons.html
Written with AI assistance (Claude); reviewed by the team.
"""
import argparse
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
STEP_H = 6  # one Horizons point every 6 h (1 in 12 of our 30-min steps)
BODIES = {"sun": "10", "earth": "399"}
API = "https://ssd.jpl.nasa.gov/api/horizons.api"


def horizons(body_code, lon, lat, alt_km, start, stop):
    params = {
        "format": "text", "COMMAND": f"'{body_code}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'", "CENTER": "'coord@301'", "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},{alt_km}'", "START_TIME": f"'{start}'", "STOP_TIME": f"'{stop}'",
        "STEP_SIZE": f"'{STEP_H} h'", "QUANTITIES": "'4'", "ANG_FORMAT": "'DEG'",
        "EXTRA_PREC": "'YES'", "TIME_TYPE": "'UT'", "CSV_FORMAT": "'YES'",
    }
    with urllib.request.urlopen(API + "?" + urllib.parse.urlencode(params), timeout=60) as r:
        return r.read().decode()


def parse(text):
    """Horizons CSV table (between $$SOE and $$EOE) -> {ISO time: (azimuth, elevation)}."""
    out = {}
    for line in text.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines():
        f = [c.strip() for c in line.split(",")]
        t = datetime.strptime(f[0], "%Y-%b-%d %H:%M").replace(tzinfo=timezone.utc)
        out[t.strftime("%Y-%m-%dT%H:%M:%SZ")] = (float(f[3]), float(f[4]))
    return out


def sep_deg(az1, el1, az2, el2):
    """True angular separation on the sky between two directions (degrees)."""
    a1, e1, a2, e2 = map(np.radians, (az1, el1, az2, el2))
    c = np.sin(e1) * np.sin(e2) + np.cos(e1) * np.cos(e2) * np.cos(a1 - a2)
    return np.degrees(np.arccos(np.clip(c, -1, 1)))


def load_ref(res, site, ground_m, name, cache):
    f = cache / f"{site['id']}_{name}.txt"
    if not f.exists():
        start = res["times"][0].replace("T", " ")[:16]
        stop = res["times"][-1].replace("T", " ")[:16]
        f.write_text(horizons(BODIES[name], site["lonDeg"], site["latDeg"], ground_m / 1000.0, start, stop))
    return parse(f.read_text())


def plot(out, site_id, cache):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    col = {"sun": "#E8960F", "earth": "#2F7FD0"}
    res = json.load(open(out / f"result_{site_id}.json", encoding="utf-8"))
    T = [datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ") for t in res["times"]]
    fig, ax = plt.subplots(3, 1, figsize=(12, 10), sharex=True, gridspec_kw={"height_ratios": [2, 2, 1.3]})
    for name in ("sun", "earth"):
        ref = parse((cache / f"{site_id}_{name}.txt").read_text())
        idx = [i for i, t in enumerate(res["times"]) if t in ref]
        th = [T[i] for i in idx]
        h_az = np.array([ref[res["times"][i]][0] for i in idx])
        h_el = np.array([ref[res["times"][i]][1] for i in idx])
        our_el, our_az = np.array(res[name]["elevDeg"]), np.array(res[name]["azDeg"])
        ax[0].plot(T, our_el, color=col[name], lw=1.5, label=f"{name.title()}: ASTRA")
        ax[0].plot(th, h_el, "o", ms=4, mfc="white", mec="black", mew=0.8,
                   label="JPL Horizons (points)" if name == "sun" else None)
        ax[1].plot(T, our_az, ".", ms=1.5, color=col[name])
        ax[1].plot(th, h_az, "o", ms=4, mfc="white", mec="black", mew=0.8)
        ax[2].plot(th, (our_el[idx] - h_el) * 3600, "o-", ms=3, lw=0.8, color=col[name], label=name.title())
    ax[0].axhline(0, color="gray", lw=0.7, ls="--"); ax[0].set_ylabel("elevation (deg)")
    ax[0].legend(fontsize=8.5, ncol=3, frameon=False, loc="upper right")
    ax[0].set_title(f"Check against JPL Horizons — site '{site_id}'", loc="left")
    ax[1].set_ylabel("azimuth (deg)"); ax[1].set_yticks([0, 90, 180, 270, 360])
    ax[2].axhline(0, color="gray", lw=0.7); ax[2].set_ylabel("elevation difference\nASTRA − Horizons (arcsec)")
    ax[2].legend(fontsize=8.5, frameon=False); ax[2].set_xlabel("date (UTC)")
    fig.tight_layout()
    path = out / f"4_horizons_check_{site_id}.png"
    fig.savefig(path, dpi=110)
    print(path)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("results")
    p.add_argument("--cache", default=str(HERE / "results" / "horizons_cache"))
    p.add_argument("--plot", action="append", default=[])
    a = p.parse_args()
    out, cache = Path(a.results), Path(a.cache)
    cache.mkdir(parents=True, exist_ok=True)
    sites = json.load(open(out / "sites.json", encoding="utf-8"))["sites"]
    rows = []
    print(f"{'site':26s} {'body':6s} {'n':>4s} {'mean dEl':>9s} {'max |dEl|':>10s} {'max sky sep':>12s}  (arcsec)")
    for s in sites:
        res = json.load(open(out / f"result_{s['id']}.json", encoding="utf-8"))
        ground_m = json.load(open(out / f"horizon_{s['id']}.json", encoding="utf-8"))["groundElevationM"]
        times = res["times"]
        for name in BODIES:
            ref = load_ref(res, s, ground_m, name, cache)
            idx = [i for i, t in enumerate(times) if t in ref]
            our_el = np.array([res[name]["elevDeg"][i] for i in idx])
            our_az = np.array([res[name]["azDeg"][i] for i in idx])
            h_az = np.array([ref[times[i]][0] for i in idx])
            h_el = np.array([ref[times[i]][1] for i in idx])
            d_el = (our_el - h_el) * 3600
            sep = sep_deg(our_az, our_el, h_az, h_el) * 3600
            rows.append({"site": s["id"], "body": name, "n": len(idx), "meanDElArcsec": round(d_el.mean(), 1),
                         "maxAbsDElArcsec": round(np.abs(d_el).max(), 1), "maxSepArcsec": round(sep.max(), 1)})
            print(f"{s['id']:26s} {name:6s} {len(idx):4d} {d_el.mean():9.1f} {np.abs(d_el).max():10.1f} {sep.max():12.1f}")
    json.dump(rows, open(out / "horizons_check.json", "w", encoding="utf-8"), indent=1)
    for site_id in a.plot:
        plot(out, site_id, cache)


if __name__ == "__main__":
    main()
