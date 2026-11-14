// ============================================================================
// Lunar Horizon — Standardized Mission Analysis Data Adapter
// Implements the agreed backend JSON contract: `schemaVersion: 1`
// Allows seamless switching between client-side NASA LOLA engine and backend API.
// ============================================================================

import {
  LunarSite,
  AnalysisConfiguration,
  SiteMissionAnalysis,
  TemporalDataPoint,
  VisibilityWindow,
} from '../types';
import { missionAnalysisService } from './missionAnalysisService';

/**
 * Standardized Backend JSON Contract (schemaVersion: 1)
 */
export interface MissionAnalysisEnvelopeV1 {
  schemaVersion: 1;
  generatedAt: string;
  engine: 'NASA-LOLA-LROC-JPL' | 'BACKEND-REMOTE';
  site: {
    id: string;
    name: string;
    coordinates: {
      latitudeDeg: number;
      longitudeDeg: number;
    };
    elevationMeters: number;
    category: string;
  };
  scenario: {
    startDateIso: string;
    durationDays: number;
    samplingIntervalHours: number;
    terrainAware: boolean;
    solarElevationCutoffDeg: number;
    earthElevationCutoffDeg: number;
  };
  metrics: {
    totalDurationHours: number;
    totalSunlightHours: number;
    sunlightPercentage: number;
    totalEarthVisibleHours: number;
    earthVisiblePercentage: number;
    longestDarknessHours: number;
    longestEarthOutageHours: number;
    solarElevationRangeDeg: {
      min: number;
      max: number;
    };
    earthElevationRangeDeg: {
      min: number;
      max: number;
    };
  };
  timeSeries: Array<{
    timestamp: string;
    relativeHour: number;
    sun: {
      azimuthDeg: number;
      elevationDeg: number;
      visible: boolean;
      localHorizonDeg: number;
    };
    earth: {
      azimuthDeg: number;
      elevationDeg: number;
      visible: boolean;
      localHorizonDeg: number;
    };
    estimatedSolarFluxPct: number;
    directToEarthAvailable: boolean;
  }>;
  visibilityWindows: {
    sunlight: Array<{
      startTime: string;
      endTime: string;
      durationHours: number;
      startHour: number;
      endHour: number;
    }>;
    darkness: Array<{
      startTime: string;
      endTime: string;
      durationHours: number;
      startHour: number;
      endHour: number;
    }>;
    earthVisible: Array<{
      startTime: string;
      endTime: string;
      durationHours: number;
      startHour: number;
      endHour: number;
    }>;
    earthOutage: Array<{
      startTime: string;
      endTime: string;
      durationHours: number;
      startHour: number;
      endHour: number;
    }>;
  };
}

export class AnalysisDataAdapter {
  /**
   * Transform internal SiteMissionAnalysis into the canonical schemaVersion: 1 contract.
   */
  public toContractV1(analysis: SiteMissionAnalysis, config?: AnalysisConfiguration): MissionAnalysisEnvelopeV1 {
    return {
      schemaVersion: 1,
      generatedAt: analysis.computedAt || new Date().toISOString(),
      engine: 'NASA-LOLA-LROC-JPL',
      site: {
        id: analysis.site.id,
        name: analysis.site.name,
        coordinates: {
          latitudeDeg: analysis.site.lat,
          longitudeDeg: analysis.site.lon,
        },
        elevationMeters: analysis.site.elevation,
        category: analysis.site.category,
      },
      scenario: {
        startDateIso: analysis.timeSeries[0]?.timestamp || new Date().toISOString(),
        durationDays: Number((analysis.totalDurationHours / 24).toFixed(1)),
        samplingIntervalHours: config?.samplingIntervalHours ?? 1,
        terrainAware: config?.terrainAware ?? true,
        solarElevationCutoffDeg: config?.solarElevationCutoffDeg ?? 0,
        earthElevationCutoffDeg: config?.earthElevationCutoffDeg ?? 0,
      },
      metrics: {
        totalDurationHours: analysis.totalDurationHours,
        totalSunlightHours: analysis.totalSunlightHours,
        sunlightPercentage: analysis.sunlightPercentage,
        totalEarthVisibleHours: analysis.totalEarthVisibleHours,
        earthVisiblePercentage: analysis.earthVisiblePercentage,
        longestDarknessHours: analysis.longestDarknessHours,
        longestEarthOutageHours: analysis.longestEarthOutageHours,
        solarElevationRangeDeg: {
          min: analysis.minSunElevationDeg,
          max: analysis.maxSunElevationDeg,
        },
        earthElevationRangeDeg: {
          min: analysis.minEarthElevationDeg,
          max: analysis.maxEarthElevationDeg,
        },
      },
      timeSeries: analysis.timeSeries.map((pt) => ({
        timestamp: pt.timestamp,
        relativeHour: pt.relativeHour,
        sun: {
          azimuthDeg: pt.sunAzimuthDeg,
          elevationDeg: pt.sunElevationDeg,
          visible: pt.sunTerrainVisible,
          localHorizonDeg: pt.localHorizonAtSunDeg,
        },
        earth: {
          azimuthDeg: pt.earthAzimuthDeg,
          elevationDeg: pt.earthElevationDeg,
          visible: pt.earthTerrainVisible,
          localHorizonDeg: pt.localHorizonAtEarthDeg,
        },
        estimatedSolarFluxPct: pt.estimatedSolarFluxPct,
        directToEarthAvailable: pt.directToEarthAvailable,
      })),
      visibilityWindows: {
        sunlight: analysis.sunlightWindows.map((w) => ({
          startTime: w.startTime,
          endTime: w.endTime,
          durationHours: w.durationHours,
          startHour: w.startHour,
          endHour: w.endHour,
        })),
        darkness: analysis.darknessWindows.map((w) => ({
          startTime: w.startTime,
          endTime: w.endTime,
          durationHours: w.durationHours,
          startHour: w.startHour,
          endHour: w.endHour,
        })),
        earthVisible: analysis.earthVisibleWindows.map((w) => ({
          startTime: w.startTime,
          endTime: w.endTime,
          durationHours: w.durationHours,
          startHour: w.startHour,
          endHour: w.endHour,
        })),
        earthOutage: analysis.earthOutageWindows.map((w) => ({
          startTime: w.startTime,
          endTime: w.endTime,
          durationHours: w.durationHours,
          startHour: w.startHour,
          endHour: w.endHour,
        })),
      },
    };
  }

