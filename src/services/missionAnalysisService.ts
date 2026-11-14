// ============================================================================
// Lunar Horizon — Mission Analysis & Operational Science Service
// Multi-day temporal environmental analysis over complete mission duration
// ============================================================================

import {
  LunarSite,
  MissionScenario,
  AnalysisConfiguration,
  SiteMissionAnalysis,
  TemporalDataPoint,
  VisibilityWindow,
  DateAlternativeComparison,
} from '../types';
import { astronomicalService } from './astronomicalService';
import { lunarTerrainService } from './lunarTerrainService';

export class MissionAnalysisService {
  private analysisCache = new Map<string, SiteMissionAnalysis>();

  /**
   * Run comprehensive environmental analysis for a lunar site across an entire operational period.
   */
  analyzeSiteMission(
    site: LunarSite,
    scenario: MissionScenario | {
      id?: string;
      startDate: string;
      durationDays: number;
      config?: Partial<AnalysisConfiguration>;
    }
  ): SiteMissionAnalysis {
    const scenarioId = scenario.id || 'default-scenario';
    const startDateIso = scenario.startDate;
    const durationDays = scenario.durationDays;
    const config: AnalysisConfiguration = {
      samplingIntervalHours: 1,
      terrainAware: true,
      priority: 'balanced',
      solarElevationCutoffDeg: 0,
      earthElevationCutoffDeg: 0,
      ...(scenario.config || {}),
    };

    const cacheKey = `${site.id}_${startDateIso}_${durationDays}d_${config.samplingIntervalHours}h_${config.terrainAware}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    // 1. Get 360-degree local terrain horizon mask
    const horizonProfile = lunarTerrainService.getHorizonProfile(site);

    // 2. Sample temporal points over the full duration
    const startEpoch = new Date(startDateIso).getTime();
    const totalHours = Math.round(durationDays * 24);
    const dtHours = Math.max(1, config.samplingIntervalHours);
    const timeSeries: TemporalDataPoint[] = [];

    let maxSunEl = -90;
    let minSunEl = 90;
    let maxEarthEl = -90;
    let minEarthEl = 90;

    for (let h = 0; h <= totalHours; h += dtHours) {
      const currentEpoch = startEpoch + h * 3600 * 1000;
      const currentIso = new Date(currentEpoch).toISOString();

      const sky = astronomicalService.calculateSkyPositions(site, currentEpoch);

      // Sun angles
      const sunAz = sky.sun.azimuthDeg;
      const sunEl = sky.sun.elevationDeg; // includes observer altitude dip
      const sunGeomVisible = sunEl > config.solarElevationCutoffDeg;

      // Local terrain obstruction at Sun azimuth
      const sunHorizonObstruction = lunarTerrainService.getHorizonElevationAtAzimuth(horizonProfile, sunAz);
      const sunEffectiveCutoff = (config.terrainAware ? sunHorizonObstruction : 0) + config.solarElevationCutoffDeg;
      const sunTerrainVisible = sunEl >= sunEffectiveCutoff;

      // Earth angles
      const earthAz = sky.earth.azimuthDeg;
      const earthEl = sky.earth.elevationDeg;
      const earthGeomVisible = earthEl > config.earthElevationCutoffDeg;

      // Local terrain obstruction at Earth azimuth
      const earthHorizonObstruction = lunarTerrainService.getHorizonElevationAtAzimuth(horizonProfile, earthAz);
      const earthEffectiveCutoff = (config.terrainAware ? earthHorizonObstruction : 0) + config.earthElevationCutoffDeg;
      const earthTerrainVisible = earthEl >= earthEffectiveCutoff;

      // Track min/max elevations
      if (sunEl > maxSunEl) maxSunEl = sunEl;
      if (sunEl < minSunEl) minSunEl = sunEl;
      if (earthEl > maxEarthEl) maxEarthEl = earthEl;
      if (earthEl < minEarthEl) minEarthEl = earthEl;

      // Solar flux approximation: cosine law with surface normal
      const sinEl = Math.sin((Math.max(0, sunEl) * Math.PI) / 180);
      const estimatedFluxPct = sunTerrainVisible ? Math.min(100, Math.round(sinEl * 100)) : 0;

      timeSeries.push({
        timestamp: currentIso,
        epochMs: currentEpoch,
        relativeHour: h,
        sunAzimuthDeg: Number(sunAz.toFixed(1)),
        sunElevationDeg: Number(sunEl.toFixed(2)),
        sunGeometricVisible: sunGeomVisible,
        sunTerrainVisible,
        localHorizonAtSunDeg: Number(sunHorizonObstruction.toFixed(2)),
        earthAzimuthDeg: Number(earthAz.toFixed(1)),
        earthElevationDeg: Number(earthEl.toFixed(2)),
        earthGeometricVisible: earthGeomVisible,
        earthTerrainVisible,
        localHorizonAtEarthDeg: Number(earthHorizonObstruction.toFixed(2)),
        estimatedSolarFluxPct: estimatedFluxPct,
        directToEarthAvailable: earthTerrainVisible,
      });
    }

    // 3. Extract continuous visibility windows
    const sunlightWindows = this.extractWindows(timeSeries, (p) => p.sunTerrainVisible, 'sunlight', dtHours);
    const darknessWindows = this.extractWindows(timeSeries, (p) => !p.sunTerrainVisible, 'darkness', dtHours);
    const earthVisibleWindows = this.extractWindows(timeSeries, (p) => p.earthTerrainVisible, 'earth-visible', dtHours);
    const earthOutageWindows = this.extractWindows(timeSeries, (p) => !p.earthTerrainVisible, 'earth-outage', dtHours);

    // 4. Summarize operational totals
    const totalDurationHours = totalHours;
    const totalSunlightHours = sunlightWindows.reduce((sum, w) => sum + w.durationHours, 0);
    const sunlightPercentage = totalDurationHours > 0 ? Number(((totalSunlightHours / totalDurationHours) * 100).toFixed(1)) : 0;

    const totalEarthVisibleHours = earthVisibleWindows.reduce((sum, w) => sum + w.durationHours, 0);
    const earthVisiblePercentage = totalDurationHours > 0 ? Number(((totalEarthVisibleHours / totalDurationHours) * 100).toFixed(1)) : 0;

    const longestDarknessHours = darknessWindows.length > 0 ? Math.max(...darknessWindows.map((w) => w.durationHours)) : 0;
    const longestEarthOutageHours = earthOutageWindows.length > 0 ? Math.max(...earthOutageWindows.map((w) => w.durationHours)) : 0;

    const result: SiteMissionAnalysis = {
      site,
      scenarioId,
      computedAt: new Date().toISOString(),
      timeSeries,
      totalDurationHours,
      totalSunlightHours,
      sunlightPercentage,
      totalEarthVisibleHours,
      earthVisiblePercentage,
      longestDarknessHours,
      longestEarthOutageHours,
      sunlightWindows,
      darknessWindows,
      earthVisibleWindows,
      earthOutageWindows,
      maxSunElevationDeg: Number(maxSunEl.toFixed(2)),
      minSunElevationDeg: Number(minSunEl.toFixed(2)),
      maxEarthElevationDeg: Number(maxEarthEl.toFixed(2)),
      minEarthElevationDeg: Number(minEarthEl.toFixed(2)),
    };

    this.analysisCache.set(cacheKey, result);
    return result;
  }

  /**
   * Compare multiple start date alternatives (e.g., launch slips) for the same landing site.
   */
  compareDateAlternatives(
    site: LunarSite,
    baseStartDateIso: string,
    durationDays: number,
    offsetsDays: { label: string; offsetDays: number }[] = [
      { label: 'Nominal Launch', offsetDays: 0 },
      { label: '+7 Days Delay', offsetDays: 7 },
      { label: '+14 Days Delay', offsetDays: 14 },
      { label: '+1 Synodic Month (+29.5d)', offsetDays: 29.53 },
    ]
  ): DateAlternativeComparison[] {
    const baseEpoch = new Date(baseStartDateIso).getTime();

    return offsetsDays.map(({ label, offsetDays }) => {
      const offsetEpoch = baseEpoch + offsetDays * 86400 * 1000;
      const offsetStartDate = new Date(offsetEpoch).toISOString();
      const analysis = this.analyzeSiteMission(site, {
        startDate: offsetStartDate,
        durationDays,
      });

      return {
        label,
        startDate: offsetStartDate,
        analysis,
      };
    });
  }

  /**
   * Helper algorithm: Detects contiguous blocks of true conditions
   */
  private extractWindows(
    series: TemporalDataPoint[],
    predicate: (pt: TemporalDataPoint) => boolean,
    type: VisibilityWindow['type'],
    dtHours: number
  ): VisibilityWindow[] {
    const windows: VisibilityWindow[] = [];
    let inWindow = false;
    let windowStartIdx = 0;

    for (let i = 0; i < series.length; i++) {
      const match = predicate(series[i]);
      if (match && !inWindow) {
        inWindow = true;
        windowStartIdx = i;
      } else if (!match && inWindow) {
        inWindow = false;
        const startPoint = series[windowStartIdx];
        const endPoint = series[i - 1];
        const duration = (i - windowStartIdx) * dtHours;

        windows.push({
          type,
          startTime: startPoint.timestamp,
          endTime: endPoint.timestamp,
          startHour: startPoint.relativeHour,
          endHour: endPoint.relativeHour,
          durationHours: duration,
        });
      }
    }

    // If still in window at the end of the simulation period
    if (inWindow) {
      const startPoint = series[windowStartIdx];
      const endPoint = series[series.length - 1];
      const duration = (series.length - windowStartIdx) * dtHours;

      windows.push({
        type,
        startTime: startPoint.timestamp,
        endTime: endPoint.timestamp,
        startHour: startPoint.relativeHour,
        endHour: endPoint.relativeHour,
        durationHours: duration,
      });
    }

    return windows;
  }
}

export const missionAnalysisService = new MissionAnalysisService();
