# ASTRA-SN — Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 · challenge *Lunar Landing Site Navigator* · Team ASTRA-SN (Dakar, Senegal)

**Live app:** <https://astra-sn26.vercel.app/>

At the lunar south pole the Sun stays a few degrees above the horizon and the Earth hangs low in the sky,
so a mountain rim decides whether a lander has sunlight (power) and a direct view of the Earth
(communication). ASTRA-SN answers one question for a candidate landing site: **when, during my mission,
are the Sun and the Earth visible from here, once the real terrain is taken into account?**

## What the app shows

| View | What you see | Where the numbers come from |
|---|---|---|
| **Globe** | The Moon lit by the real Sun direction at the chosen date, 4 south-pole sites, search | engine sub-solar point (`subsolar.json`) |
| **Site card** | Ground elevation, % of the year with the Sun / the Earth visible | engine, one precomputed year |
| **Celestial Horizon** | The sky from the site: the real terrain skyline, the Sun and the Earth at their true azimuth / elevation, animated in time | engine skyline (360 values) and positions |
| **Local Terrain** | 20 km × 20 km of real terrain around the site, lit from the true Sun direction | NASA LOLA 80 m tile from the engine |
| **Telemetry + timeline** | Sun / Earth elevation, azimuth, terrain obstruction, visible or hidden; bars showing when each is visible over the mission | engine, times refined to the minute |
| **Compare sites** | Several sites side by side, with launch slips (+7 d, +14 d, +29.5 d) | engine |

The 4 sites: **Shackleton rim** (high point), **Mons Malapert**, **Mons Mouton**, **Haworth** crater.
Malapert Massif and Haworth are in NASA's Artemis III candidate landing regions (QuickMap layer
"A3: Candidate Landing Regions 2022"). The engine and the API know 16 sites (4 study points + 12 official IAU features).

Results are **geometric visibility**: "Sun visible" is not "power available" and "Earth visible" is not
"radio contact available". The app does not pick a "best" site; it shows trade-offs.

## How it works

```
NASA LOLA terrain (80 m) ─┐
                          ├─► engine (Python) ─► one year × 16 sites (JSON) ─► web app (React + Three.js)
astronomy-engine (Sun,   ─┘        │
Earth, Moon rotation)              └─► API (FastAPI, Docker) ─► any custom coordinates
```

1. **Positions:** Sun and Earth azimuth / elevation seen from the site (astronomy-engine, IAU 2015 Moon rotation).
2. **Terrain skyline:** from the site, 360 rays (one per degree) up to 150 km over the LOLA elevation map,
   including the Moon's curvature; the skyline is the highest angle in each direction.
3. **Visibility:** a body is visible when its centre is above the skyline in its direction. Every 30 minutes,
   with rise / set times refined to the minute.
4. **Precomputed year** (2026-11-14 → 2027-11-14) for all sites, served as static files: the app is instant
   and needs no server. Custom coordinates use the API (local Docker).

Details: [`docs/scientific/calculation_methodology.md`](docs/scientific/calculation_methodology.md).

## Validation

| Check | Reference | Result |
|---|---|---|
| Sun and Earth positions | **JPL Horizons** (NASA JPL) | max 15.5″ (arc-seconds) |
| Sun visibility with terrain | NASA LOLA polar illumination maps (Mazarico et al. 2011) | within ±2 points of average illumination |
| Earth visibility with terrain | same NASA maps | +2.1 to +6.1 points (open issue, documented) |
| Site heights | **QuickMap** (LROC) | within ~2 m (Malapert, Mouton, Haworth) |
| Rise / set times | minute-by-minute run | identical |
| Browser port of the slicing code | Python engine | identical on 200/200 random periods |

61 automated tests. Details: [`docs/scientific/test_results.md`](docs/scientific/test_results.md),
limits: [`docs/scientific/limitations.md`](docs/scientific/limitations.md).

## NASA data and challenge resources

| Resource | Use |
|---|---|
| **JPL Horizons** (challenge resource) | reference for the Sun / Earth positions (validation) |
| **LRO LOLA** south-pole elevation model `LDEM_80S_80MPP_ADJ` (NASA GSFC PGDA, Barker et al. 2023), the LOLA data also shown in **QuickMap** and **Moon Trek** (challenge resources) | terrain skyline, 3D terrain |
| **QuickMap** (challenge resource) | cross-check of site positions and heights |
| LOLA polar illumination maps (NASA GSFC PGDA, Mazarico et al. 2011) | validation of the visibility results |
| IAU / USGS Gazetteer of Planetary Nomenclature | official site names and positions |

Full list with links: [`docs/scientific/data_sources.md`](docs/scientific/data_sources.md),
citations: [`docs/submission/references.md`](docs/submission/references.md).

## Tech stack

- **Engine:** Python, astronomy-engine, rasterio, pyproj, NumPy, SciPy, pytest
- **API:** FastAPI + uvicorn, Docker image (downloads the LOLA file from NASA at build)
- **App:** React 19, TypeScript, Vite, Three.js / React Three Fiber, Zustand, Tailwind CSS
- **Hosting:** Vercel (static app)

## Run it

**App** (Node.js 18 or newer):

```bash
cd frontend
npm install
npm run dev
```

**Engine tests** (Python 3.9 or newer; the 36 terrain tests need the 80 m LOLA file, see [`data/README.md`](data/README.md),
otherwise they are skipped):

```bash
cd backend
pip install -r requirements.txt
ASTRA_LDEM_PATH=<path/to/LDEM_80S_80MPP_ADJ.tiff> python -m pytest -q
```

Expected: `61 passed`.

**API for custom coordinates** (Docker): see [`frontend/README.md`](frontend/README.md#running-the-engine-api-for-custom-coordinates)
and [`backend/README.md`](backend/README.md).

## Repository

| Folder | Content |
|---|---|
| [`backend/`](backend/) | scientific engine (`astra_engine`), API, scripts, tests |
| [`frontend/`](frontend/) | the web app (the deployed one) |
| [`contract/`](contract/) | JSON format exchanged by engine and app, examples, precomputed year |
| [`validation/`](validation/) | comparison scripts against JPL Horizons and NASA illumination maps |
| [`data/`](data/) | site list and how to get the terrain files |
| [`docs/`](docs/) | methodology, tests, limitations, sources, project notes, use of AI |

The `src/`, `public/`, `index.html` and `package.json` at the repository root are an earlier copy of the app
that does not use the engine; the deployed app is `frontend/`.

## Team

Team ASTRA-SN, Dakar: Pole 1 (science), Pole 2 (engine and integration), Pole 3 (web app).

## Use of AI

AI assistance was used for code and documentation; see [`docs/submission/ai_usage.md`](docs/submission/ai_usage.md).
Every number shown by the app comes from the deterministic engine, validated against NASA references.
The in-app "ASTRA Copilot" is not an AI model (see the same file).
