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
