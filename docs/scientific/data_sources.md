# Data sources

| Source | Provider | Use | Frame / units | Coverage / resolution | Licence | Status |
|---|---|---|---|---|---|---|
| LOLA south polar DEM `LDEM_80S_80MPP_ADJ` (Barker et al. 2023) | NASA GSFC PGDA, <https://pgda.gsfc.nasa.gov/products/90> | terrain horizon | polar stereographic, MOON_ME (DE421); metres vs 1737.4 km sphere | 80° S to pole, 80 m | NASA public data (to confirm on product page) | used |
| Other LOLA DEMs (40, 20, 10, 240 m) | NASA GSFC PGDA | finer terrain, 3D view | see [`../../data/README.md`](../../data/README.md) | | | available, not used yet |
| JPL Horizons | NASA JPL, <https://ssd.jpl.nasa.gov/horizons/> | independent reference for Sun/Earth positions | DE441; airless apparent az/el | any date | public service | used for validation |
| LOLA polar illumination maps (Mazarico et al. 2011) | NASA GSFC PGDA, <https://pgda.gsfc.nasa.gov/products/69> | independent reference for horizon masks | polar stereographic; fraction 0–1 (int16 × 4e-5) | 85° S to pole, 60 m, 18.6-year average | NASA public data | used for validation |
| astronomy-engine 2.1.19 | Don Cross, <https://github.com/cosinekitty/astronomy> | Sun, Moon positions and Moon rotation | J2000 / IAU 2015 | any date | MIT | used in engine |

## Challenge resources (Resources tab of the challenge page)

Source: <https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=resources>,
read on 2026-11-15.

| Challenge resource | Used? | How |
|---|---|---|
| **Horizons System** (NASA JPL) | **Yes, directly** | Reference for the Sun and Earth positions seen from the Moon. The engine (astronomy-engine) agrees with Horizons within 15.5″ (see [`test_results.md`](test_results.md)). The engine, not Horizons, runs in the app: it needs a full year for 16 sites with no network, and Horizons does not include the terrain. |
| **QuickMap** (LROC, NASA LRO) | **Yes, its data and a cross-check** | QuickMap shows NASA LRO data, including LOLA topography. We use the LOLA DEM itself (from NASA PGDA, table above) to compute the terrain horizon. Cross-check on 2026-11-15: the site points and heights in QuickMap (Nomenclature layer) agree with our ground elevation from LOLA 80 m (table below). |
| **Moon Trek** (NASA) | Its data, not the tool | Moon Trek also visualises LRO LOLA topography; we use the same NASA LOLA data in the engine. |
| **CSA Moon Exploration** (Canadian Space Agency) | No | Information portal about missions, no dataset used. |

### Cross-check with QuickMap (2026-11-15)

Point coordinates and heights read in QuickMap (<https://quickmap.lroc.im-ldi.com>), Nomenclature layer,
Object Inspector; our values from `frontend/src/data/engineSites.json` (ground elevation, LOLA 80 m, bilinear).

| Site | QuickMap lat, lon (east), height | ASTRA-SN ground elevation | Difference |
|---|---|---|---|
| Mons Malapert | −85.98°, 358.33°, 4917.2 m | 4919 m | +1.8 m |
| Mons Mouton | −84.60°, 31.00°, 5042.1 m | 5040 m | −2.1 m |
| Haworth | −87.45°, 354.83°, −3315.3 m | −3313 m | +2.3 m |

The same points and heights within about 2 m (the DEM behind the QuickMap heights is not stated in the inspector).
QuickMap also lists **Malapert Massif** and **Haworth** in its layer "A3: Candidate Landing Regions 2022"
(Artemis III candidate regions).
