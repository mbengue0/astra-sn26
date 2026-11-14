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

## Open issue
- Earth visibility is 2–6 points more optimistic than NASA's published average maps; cause unknown.

## Not modelled
- Power generation, thermal conditions, radio link budget, landing hazards and slopes.
- Atmospheric effects do not exist on the Moon; light-time effects are small and included in the error above.

## What users should not infer
- "Sun visible" ≠ power available. "Earth visible" ≠ radio contact available.
- No site is declared "best": results show trade-offs, people decide.
