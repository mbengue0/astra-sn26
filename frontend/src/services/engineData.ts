// ============================================================================
// ASTRA-SN — Validated engine results for the frontend
//
// Catalogue sites: one precomputed year (contract/precomputed/, copied to public/data/precomputed/
// by scripts/sync-engine-data.mjs). A shorter period is cut out with sliceResult, a port of
// slice_result in backend/astra_engine/visibility.py (same answer as a direct engine analysis).
// Custom coordinates: the engine API (POST /analysis), when VITE_BACKEND_API_URL is set.
// Contract: contract/README.md (schemaVersion 1). Times are UTC.
// ============================================================================

import { LunarSite, SiteMissionAnalysis, TemporalDataPoint, VisibilityWindow } from '../types';

export interface EngineWindow { startUtc: string; endUtc: string }
interface EngineBody { elevDeg: number[]; azDeg: number[]; horizonDeg: number[]; state: string[] }
export interface EngineResult {
  schemaVersion: 1;
  siteId: string;
  horizon: 'terrain' | 'flat';
  stepMinutes: number;
  times: string[];
  sun: EngineBody;
  earth: EngineBody;
  windows: { sun: EngineWindow[]; earth: EngineWindow[]; both: EngineWindow[] };
  metrics: {
    sunElevNowDeg: number;
    nextSunsetUtc: string | null;
    nextEarthsetUtc: string | null;
    sunlitHours: number;
    earthVisibleHours: number;
    bothHours: number;
    longestDarkHours: number;
    longestEarthOutageHours: number;
  };
  meta: Record<string, unknown>;
}
interface PrecomputedIndex { startUtc: string; endUtc: string; stepMinutes: number; sites: { id: string }[] }

const DATA_URL = `${(import.meta as any).env?.BASE_URL ?? '/'}data/precomputed/`;
const yearResults = new Map<string, EngineResult>();
let index: PrecomputedIndex | null = null;

interface Subsolar { startUtc: string; stepHours: number; latDeg: number[]; lonDeg: number[] }
let subsolar: Subsolar | null = null;
/** Terrain skyline of each site: elevation (deg) of the horizon for azimuth 0..359 (horizon_<siteId>.json). */
const skylines = new Map<string, number[]>();

/** The engine's terrain skyline for a site (360 values, azimuth 0 = north, clockwise), or null. */
export function skylineDeg(siteId: string): number[] | null {
  return skylines.get(siteId) ?? null;
}

/** Load the precomputed year of the given sites and the sub-solar points (call once before rendering). */
export async function loadEngineData(siteIds: string[]): Promise<void> {
  const get = async <T,>(name: string): Promise<T> => {
    const r = await fetch(DATA_URL + name);
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.json();
  };
  index = await get<PrecomputedIndex>('index.json');
  const ids = index.sites.map((s) => s.id).filter((id) => siteIds.includes(id));
  const [results, horizons, sub] = await Promise.all([
    Promise.all(ids.map((id) => get<EngineResult>(`result_${id}.json`))),
    Promise.all(ids.map((id) => get<{ siteId: string; elevDeg: number[] }>(`horizon_${id}.json`))),
    get<Subsolar>('subsolar.json'),
  ]);
  results.forEach((r) => yearResults.set(r.siteId, r));
  horizons.forEach((h) => skylines.set(h.siteId, h.elevDeg));
  subsolar = sub;
}

/**
 * Sub-solar point (where the Sun is at the zenith) at a UTC time, from the engine (hourly, interpolated).
 * Used to light the 3D globe with the real Sun direction. Null outside the precomputed year.
 */
export function subsolarPoint(date: string): { latDeg: number; lonDeg: number } | null {
  if (!subsolar) return null;
  const h = (ms(toUtcIso(date)) - ms(subsolar.startUtc)) / (subsolar.stepHours * 3_600_000);
  const i = Math.floor(h);
  if (i < 0 || i + 1 >= subsolar.latDeg.length) return null;
  const f = h - i;
  let dLon = subsolar.lonDeg[i + 1] - subsolar.lonDeg[i];
  if (dLon > 180) dLon -= 360;                 // longitude wraps at ±180°
  if (dLon < -180) dLon += 360;
  let lon = subsolar.lonDeg[i] + f * dLon;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { latDeg: subsolar.latDeg[i] + f * (subsolar.latDeg[i + 1] - subsolar.latDeg[i]), lonDeg: lon };
}

