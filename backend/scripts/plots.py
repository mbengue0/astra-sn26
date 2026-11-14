"""Figures: 1_map.png (LOLA map + sites), 2_sky.png (sky of each site), 3_timeline.png (windows).

Usage (from backend/): python scripts/plots.py <LDEM.tif> <output_dir>
Run after run_sites.py. Written with AI assistance (Claude).
"""
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pyproj  # noqa: E402
import rasterio  # noqa: E402
from rasterio.windows import from_bounds  # noqa: E402

LDEM, OUT = sys.argv[1], Path(sys.argv[2])
SUN, EARTH, BOTH, INK, MUTED = "#E8960F", "#2F7FD0", "#14936B", "#2C2C2A", "#6B6A65"
S = json.load(open(OUT / "_summary.json", encoding="utf-8"))
plt.rcParams.update({"font.size": 10, "axes.edgecolor": "#B4B2A9", "axes.labelcolor": INK,
                     "xtick.color": MUTED, "ytick.color": MUTED,
                     "axes.spines.top": False, "axes.spines.right": False})
LABELS = {"shackleton_coords_proto": "A · Shackleton, prototype coordinates (crater floor)",
          "shackleton_rim_high": "B · Shackleton rim, high point",
          "malapert": "A · Malapert, prototype coordinates (slope)",
          "malapert_summit": "B · Malapert summit (4 km away)"}


def label(i):
    return LABELS.get(i, i)


def hill(a, px):
    gy, gx = np.gradient(np.nan_to_num(a, nan=np.nanmean(a)), px)
    sl = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
    az, alt = np.radians(315), np.radians(35)
    return np.sin(alt) * np.cos(sl) + np.cos(alt) * np.sin(sl) * np.cos(az - asp)


ds = rasterio.open(LDEM)
crs = pyproj.CRS.from_wkt(ds.crs.to_wkt())
fwd = pyproj.Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
px = abs(ds.transform.a)

# --- 1. Map
fig, ax = plt.subplots(1, 3, figsize=(15, 5.3), gridspec_kw={"width_ratios": [1.2, 1, 1]})
a = ds.read(1, out_shape=(1900, 1900)); b = ds.bounds
ax[0].imshow(hill(a, (b.right - b.left) / 1900), cmap="gray",
             extent=(b.left / 1e3, b.right / 1e3, b.bottom / 1e3, b.top / 1e3))
ax[0].set_title("LOLA map: south pole (shaded relief)", loc="left", fontsize=11)
for s in S:
    x, y = fwd.transform(s["site"]["lonDeg"], s["site"]["latDeg"])
    ax[0].plot(x / 1e3, y / 1e3, "o", ms=5, color="#E24B4A", mec="white")
ax[0].set_xlabel("x (km)"); ax[0].set_ylabel("y (km)")
pairs = [(["shackleton_coords_proto", "shackleton_rim_high"], 22000, "Shackleton zoom (elevation)"),
         (["malapert", "malapert_summit"], 9000, "Malapert zoom (elevation)")]
for k, (ids, half, title) in enumerate(pairs, start=1):
    pts = [s for s in S if s["site"]["id"] in ids]
    if not pts:
        ax[k].axis("off"); continue
    xs = [fwd.transform(p["site"]["lonDeg"], p["site"]["latDeg"]) for p in pts]
    cx = np.mean([x for x, _ in xs]); cy = np.mean([y for _, y in xs])
    w = from_bounds(cx - half, cy - half, cx + half, cy + half, ds.transform); z = ds.read(1, window=w)
    ext = ((cx - half) / 1e3, (cx + half) / 1e3, (cy - half) / 1e3, (cy + half) / 1e3)
    im = ax[k].imshow(z, cmap="cividis", extent=ext)
    ax[k].imshow(hill(z, px), cmap="gray", alpha=0.35, extent=ext)
    for p, (x, y), lab in zip(pts, xs, ["A", "B"]):
        ax[k].plot(x / 1e3, y / 1e3, "o", ms=9, color="#E24B4A", mec="white", mew=1.5)
        ax[k].annotate(f"{lab}  {p['ground']:.0f} m", (x / 1e3, y / 1e3), xytext=(8, 6),
                       textcoords="offset points", color="white", fontsize=10, fontweight="bold")
    ax[k].set_title(title, loc="left", fontsize=11); ax[k].set_xlabel("x (km)")
    cb = plt.colorbar(im, ax=ax[k], fraction=0.046); cb.set_label("elevation (m)")
