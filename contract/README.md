# Engine ↔ frontend contract (schemaVersion 1)

This is the agreement that lets the frontend and the engine be built at the same time.
The files in [`examples/`](examples/) are **real engine outputs** (LOLA 80 m map, 2 m sensor,
start 2026-11-14 00:00 UTC, 30 days, 30-minute step). Use them as mock data.

Any change to this format must be agreed by Pole 2 and Pole 3 and noted in
[`../docs/project/decisions_log.md`](../docs/project/decisions_log.md).

## Conventions

UTC ISO-8601 times (`2026-11-14T00:00:00Z`) · degrees · azimuth 0 = north, clockwise ·
elevation 0 = horizontal plane (negative = below) · latitude south negative ·
longitude east, −180..180.

## `sites.json`

```json
{ "schemaVersion": 1,
  "sites": [ { "id": "malapert", "name": "Malapert (prototype coordinates, slope)",
               "latDeg": -86.0, "lonDeg": 0.1, "group": "pole" } ] }
```

## `horizon_<siteId>.json` — terrain skyline

| Field | Type | Meaning |
|---|---|---|
| `azStepDeg` | number | step between values (1.0 → 360 values) |
| `elevDeg` | number[] | skyline elevation for azimuth 0, 1, 2, … 359 |
| `groundElevationM` | number | ground elevation at the site (m, LOLA reference sphere 1737.4 km) |
| `sensorHeightM` | number | observer height above ground (m) |
| `source` | string | terrain dataset used |

## `result_<siteId>.json` — full analysis

| Field | Type | Meaning |
|---|---|---|
| `horizon` | `"terrain"` \| `"flat"` | terrain mask used, or flat horizon |
| `stepMinutes` | number | time step |
| `times` | string[] | one entry per step (N entries) |
| `sun.elevDeg`, `sun.azDeg` | number[N] | Sun centre position |
| `sun.horizonDeg` | number[N] | skyline elevation in the Sun's direction at that step |
| `sun.state` | string[N] | `"visible"` (whole disc above skyline), `"partial"`, `"hidden"` |
| `earth.*` | | same for the Earth |
| `windows.sun` / `.earth` / `.both` | `{startUtc, endUtc}[]` | periods when the body centre is above the skyline |
| `metrics.sunElevNowDeg` | number | Sun elevation at the first step |
| `metrics.nextSunsetUtc` | string \| null | first time the Sun goes behind terrain (null = not in the period) |
| `metrics.nextEarthsetUtc` | string \| null | same for the Earth |
| `metrics.sunlitHours` | number | hours with the Sun visible |
| `metrics.earthVisibleHours` | number | hours with the Earth visible |
| `metrics.bothHours` | number | hours with both visible |
| `metrics.longestDarkHours` | number | longest continuous period without the Sun |
| `metrics.longestEarthOutageHours` | number | longest continuous period without the Earth |
| `meta` | object | engine and data provenance |

Rules: `state` uses the whole disc; `windows` and `metrics` use the disc **centre**.
Times in `windows` and `nextSunsetUtc` / `nextEarthsetUtc` are refined to the minute (the first minute with
the new state); hours and longest outages are computed from these times. A window still open at the last
step ends at the end of the period (start + days). A window shorter than one step can still be missed.

**Wording for the UI:** "Sun visible" is not "power available" and "Earth visible" is not
"radio link available" — show them as geometric visibility only.

## `precomputed/` — one year for every catalogue site (no server needed)

Real engine outputs for **all sites of `data/sites/sites.json`**, from 2026-11-14 00:00 UTC for 365 days,
30-minute step, 2 m sensor, terrain horizon, rise/set times refined to the minute.
Generated with `backend/scripts/precompute.py`. About 1.4 MB per site (about 0.3 MB when served gzipped).

| File | Content |
|---|---|
| `index.json` | `startUtc`, `endUtc`, `stepMinutes`, `sensorHeightM`, `terrainSource`, `sites` (same list as `sites.json`) |
| `result_<siteId>.json` | same format as `result_<siteId>.json` above, for the whole year |
| `horizon_<siteId>.json` | same format as `horizon_<siteId>.json` above |
| `terrain_<siteId>.bin` / `.json` | 20 km x 20 km LOLA 80 m terrain around the 4 featured sites (float32, metres relative to the site ground, curvature included, row 0 = north, col 0 = west) for the 3D local terrain view |
| `subsolar.json` | hourly sub-solar point (`latDeg`, `lonDeg`, Moon-fixed frame) from `startUtc`; real Sun direction for the 3D globe (`backend/scripts/export_subsolar.py`) |

**Showing a shorter period** (the user picks a start date and a duration inside the year) — cut it out of
the year file; this gives exactly the result of a direct analysis of that period (tested):

1. Snap `start` and `end` to the 30-minute grid (`startUtc` + k × 30 min); `end` = `start` + duration.
2. `times`, `sun.*`, `earth.*`: keep the indices with `start ≤ times[i] < end`.
3. `windows.sun / earth / both`: clip each window to [`start`, `end`]; drop the empty ones.
4. `sunlitHours`, `earthVisibleHours`, `bothHours`: sum of the clipped window durations.
5. `longestDarkHours` / `longestEarthOutageHours`: longest gap inside [`start`, `end`] not covered by the clipped Sun / Earth windows.
6. `nextSunsetUtc` / `nextEarthsetUtc`: the first **unclipped** window `endUtc` with `start < endUtc ≤` (last kept time); else `null`.
7. `sunElevNowDeg`: `sun.elevDeg` at the first kept index.

Reference implementation: `slice_result` in `backend/astra_engine/visibility.py`.
For another sensor height, another year or custom coordinates, call the API (`POST /analysis`).
