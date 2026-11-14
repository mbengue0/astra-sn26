# Data sources

| Source | Provider | Use | Frame / units | Coverage / resolution | Licence | Status |
|---|---|---|---|---|---|---|
| LOLA south polar DEM `LDEM_80S_80MPP_ADJ` (Barker et al. 2023) | NASA GSFC PGDA, <https://pgda.gsfc.nasa.gov/products/90> | terrain horizon | polar stereographic, MOON_ME (DE421); metres vs 1737.4 km sphere | 80° S to pole, 80 m | NASA public data (to confirm on product page) | used |
| Other LOLA DEMs (40, 20, 10, 240 m) | NASA GSFC PGDA | finer terrain, 3D view | see [`../../data/README.md`](../../data/README.md) | | | available, not used yet |
| JPL Horizons | NASA JPL, <https://ssd.jpl.nasa.gov/horizons/> | independent reference for Sun/Earth positions | DE441; airless apparent az/el | any date | public service | used for validation |
| LOLA polar illumination maps (Mazarico et al. 2011) | NASA GSFC PGDA, <https://pgda.gsfc.nasa.gov/products/69> | independent reference for horizon masks | polar stereographic; fraction 0–1 (int16 × 4e-5) | 85° S to pole, 60 m, 18.6-year average | NASA public data | used for validation |
| astronomy-engine 2.1.19 | Don Cross, <https://github.com/cosinekitty/astronomy> | Sun, Moon positions and Moon rotation | J2000 / IAU 2015 | any date | MIT | used in engine |

**To check after the official challenge resources are published:** that LOLA and/or
Horizons appear in the challenge's Resources list (use of at least one listed NASA resource is mandatory).
