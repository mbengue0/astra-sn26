// ============================================================================
// Lunar Horizon — Core TypeScript Type Definitions
// ============================================================================

export type SiteCategory = 'clps' | 'artemis' | 'apollo' | 'international' | 'scientific';

export type SiteStatus = 'planned' | 'success' | 'poi' | 'candidate';

export interface LunarSite {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  elevation: number; // in meters (NASA LOLA datum)
  category: SiteCategory;
  status: SiteStatus;
  description: string;
  targetDate?: string;
  primaryMission?: string;
  sunVisibilityPct?: number;
  earthVisibilityPct?: number;
  maxSolarElevation?: number;
  maxEarthElevation?: number;
  temperatureRangeK?: [number, number];
  waterIcePotential?: 'High' | 'Medium' | 'Low' | 'Negligible';
  simpleSummary?: string;
  significance?: string;
}

// ----------------------------------------------------------------------------
// Mission Analysis & Operational Scenarios
// ----------------------------------------------------------------------------

export type MissionPriority = 'balanced' | 'solar-priority' | 'comm-priority';

export interface AnalysisConfiguration {
  samplingIntervalHours: number; // e.g., 1 hour or 2 hours
  terrainAware: boolean; // whether to compute with LOLA DEM horizon profile
  priority: MissionPriority;
  solarElevationCutoffDeg: number; // min solar elevation angle considered usable (default 0°)
  earthElevationCutoffDeg: number; // min Earth elevation angle considered line-of-sight (default 0°)
}

export interface HorizonPoint {
  azimuthDeg: number; // 0° to 359° (0 = North, 90 = East)
  horizonElevationDeg: number; // top of terrain obstruction in degrees above local horizontal
  distanceKm?: number;
}

export interface HorizonProfile {
  siteId: string;
  points: HorizonPoint[]; // 360 azimuth bins
  maxObstructionDeg: number;
  minObstructionDeg: number;
}

export interface TemporalDataPoint {
  timestamp: string; // ISO string
  epochMs: number;
  relativeHour: number;
  
  // Sun geometry & visibility
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  sunGeometricVisible: boolean;
  sunTerrainVisible: boolean;
  localHorizonAtSunDeg: number;

  // Earth geometry & line-of-sight
  earthAzimuthDeg: number;
  earthElevationDeg: number;
  earthGeometricVisible: boolean;
  earthTerrainVisible: boolean;
  localHorizonAtEarthDeg: number;

  // Instantaneous performance approximations
  estimatedSolarFluxPct: number; // 0-100% based on terrain visibility & cosine incidence
  directToEarthAvailable: boolean; // boolean direct line-of-sight
}

export interface VisibilityWindow {
  type: 'sunlight' | 'darkness' | 'earth-visible' | 'earth-outage';
  startTime: string;
  endTime: string;
  durationHours: number;
  startHour: number;
  endHour: number;
}

export interface SiteMissionAnalysis {
  site: LunarSite;
  scenarioId: string;
  computedAt: string;
  timeSeries: TemporalDataPoint[];
  
  // High-level operational metrics over full mission period
  totalDurationHours: number;
  totalSunlightHours: number;
  sunlightPercentage: number;
  totalEarthVisibleHours: number;
  earthVisiblePercentage: number;
  
  // Critical interruptions
  longestDarknessHours: number;
  longestEarthOutageHours: number;
  
  // Detailed windows
  sunlightWindows: VisibilityWindow[];
  darknessWindows: VisibilityWindow[];
  earthVisibleWindows: VisibilityWindow[];
  earthOutageWindows: VisibilityWindow[];

  // Min / Max celestial elevations
  maxSunElevationDeg: number;
  minSunElevationDeg: number;
  maxEarthElevationDeg: number;
  minEarthElevationDeg: number;
}

export interface MissionScenario {
  id: string;
  name: string;
  startDate: string; // ISO date string e.g. "2026-11-20T12:00"
  durationDays: number; // e.g. 14 days (1 lunar daytime)
  candidateSiteIds: string[];
  selectedSiteId: string; // currently inspected site
  config: AnalysisConfiguration;
}

export interface DateAlternativeComparison {
  label: string;
  startDate: string;
  analysis: SiteMissionAnalysis;
}

// ----------------------------------------------------------------------------
// Legacy/UI Specific Types
// ----------------------------------------------------------------------------

export interface MissionMetrics {
  solarElevation: number; // degrees
  solarIllumination: number; // percentage 0-100
  sunlightDurationHours: number;
  earthElevation: number; // degrees
  earthVisibility: boolean;
  earthAzimuth: number; // degrees
  sunAzimuth: number; // degrees
  nextSunsetHours: number;
  nextEarthsetHours: number | null; // null if continuously visible
  powerAvailabilityPct: number;
  communicationQualityPct: number;
  terrainSuitabilityScore: number; // 0-100
  thermalEnvironmentK: number;
}

export interface HourlySolarData {
  time: string; // ISO string or relative hour "T+00h"
  solarElevation: number;
  earthElevation: number;
  solarIllumination: number; // 0 or 100 or %
  commBandwidthMbps: number;
  powerOutputWatts: number;
}

export interface SiteComparisonScenario {
  id: string;
  site: LunarSite;
  date: string;
  durationDays: number;
  metrics: MissionMetrics;
}
