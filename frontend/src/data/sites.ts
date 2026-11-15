// ============================================================================
// ASTRA-SN — Site catalogue (from the validated engine)
// Sites: data/sites/sites.json (official IAU centre points + 4 test sites).
// Numbers: generated from contract/precomputed/ by backend/scripts/export_frontend_sites.py
// (ground elevation from LOLA; visibility = share of the precomputed year with the body centre
// above the terrain skyline). Do not write numbers here by hand.
// ============================================================================

import { LunarSite, SiteCategory } from '../types';
import engineSites from './engineSites.json';

export const CATEGORIES: Record<SiteCategory, { label: string; name: string; color: string; description: string }> = {
  clps: {
    label: 'NASA CLPS Missions',
    name: 'NASA CLPS Missions',
    color: '#000000',
    description: 'Commercial Lunar Payload Services commercial lander delivery targets',
  },
  artemis: {
    label: 'Artemis Exploration Zone',
    name: 'Artemis Exploration Zone',
    color: '#2563EB',
    description: 'NASA Artemis candidate human and robotic landing sites at the South Pole',
  },
  apollo: {
    label: 'Historic Apollo Sites',
    name: 'Historic Apollo Sites',
    color: '#D97706',
    description: 'Historical Apollo lunar landings for benchmark comparisons',
  },
  international: {
    label: 'International Landers',
    name: 'International Landers',
    color: '#059669',
    description: 'Chang’e, Chandrayaan, SLIM and international exploration touchdowns',
  },
  scientific: {
    label: 'High-Priority Science Targets',
    name: 'High-Priority Science Targets',
    color: '#7C3AED',
    description: 'Permanently Shadowed Regions (PSRs) and peak illumination massifs',
  },
};

const SUBTITLE = (id: string): string =>
  id.startsWith('iau_mons') ? 'IAU feature centre point · mountain'
  : id.startsWith('iau_') ? 'IAU feature centre point · crater floor'
  : 'Test site (not an official site coordinate)';

export const SITES: LunarSite[] = engineSites.sites.map((s) => ({
  id: s.id,
  name: s.name,
  subtitle: SUBTITLE(s.id),
  lat: s.lat,
  lon: s.lon,
  elevation: s.elevation,
  category: 'scientific' as SiteCategory,
  status: 'candidate' as const,
  description:
    `Ground elevation ${s.elevation} m (NASA LOLA 80 m). Over the precomputed year ` +
    `(${engineSites.period.startUtc.slice(0, 10)} → ${engineSites.period.endUtc.slice(0, 10)}), the Sun centre is above ` +
    `the terrain skyline ${s.sunVisibilityPct} % of the time and the Earth centre ${s.earthVisibilityPct} %. ` +
    'Geometric visibility only: not power, not a radio link.',
  sunVisibilityPct: s.sunVisibilityPct,
  earthVisibilityPct: s.earthVisibilityPct,
  maxSolarElevation: s.maxSolarElevation,
  maxEarthElevation: s.maxEarthElevation,
}));

export function getSitesByCategory(category: SiteCategory): LunarSite[] {
  return SITES.filter(s => s.category === category);
}

export function formatCoordinates(lat: number, lon: number, decimals = 2): string {
  const latStr = `${Math.abs(lat).toFixed(decimals)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(decimals)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}