export function precomputedPeriod(): { startUtc: string; endUtc: string } | null {
  return index ? { startUtc: index.startUtc, endUtc: index.endUtc } : null;
}

// ---------------------------------------------------------------------------- time helpers (UTC)
const ms = (iso: string): number => Date.parse(iso);
const iso = (t: number): string => new Date(t).toISOString().replace('.000Z', 'Z');
const hoursBetween = (a: string, b: string): number => (ms(b) - ms(a)) / 3_600_000;

/** "2026-11-20T12:00" (no time zone) is read as UTC, like every time in the engine. */
export function toUtcIso(date: string): string {
  return iso(Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(date) ? date : `${date}${date.length <= 10 ? 'T00:00' : ''}Z`));
}

// ---------------------------------------------------------------------------- slicing (port of slice_result)
const clip = (win: EngineWindow[], start: string, end: string): EngineWindow[] =>
  win
    .map((w) => ({ startUtc: w.startUtc > start ? w.startUtc : start, endUtc: w.endUtc < end ? w.endUtc : end }))
    .filter((w) => w.startUtc < w.endUtc);

// Durations are summed in whole milliseconds and divided once, like the engine (exact same numbers).
const totalHours = (win: EngineWindow[]): number =>
  win.reduce((t, w) => t + (ms(w.endUtc) - ms(w.startUtc)), 0) / 3_600_000;

function longestGapHours(win: EngineWindow[], start: string, end: string): number {
  const edges = [start, ...win.flatMap((w) => [w.startUtc, w.endUtc]), end];
  let best = 0;
  for (let k = 0; k < edges.length; k += 2) best = Math.max(best, ms(edges[k + 1]) - ms(edges[k]));
  return best / 3_600_000;
}

/**
 * Same rounding as Python's round(x, 1), so the numbers match the engine exactly: it rounds the exact
 * binary value (595.55 is stored as 595.5499… -> 595.5) and sends exact ties to the even digit.
 */
function round1(x: number): number {
  const exact = x.toFixed(25);                 // decimal expansion of the stored binary value
  const [int, dec] = exact.split('.');
  if (/^50*$/.test(dec.slice(1))) {            // exact tie: half to even
    const tenths = Math.abs(Number(int)) * 10 + Number(dec[0]);
    return (Math.sign(x) * (tenths % 2 === 1 ? tenths + 1 : tenths)) / 10;
  }
  return Number(x.toFixed(1));
}

/** Cut [startUtc, endUtc) out of a longer result. Both must be on its time grid. */
export function sliceResult(res: EngineResult, startUtc: string, endUtc: string): EngineResult {
  const step = res.stepMinutes * 60_000;
  const t0 = ms(res.times[0]);
  if ((ms(startUtc) - t0) % step || (ms(endUtc) - t0) % step) throw new Error('start and end must fall on the time grid');
  const periodEnd = iso(ms(res.times[res.times.length - 1]) + step);
  if (!(res.times[0] <= startUtc && startUtc < endUtc && endUtc <= periodEnd)) throw new Error('period outside the result');
  const i0 = res.times.indexOf(startUtc);
  const i1 = endUtc === periodEnd ? res.times.length : res.times.indexOf(endUtc);
  const last = res.times[i1 - 1];
  const cutBody = (b: EngineBody): EngineBody => ({
    elevDeg: b.elevDeg.slice(i0, i1), azDeg: b.azDeg.slice(i0, i1),
    horizonDeg: b.horizonDeg.slice(i0, i1), state: b.state.slice(i0, i1),
  });
  const win = {
    sun: clip(res.windows.sun, startUtc, endUtc),
    earth: clip(res.windows.earth, startUtc, endUtc),
    both: clip(res.windows.both, startUtc, endUtc),
  };
  const nextSet = (w: EngineWindow[]): string | null => w.find((x) => startUtc < x.endUtc && x.endUtc <= last)?.endUtc ?? null;
  return {
    ...res,
    times: res.times.slice(i0, i1),
    sun: cutBody(res.sun),
    earth: cutBody(res.earth),
    windows: win,
    metrics: {
      sunElevNowDeg: res.sun.elevDeg[i0],
      nextSunsetUtc: nextSet(res.windows.sun),
      nextEarthsetUtc: nextSet(res.windows.earth),
      sunlitHours: round1(totalHours(win.sun)),
      earthVisibleHours: round1(totalHours(win.earth)),
      bothHours: round1(totalHours(win.both)),
      longestDarkHours: round1(longestGapHours(win.sun, startUtc, endUtc)),
      longestEarthOutageHours: round1(longestGapHours(win.earth, startUtc, endUtc)),
    },
  };
}

