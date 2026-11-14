# Test results

Engine version 0.1.0 · LOLA `LDEM_80S_80MPP_ADJ` (80 m) · run 2026-11-14.

## Validation cases

| id | Lat | Lon | Ground (m) | Why |
|---|---|---|---|---|
| `shackleton_coords_proto` | −89.7 | 129.8 | −2785 | crater floor: should never see Sun or Earth |
| `shackleton_rim_high` | −89.779 | −156.34 | 1737 | high rim point picked on the map |
| `malapert` | −86.0 | 0.1 | 4811 | slope of Malapert massif |
| `malapert_summit` | −85.987 | 2.06 | 5172 | summit picked on the map, 4 km away |

The `rim_high` and `summit` coordinates are not official site coordinates.

## 1. Sun and Earth positions vs JPL Horizons

Period 2026-11-14 → 2026-12-14, one comparison every 6 h (120 points per site and body).
Our engine: astronomy-engine + IAU 2015 Moon rotation. Horizons: DE441, high-precision Moon frame.

| Body | Mean elevation difference | Max elevation difference | Max sky separation |
|---|---|---|---|
| Sun | −2.4 to −2.6″ | 6.0–6.8″ | 14.9–15.5″ |
| Earth | +0.3 to +0.5″ | 6.4–7.1″ | 12.4–12.7″ |

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
| Malapert slope | 32.7 % | 33.4 % | −0.7 | 26.6 % | 22.6 % | +4.0 |
| Malapert summit | 57.6 % | 55.6 % | +2.0 | 89.7 % | 87.5 % | +2.2 |

- **Sun: validated within ±2 points.**
- **Earth: +2 to +6 points too optimistic — cause not found yet.** Hypotheses (unverified):
  NASA used an older DEM (2016) than ours (2023); published pixels average 60 m; Earth disc handling.

## 3. Fixes and sensitivity

- **Near-field fix:** rays used to start 2 pixels (160 m) from the site, ignoring nearby
  terrain. On slopes this made the mask too optimistic (Malapert Sun +3.0 → −0.7 points after
  the fix). Rays now start at pixel/4 (20 m) with a fine step over the first 2 km.
- **Ground elevation:** read by bilinear interpolation at the exact point (same method as the rays).
- **Sensitivity:** ray length 150 vs 300 km and azimuth step 1° vs 0.25° change nothing
  significant; **sensor height** (0 vs 2 m) is the main factor.
- With the default **2 m sensor**, our values are higher than the ground-level NASA maps
  (e.g. Shackleton rim Sun 84.7 % vs 80.0 %). This is the physical effect of height;
  its exact size on an 80 m DEM is **not verified** (small bumps are smoothed).

## Not yet tested

- 20 m and 10 m DEMs.
- Minute-level refinement of set/rise times.
- A date-specific check of terrain-aware sunset times against an independent tool.
