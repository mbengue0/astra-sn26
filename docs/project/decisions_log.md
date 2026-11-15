# Decisions log

| # | Date | Decision | Why | Status |
|---|---|---|---|---|
| 1 | before event | Product question: "if my mission slips, where and when can I still land, and why?" — 4 cases: Sun + Earth, Sun only, Earth only, none | clear value for mission planners | agreed |
| 2 | before event | Time step 30 min, refined to the minute around sets | speed vs accuracy | agreed (refinement done 2026-11-14) |
| 3 | before event | 3 visibility states (visible / partial / hidden); metrics use the disc centre | readable + defensible | agreed |
| 4 | before event | Conventions: UTC, degrees, azimuth 0 = north clockwise, lat south negative, lon east −180..180 | one convention everywhere | agreed |
| 5 | 2026-11-14 | Keep astronomy-engine for ephemerides; JPL Horizons as independent reference (SPICE not introduced) | already validated at 15″; plan says no new engine without a clear reason | proposed (Pole 2) |
| 6 | 2026-11-14 | One repository; engine/frontend exchange the JSON contract in `contract/` | lets poles work in parallel | agreed |
| 7 | 2026-11-14 | No overall "best site" score | trade-offs, not verdicts | agreed |
| 8 | — | Frontend stack and whether to build on any existing code | to decide by the team | **open** |
| 9 | — | DEM resolution per use (horizon, 3D view) | to decide after tests | **open** |
| 10 | 2026-11-15 | The web app shows 4 sites: Shackleton rim (high point), Mons Malapert, Mons Mouton, Haworth crater; the engine/API keep 16 | readable globe, clear contrasts (best Sun, permanent Earth view, second massif, permanent shadow) | agreed (Pole 2) |
| 11 | 2026-11-15 | 3D globe lit from the real Sun direction (engine sub-solar point) | the previous fixed light made polar sites look like they were in the night side | agreed (Pole 2) |