// ---------------------------------------------------------------------------- conversion to the screens' model
function complement(win: EngineWindow[], start: string, end: string): EngineWindow[] {
  const out: EngineWindow[] = [];
  let cursor = start;
  for (const w of win) {
    if (w.startUtc > cursor) out.push({ startUtc: cursor, endUtc: w.startUtc });
    cursor = w.endUtc > cursor ? w.endUtc : cursor;
  }
  if (cursor < end) out.push({ startUtc: cursor, endUtc: end });
  return out;
}

const toWindows = (win: EngineWindow[], type: VisibilityWindow['type'], start: string): VisibilityWindow[] =>
  win.map((w) => ({
    type,
    startTime: w.startUtc,
    endTime: w.endUtc,
    durationHours: round1(hoursBetween(w.startUtc, w.endUtc)),
    startHour: hoursBetween(start, w.startUtc),
    endHour: hoursBetween(start, w.endUtc),
  }));

/**
 * Engine result (already cut to the mission period) -> SiteMissionAnalysis used by the screens.
 * "Visible" uses the body centre above the terrain skyline (contract rule for windows and metrics).
 * estimatedSolarFluxPct is only the visible part of the Sun disc (100 / 50 / 0 for visible / partial / hidden),
 * not a power estimate.
 */
export function toSiteMissionAnalysis(
  site: LunarSite, res: EngineResult, endUtc: string, scenarioId: string, samplingIntervalHours: number,
): SiteMissionAnalysis {
  const start = res.times[0];
  const stride = Math.max(1, Math.round((samplingIntervalHours * 60) / res.stepMinutes));
  const flux: Record<string, number> = { visible: 100, partial: 50, hidden: 0 };
  const timeSeries: TemporalDataPoint[] = [];
  for (let i = 0; i < res.times.length; i += stride) {
    const sunVis = res.sun.elevDeg[i] > res.sun.horizonDeg[i];
    const earthVis = res.earth.elevDeg[i] > res.earth.horizonDeg[i];
    timeSeries.push({
      timestamp: res.times[i],
      epochMs: ms(res.times[i]),
      relativeHour: hoursBetween(start, res.times[i]),
      sunAzimuthDeg: res.sun.azDeg[i],
      sunElevationDeg: res.sun.elevDeg[i],
      sunGeometricVisible: res.sun.elevDeg[i] > 0,
      sunTerrainVisible: sunVis,
      localHorizonAtSunDeg: res.sun.horizonDeg[i],
      earthAzimuthDeg: res.earth.azDeg[i],
      earthElevationDeg: res.earth.elevDeg[i],
      earthGeometricVisible: res.earth.elevDeg[i] > 0,
      earthTerrainVisible: earthVis,
      localHorizonAtEarthDeg: res.earth.horizonDeg[i],
      estimatedSolarFluxPct: flux[res.sun.state[i]] ?? 0,
      directToEarthAvailable: earthVis,
    });
  }
  const total = hoursBetween(start, endUtc);
  const m = res.metrics;
  return {
    site,
    scenarioId,
    computedAt: new Date().toISOString(),
    timeSeries,
    totalDurationHours: total,
    totalSunlightHours: m.sunlitHours,
    sunlightPercentage: round1((100 * m.sunlitHours) / total),
    totalEarthVisibleHours: m.earthVisibleHours,
    earthVisiblePercentage: round1((100 * m.earthVisibleHours) / total),
    longestDarknessHours: m.longestDarkHours,
    longestEarthOutageHours: m.longestEarthOutageHours,
    sunlightWindows: toWindows(res.windows.sun, 'sunlight', start),
    darknessWindows: toWindows(complement(res.windows.sun, start, endUtc), 'darkness', start),
    earthVisibleWindows: toWindows(res.windows.earth, 'earth-visible', start),
    earthOutageWindows: toWindows(complement(res.windows.earth, start, endUtc), 'earth-outage', start),
    maxSunElevationDeg: Math.max(...res.sun.elevDeg),
    minSunElevationDeg: Math.min(...res.sun.elevDeg),
    maxEarthElevationDeg: Math.max(...res.earth.elevDeg),
    minEarthElevationDeg: Math.min(...res.earth.elevDeg),
  };
}

