# Limitations

## What is calculated directly
- Sun and Earth azimuth / elevation for any site and time (validated, 15″).
- Terrain skyline from LOLA elevations (Sun visibility validated within ±2 points on average).
- Visibility states, windows and durations over the chosen period.

## What is derived from external data
- Terrain: NASA LOLA DEM (80 m used so far). Results depend on its resolution and accuracy.

## What is approximated
- Time step 30 min: windows are accurate to ±30 min; a window shorter than the step can be missed.
- Sensor height is an assumption (2 m default).
- Moon orientation: IAU 2015 model (not the high-precision frame used by JPL); effect included in the 15″.
- Small terrain features below the DEM pixel size are smoothed out.
- **DEM resolution (80 m vs 40 m), 2 m sensor, 18.6-year averages:** Earth visibility agrees within
  0.8 points on all three sites; Sun within 0.2 points on the Malapert slope and 1.8–3.8 points on the
  two summits. 20 m and 10 m maps are not tested.
- **Ground-level (0 m) results are fragile on summits with fine maps.** An observer exactly at ground level
  is blocked by bumps under 1 m a few tens of metres away: on the 40 m map, Shackleton rim Sun drops from
  78.9 % (80 m) to 47.9 %. With a 2 m sensor the two maps agree better (84.7 % vs 80.9 %). Comparisons with
  the ground-level NASA maps therefore use the 80 m map.

## Open issue
- Earth visibility is 2–6 points more optimistic than NASA's published average maps (+6.1 Shackleton rim,
  +2.9 Malapert slope, +2.1 Malapert summit); cause unknown.
  Ruled out (2026-11-14): (1) the Earth positions — with the same horizon, JPL Horizons and our engine give
  the same visible/hidden answer at all 120 checked instants per site (30 days, 6 h step); (2) the disc rule —
  NASA's product page states the Earth counts as visible if any part of its disc is unobscured, which is
  our rule.

## Not modelled
- Power generation, thermal conditions, radio link budget, landing hazards and slopes.
- Atmospheric effects do not exist on the Moon; light-time effects are small and included in the error above.

## What users should not infer
- "Sun visible" ≠ power available. "Earth visible" ≠ radio contact available.
- No site is declared "best": results show trade-offs, people decide.