  /**
   * Reconstitute canonical schemaVersion: 1 contract into internal SiteMissionAnalysis.
   */
  public fromContractV1(envelope: MissionAnalysisEnvelopeV1, siteFallback?: LunarSite): SiteMissionAnalysis {
    const site: LunarSite = siteFallback || {
      id: envelope.site.id,
      name: envelope.site.name,
      subtitle: `${envelope.site.category.toUpperCase()} Candidate`,
      lat: envelope.site.coordinates.latitudeDeg,
      lon: envelope.site.coordinates.longitudeDeg,
      elevation: envelope.site.elevationMeters,
      category: envelope.site.category as any,
      status: 'candidate',
      description: `Analysis reconstructed from schemaVersion: 1 dataset.`,
    };

    const timeSeries: TemporalDataPoint[] = envelope.timeSeries.map((pt) => ({
      timestamp: pt.timestamp,
      epochMs: new Date(pt.timestamp).getTime(),
      relativeHour: pt.relativeHour,
      sunAzimuthDeg: pt.sun.azimuthDeg,
      sunElevationDeg: pt.sun.elevationDeg,
      sunGeometricVisible: pt.sun.elevationDeg > 0,
      sunTerrainVisible: pt.sun.visible,
      localHorizonAtSunDeg: pt.sun.localHorizonDeg,
      earthAzimuthDeg: pt.earth.azimuthDeg,
      earthElevationDeg: pt.earth.elevationDeg,
      earthGeometricVisible: pt.earth.elevationDeg > 0,
      earthTerrainVisible: pt.earth.visible,
      localHorizonAtEarthDeg: pt.earth.localHorizonDeg,
      estimatedSolarFluxPct: pt.estimatedSolarFluxPct,
      directToEarthAvailable: pt.directToEarthAvailable,
    }));

    const convertWindow = (w: any, type: VisibilityWindow['type']): VisibilityWindow => ({
      type,
      startTime: w.startTime,
      endTime: w.endTime,
      durationHours: w.durationHours,
      startHour: w.startHour,
      endHour: w.endHour,
    });

    return {
      site,
      scenarioId: `contract-v1-${envelope.site.id}`,
      computedAt: envelope.generatedAt,
      timeSeries,
      totalDurationHours: envelope.metrics.totalDurationHours,
      totalSunlightHours: envelope.metrics.totalSunlightHours,
      sunlightPercentage: envelope.metrics.sunlightPercentage,
      totalEarthVisibleHours: envelope.metrics.totalEarthVisibleHours,
      earthVisiblePercentage: envelope.metrics.earthVisiblePercentage,
      longestDarknessHours: envelope.metrics.longestDarknessHours,
      longestEarthOutageHours: envelope.metrics.longestEarthOutageHours,
      sunlightWindows: envelope.visibilityWindows.sunlight.map((w) => convertWindow(w, 'sunlight')),
      darknessWindows: envelope.visibilityWindows.darkness.map((w) => convertWindow(w, 'darkness')),
      earthVisibleWindows: envelope.visibilityWindows.earthVisible.map((w) => convertWindow(w, 'earth-visible')),
      earthOutageWindows: envelope.visibilityWindows.earthOutage.map((w) => convertWindow(w, 'earth-outage')),
      maxSunElevationDeg: envelope.metrics.solarElevationRangeDeg.max,
      minSunElevationDeg: envelope.metrics.solarElevationRangeDeg.min,
      maxEarthElevationDeg: envelope.metrics.earthElevationRangeDeg.max,
      minEarthElevationDeg: envelope.metrics.earthElevationRangeDeg.min,
    };
  }

  /**
   * Fetch analysis from remote backend (if configured) or compute locally from real LOLA DEM.
   */
  public async getAnalysis(
    site: LunarSite,
    params: {
      startDate: string;
      durationDays: number;
      config?: Partial<AnalysisConfiguration>;
    }
  ): Promise<SiteMissionAnalysis> {
    const backendUrl = (import.meta as any).env?.VITE_BACKEND_API_URL;
    if (backendUrl) {
      try {
        const res = await fetch(`${backendUrl}/api/v1/mission-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schemaVersion: 1,
            siteId: site.id,
            lat: site.lat,
            lon: site.lon,
            startDate: params.startDate,
            durationDays: params.durationDays,
            config: params.config,
          }),
        });
        if (res.ok) {
          const envelope: MissionAnalysisEnvelopeV1 = await res.json();
          if (envelope.schemaVersion === 1) {
            return this.fromContractV1(envelope, site);
          }
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to client-side NASA LOLA engine:', err);
      }
    }

    // Default: Authenticated client-side calculation from NASA LOLA DEM + JPL Ephemeris
    return missionAnalysisService.analyzeSiteMission(site, params);
  }
}

export const analysisDataAdapter = new AnalysisDataAdapter();
