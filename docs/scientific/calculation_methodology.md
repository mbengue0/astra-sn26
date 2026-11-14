# Calculation methodology

Three independent pieces, combined at the end.

```
A. Sun / Earth positions (astronomy-engine)      B. Terrain horizon (LOLA + our code)
   site + time  ->  azimuth, elevation             site + LDEM  ->  skyline elevation per azimuth
   (smooth Moon, no terrain)                        (computed once per site)
                     \                             /
                      C. Visibility (our code)
                         body above skyline in its direction?
                         -> state, windows, metrics
```

## A. Sun and Earth positions — `backend/astra_engine/ephemeris.py`

For each time step:

1. astronomy-engine gives the Moon and the Sun as seen from the Earth's centre (J2000 frame).
2. Change origin to the Moon's centre: Sun − Moon; Earth = −Moon.
3. Rotate into the Moon-fixed frame (IAU 2015 rotation: pole RA/Dec and spin angle W).
4. Subtract the site position: (1737.4 km + ground elevation) along the site's "up" vector.
   This matters for the Earth (up to ~0.26° parallax), not for the Sun.
5. Project onto local Up / East / North: elevation = asin(u·up), azimuth = atan2(u·east, u·north).
6. Apparent radius = asin(body radius / distance).

## B. Terrain horizon — `backend/astra_engine/horizon.py`

1. Convert lat/lon to map coordinates (polar stereographic, pyproj) and find the local north
   and east directions *in the map plane* (near the pole, north points to the pole and differs
   for every site).
2. Ground elevation at the exact point by bilinear interpolation; observer = ground + sensor height (default 2 m).
3. Cast 360 rays (1° step) up to 150 km. Samples every pixel/4 for the first 2 km, then every pixel.
4. For each sample: angle = atan((h − h_observer − d²/2R) / d), where d²/2R is the drop due to
   the Moon's curvature (R = 1737.4 km).
5. Skyline elevation for that azimuth = maximum angle along the ray. A site on a summit can have
   a negative skyline (it sees below the horizontal plane).

## C. Visibility — `backend/astra_engine/visibility.py`

- Skyline in the body's direction: linear interpolation of the 360-value mask.
- State: `visible` if the whole disc is above (el − r > skyline), `partial` if part of it, else `hidden`.
- Windows and metrics: disc **centre** above the skyline.
- Hours = number of steps × step length. Default step: 30 minutes.

## Conventions

UTC · degrees · azimuth 0 = north, clockwise · latitude south negative · longitude east −180..180.
