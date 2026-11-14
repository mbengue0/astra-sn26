# Test results

Engine version 0.1.0 · LOLA `LDEM_80S_80MPP_ADJ` (80 m) · run 2026-11-14.

## Validation cases

| id | Lat | Lon | Ground (m) | Why |
|---|---|---|---|---|
| `shackleton_coords_proto` | −89.7 | 129.8 | −2784 | crater floor: should never see Sun or Earth |
| `shackleton_rim_high` | −89.77967 | −156.35098 | 1737 | highest 80 m pixel of the rim, picked on the map |
| `malapert` | −86.0 | 0.1 | 4815 | slope of Malapert massif |
| `malapert_summit` | −85.98763 | 2.0528 | 5172 | highest 80 m pixel of the summit, 4 km away |

The `rim_high` and `summit` coordinates are not official site coordinates.

## 1. Sun and Earth positions vs JPL Horizons

Period 2026-11-14 → 2026-12-14, one comparison every 6 h (120 points per site and body).
Our engine: astronomy-engine + IAU 2015 Moon rotation. Horizons: DE441, high-precision Moon frame.

| Body | Mean elevation difference | Max elevation difference | Max sky separation |
|---|---|---|---|
| Sun | −2.3 to −2.6″ | 6.1–6.5″ | 15.1–15.5″ |
| Earth | +0.3 to +0.5″ | 6.7–7.1″ | 12.4–12.6″ |

15″ ≈ 0.004° ≈ 1/125 of the Sun's diameter; near the pole this shifts a sunset by roughly
30 seconds (estimate). **Verdict: negligible** compared with terrain uncertainty and the
30-minute step. Raw data: `validation/results/horizons_check.json`.

## 2. Horizon mask vs NASA polar illumination maps

Reference: average visibility over 18.6 years (Mazarico et al. 2011, PGDA product 69),
computed at ground level. Ours: same 18.6 years (step 317 min), sensor at 0 m.

| Site | Sun: ours | Sun: NASA | Δ | Earth: ours | Earth: NASA | Δ |
|---|---|---|---|---|---|---|
| Shackleton crater floor | 0.0 % | 0.0 % | 0 | 0.0 % | 0.0 % | 0 |
| Shackleton rim | 78.9 % | 80.0 % | −1.1 | 55.2 % | 49.1 % | +6.1 |
| Malapert slope | 31.4 % | 33.4 % | −2.0 | 25.5 % | 22.6 % | +2.9 |
| Malapert summit | 57.6 % | 55.6 % | +2.0 | 89.7 % | 87.5 % | +2.2 |

- **Sun: validated within ±2 points.**
- **Earth: +2 to +6 points too optimistic — cause not found yet.** Hypotheses (unverified):
  NASA used an older DEM (2016) than ours (2023); published pixels average 60 m.
  Ruled out: Earth positions and the disc rule (see `limitations.md`, open issue).

## 3. Fixes and sensitivity

- **Near-field fix:** rays used to start 2 pixels (160 m) from the site, ignoring nearby
  terrain. On slopes this made the mask too optimistic (Malapert Sun +3.0 → −0.7 points after
  the fix, measured before the window fix below). Rays now start at pixel/4 (20 m) with a fine step over the first 2 km.
- **Ground elevation:** read by bilinear interpolation at the exact point (same method as the rays).
- **Terrain window shift (fixed 2026-11-14):** the terrain window was read as whole pixels but
  positioned with a fractional offset, shifting the terrain by up to half a pixel (40 m on the 80 m
  map). Effects: Malapert ground 4810.9 → 4815.1 m; Malapert Earth gap vs NASA +4.0 → +2.9 points;
  80 m and 40 m maps now agree on the slope. The two "high point" sites were re-picked as the highest
  pixel of the corrected map (20–25 m from the old points); their NASA comparison is unchanged.
  All results above and `contract/examples/` were regenerated.
- **Sensitivity:** ray length 150 vs 300 km and azimuth step 1° vs 0.25° change nothing
  significant; **sensor height** (0 vs 2 m) is the main factor.
- With the default **2 m sensor**, our values are higher than the ground-level NASA maps
  (e.g. Shackleton rim Sun 84.7 % vs 80.0 %). This is the physical effect of height;
  its exact size on an 80 m DEM is **not verified** (small bumps are smoothed).

## 4. Rise/set times refined to the minute

Refined windows (30-minute step) compared with a full minute-by-minute run, 30 days, 3 sites with
changes: **identical** windows and metrics; 0.5 s instead of 10 s. Automated test:
`backend/tests/test_refinement.py` (also with a 13-minute step).

## Not yet tested

- 20 m and 10 m DEMs.
- A date-specific check of terrain-aware sunset times against an independent tool.