fig.tight_layout(); fig.savefig(OUT / "1_map.png", dpi=110)

# --- 2. Sky
fig, axs = plt.subplots(len(S), 1, figsize=(13, 3.25 * len(S)), squeeze=False)
for ax, s in zip(axs[:, 0], S):
    i = s["site"]["id"]; d = np.load(OUT / f"_plot_{i}.npz"); az, m = d["az"], d["mask"]
    lo = min(m.min(), d["sun_el"].min(), d["earth_el"].min()) - 1
    hi = max(m.max(), d["sun_el"].max(), d["earth_el"].max()) + 1
    ax.fill_between(np.append(az, 360), np.append(m, m[0]), lo, color="#888780", alpha=0.55, lw=0,
                    label="terrain (horizon mask)")
    ax.axhline(0, color=MUTED, lw=0.8, ls="--")
    for el, azz, col, lab in ((d["sun_el"], d["sun_az"], SUN, "Sun"), (d["earth_el"], d["earth_az"], EARTH, "Earth")):
        hz = np.interp(azz, np.append(az, 360), np.append(m, m[0])); v = el > hz
        ax.scatter(azz[v], el[v], s=9, color=col, label=f"{lab} visible", zorder=3)
        ax.scatter(azz[~v], el[~v], s=9, facecolors="none", edgecolors=col, alpha=0.45, lw=0.7,
                   label=f"{lab} hidden", zorder=3)
    ax.set_xlim(0, 360); ax.set_ylim(lo, hi); ax.set_xticks([0, 90, 180, 270, 360])
    ax.set_xticklabels(["N", "E", "S", "W", "N"]); ax.set_ylabel("elevation (deg)")
    t = s["terrain"]
    ax.set_title(f"{label(i)}  —  sunlight {t['sunlitHours']:.0f} h · Earth {t['earthVisibleHours']:.0f} h · "
                 f"both {t['bothHours']:.0f} h", loc="left", fontsize=10.5)
axs[0, 0].legend(ncol=5, fontsize=8.5, loc="upper right", frameon=False)
fig.suptitle("Sky of each site (elevation exaggerated)", x=0.01, ha="left", fontsize=12)
fig.tight_layout(); fig.savefig(OUT / "2_sky.png", dpi=110)

# --- 3. Timeline
fig, ax = plt.subplots(figsize=(13, 1.3 * len(S) + 0.6)); y = 0; ticks = []
for s in S:
    i = s["site"]["id"]
    d = np.load(OUT / f"_plot_{i}.npz"); m = d["mask"]; az = d["az"]
    r = json.load(open(OUT / f"result_{i}.json", encoding="utf-8"))
    per_day = 1440 / r["stepMinutes"]; days = len(r["times"]) / per_day
    sv = d["sun_el"] > np.interp(d["sun_az"], np.append(az, 360), np.append(m, m[0]))
    ev = d["earth_el"] > np.interp(d["earth_az"], np.append(az, 360), np.append(m, m[0]))
    for row, (v, col, lab) in enumerate(((sv, SUN, "Sun"), (ev, EARTH, "Earth"), (sv & ev, BOTH, "Both"))):
        yy = y - row * 0.32; ax.broken_barh([(0, days)], (yy - 0.12, 0.24), color="#F1EFE8")
        idx = np.flatnonzero(v)
        if len(idx):
            br = np.split(idx, np.flatnonzero(np.diff(idx) > 1) + 1)
            ax.broken_barh([(b_[0] / per_day, (b_[-1] - b_[0] + 1) / per_day) for b_ in br],
                           (yy - 0.12, 0.24), color=col)
        ax.text(days + 0.3, yy, lab, va="center", fontsize=8.5, color=INK)
    ticks.append((y - 0.32, label(i).split(" (")[0]))
    y -= 1.35
ax.set_yticks([t[0] for t in ticks]); ax.set_yticklabels([t[1] for t in ticks], fontsize=9.5)
ax.set_xlim(0, days + 2.5); ax.set_xlabel(f"days since {r['times'][0][:10]} (UTC)")
ax.spines["left"].set_visible(False); ax.tick_params(axis="y", length=0)
ax.set_title("Sunlight and Earth visibility windows, with real terrain", loc="left", fontsize=12)
fig.tight_layout(); fig.savefig(OUT / "3_timeline.png", dpi=110)
print("ok")