/**
 * Validated analysis of a catalogue site from the precomputed year, or null when the site or the
 * period is not covered (then the caller must say so or use the API).
 */
export function precomputedAnalysis(
  site: LunarSite, startDate: string, durationDays: number, scenarioId: string, samplingIntervalHours: number,
): SiteMissionAnalysis | null {
  const year = yearResults.get(site.id);
  if (!year || !index) return null;
  const step = year.stepMinutes * 60_000;
  const t0 = ms(year.times[0]);
  const start = t0 + Math.floor((ms(toUtcIso(startDate)) - t0) / step) * step;     // snap to the 30-min grid
  const end = start + Math.max(1, Math.round((durationDays * 86_400_000) / step)) * step;
  if (start < t0 || end > ms(index.endUtc)) return null;
  const cut = sliceResult(year, iso(start), iso(end));
  return toSiteMissionAnalysis(site, cut, iso(end), scenarioId, samplingIntervalHours);
}

// ---------------------------------------------------------------------------- custom coordinates (engine API)
export interface CustomResult { ok: boolean; reason?: string }

/**
 * Compute a custom site with the engine API for the whole precomputed year (about 5 s), so every
 * period chosen afterwards is cut out locally like a catalogue site. Needs VITE_BACKEND_API_URL
 * (e.g. http://localhost:8080 with the Docker image, see README). Returns why it failed otherwise.
 */
export async function computeCustomSite(site: LunarSite): Promise<CustomResult> {
  const api = (import.meta as any).env?.VITE_BACKEND_API_URL as string | undefined;
  if (!api) return { ok: false, reason: 'engine API not configured (VITE_BACKEND_API_URL)' };
  if (!index) return { ok: false, reason: 'engine data not loaded' };
  if (yearResults.has(site.id)) return { ok: true };
  try {
    const days = Math.round(hoursBetween(index.startUtc, index.endUtc) / 24);
    const r = await fetch(`${api.replace(/\/$/, '')}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latDeg: site.lat, lonDeg: site.lon, start: index.startUtc, days, stepMinutes: index.stepMinutes }),
    });
    const body = await r.json();
    if (!r.ok) return { ok: false, reason: typeof body.detail === 'string' ? body.detail : `HTTP ${r.status}` };
    const year = body as EngineResult;
    yearResults.set(site.id, year);
    // Site card numbers from the engine too (same rules as backend/scripts/export_frontend_sites.py)
    const hz = await fetch(`${api.replace(/\/$/, '')}/horizon?latDeg=${site.lat}&lonDeg=${site.lon}`).then((x) => x.json());
    const yearHours = hoursBetween(index.startUtc, index.endUtc);
    site.elevation = Math.round(hz.groundElevationM);
    skylines.set(site.id, hz.elevDeg);
    site.sunVisibilityPct = round1((100 * totalHours(year.windows.sun)) / yearHours);
    site.earthVisibilityPct = round1((100 * totalHours(year.windows.earth)) / yearHours);
    site.maxSolarElevation = Math.max(...year.sun.elevDeg);
    site.maxEarthElevation = Math.max(...year.earth.elevDeg);
    site.description =
      `ASTRA-SN engine (API). Ground elevation ${site.elevation} m (NASA LOLA 80 m). Over the precomputed year, ` +
      `the Sun centre is above the terrain skyline ${site.sunVisibilityPct} % of the time and the Earth centre ` +
      `${site.earthVisibilityPct} %. Geometric visibility only: not power, not a radio link.`;
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `engine API unreachable (${err})` };
  }
}
