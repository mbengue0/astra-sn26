// ============================================================================
// Lunar Horizon — NASA Terrain & Elevation Service
// Integrates real NASA LROC Color and LOLA DEM datasets
// ============================================================================

import { LunarSite, HorizonPoint, HorizonProfile } from '../types';

export interface LunarDEMMetadata {
  dataset: string;
  colorDataset: string;
  referenceRadiusKm: number;
  units: string;
  elevationMinMeters: number;
  elevationMaxMeters: number;
  elevationRangeMeters: number;
  elevationMinKm: number;
  elevationMaxKm: number;
  rawMin: number;
  rawMax: number;
  gridResolution: {
    width: number;
    height: number;
    degPerPixel: number;
    file: string;
    type: string;
  };
  displacementMaps: {
    lod2k: string;
    lod4k: string;
    normalizedRangeMeters: number;
    displacementScaleFactor: number;
  };
}

export interface HighResSitesMetadata {
  gridSize: number;
  spanKm: number;
  dataset: string;
  groundSampleDistanceKm: number;
  units: string;
  sites: Record<
    string,
    {
      byteOffset: number;
      numValues: number;
      centerElev: number;
      minElev: number;
      maxElev: number;
      elevRange: number;
    }
  >;
}

export interface LocalTerrainData {
  positions: Float32Array;
  uvs: Float32Array;
  normals?: Float32Array;
  indices: Uint16Array;
  elevations: Float32Array;
  minElevation: number;
  maxElevation: number;
  elevationRange: number;
  centerElevation: number;
  widthKm: number;
  resolution: number;
  isHighResLOLA: boolean;
  datasetName: string;
}

class LunarTerrainService {
  private meta: LunarDEMMetadata | null = null;
  private elevationGrid: Int16Array | null = null;
  private highResMeta: HighResSitesMetadata | null = null;
  private highResGrid: Int16Array | null = null;
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const [metaRes, binRes, hrMetaRes, hrBinRes] = await Promise.allSettled([
          fetch('/assets/moon/ldem_metadata.json'),
          fetch('/assets/moon/ldem_elevation_720x360.bin'),
          fetch('/assets/moon/lola_highres_sites_meta.json'),
          fetch('/assets/moon/lola_highres_sites_dem.bin'),
        ]);

        if (metaRes.status === 'fulfilled' && metaRes.value.ok) {
          this.meta = await metaRes.value.json();
        }
        if (binRes.status === 'fulfilled' && binRes.value.ok) {
          const buffer = await binRes.value.arrayBuffer();
          this.elevationGrid = new Int16Array(buffer);
          this.isLoaded = true;
        }
        if (hrMetaRes.status === 'fulfilled' && hrMetaRes.value.ok) {
          this.highResMeta = await hrMetaRes.value.json();
        }
        if (hrBinRes.status === 'fulfilled' && hrBinRes.value.ok) {
          const hrBuffer = await hrBinRes.value.arrayBuffer();
          this.highResGrid = new Int16Array(hrBuffer);
        }
      } catch (err) {
        console.warn('Could not load NASA LOLA elevation datasets:', err);
      }
    })();

    return this.loadingPromise;
  }

  getMetadata(): LunarDEMMetadata | null {
    return this.meta;
  }

  getHighResMetadata(): HighResSitesMetadata | null {
    return this.highResMeta;
  }

  /**
   * Sample real NASA LOLA elevation in meters at any latitude/longitude using bilinear interpolation
   */
  getElevation(lat: number, lon: number): number {
    if (!this.elevationGrid || !this.meta) {
      // Approximate fallback based on South Pole Aitken and highlands
      return -1000 + Math.sin(lat * Math.PI / 180) * 2000;
    }

    const { width, height } = this.meta.gridResolution;

    // Normalizing lon to [-180, 180]
    let nLon = lon;
    while (nLon > 180) nLon -= 360;
    while (nLon < -180) nLon += 360;

    // Clamping lat to [-90, 90]
    const cLat = Math.max(-90, Math.min(90, lat));

    // Convert to grid float coordinates
    const gx = ((nLon + 180) / 360) * (width - 1);
    const gy = ((90 - cLat) / 180) * (height - 1);

    const x0 = Math.floor(gx);
    const x1 = Math.min(width - 1, x0 + 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(height - 1, y0 + 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const v00 = this.elevationGrid[y0 * width + x0];
    const v10 = this.elevationGrid[y0 * width + x1];
    const v01 = this.elevationGrid[y1 * width + x0];
    const v11 = this.elevationGrid[y1 * width + x1];

    // Bilinear interpolation
    const elev = (1 - fx) * (1 - fy) * v00 +
                 fx * (1 - fy) * v10 +
                 (1 - fx) * fy * v01 +
                 fx * fy * v11;

    return elev;
  }

  /**
   * Generate localized 3D terrain grid around a target landing site for Surface View
   * Uses real NASA LOLA 16 px/° DEM data (128x128 resolution, 1:1 physical elevation scale)
   */
  generateLocalTerrain(
    centerLatOrSite: number | LunarSite,
    centerLonOrSpan: number = 40,
    spanKmInput = 40,
    gridSizeInput = 128
  ): LocalTerrainData {
    let centerLat: number;
    let centerLon: number;
    let siteId: string | undefined;
    let spanKm = spanKmInput;
    let gridSize = gridSizeInput;

    if (typeof centerLatOrSite === 'object') {
      centerLat = centerLatOrSite.lat;
      centerLon = centerLatOrSite.lon;
      siteId = centerLatOrSite.id;
      if (typeof centerLonOrSpan === 'number' && centerLonOrSpan !== 40) {
        spanKm = centerLonOrSpan;
      }
    } else {
      centerLat = centerLatOrSite;
      centerLon = typeof centerLonOrSpan === 'number' ? centerLonOrSpan : 0;
    }

    // Check if site has precomputed 16 px/deg LOLA DEM dataset
    const highResSite = siteId && this.highResMeta?.sites[siteId] ? this.highResMeta.sites[siteId] : null;
    const isHighRes = Boolean(highResSite && this.highResGrid);

    if (isHighRes && highResSite && this.highResGrid) {
      gridSize = this.highResMeta!.gridSize; // 128
      spanKm = this.highResMeta!.spanKm; // 40km
    }

    const numVerts = (gridSize + 1) * (gridSize + 1);
    const positions = new Float32Array(numVerts * 3);
    const normals = new Float32Array(numVerts * 3);
    const uvs = new Float32Array(numVerts * 2);
    const elevations = new Float32Array(numVerts);
    const indices = new Uint16Array(gridSize * gridSize * 6);

    const kmPerDegLat = 1737.4 * (Math.PI / 180); // ~30.32 km per degree
    const centerElev = highResSite ? highResSite.centerElev : this.getElevation(centerLat, centerLon);

    let minElev = Infinity;
    let maxElev = -Infinity;

    let vIdx = 0;
    let uvIdx = 0;

    // 1. Populate Vertex Positions & Relative Physical Elevation (1:1 scale)
    const hrOffset = highResSite ? highResSite.byteOffset / 2 : 0;

    for (let j = 0; j <= gridSize; j++) {
      const vFrac = j / gridSize;
      const yKm = (vFrac - 0.5) * spanKm;
      const dLat = yKm / kmPerDegLat;
      const lat = centerLat - dLat;

      const latRad = (lat * Math.PI) / 180;
      const kmPerDegLon = Math.max(0.5, kmPerDegLat * Math.cos(latRad));

      for (let i = 0; i <= gridSize; i++) {
        const uFrac = i / gridSize;
        const xKm = (uFrac - 0.5) * spanKm;
        const dLon = xKm / kmPerDegLon;
        const lon = centerLon + dLon;

        let elevMeters: number;
        if (isHighRes && this.highResGrid) {
          const sampleIdx = hrOffset + j * (gridSize + 1) + i;
          elevMeters = this.highResGrid[sampleIdx];
        } else {
          elevMeters = this.getElevation(lat, lon);
        }

        if (elevMeters < minElev) minElev = elevMeters;
        if (elevMeters > maxElev) maxElev = elevMeters;

        elevations[j * (gridSize + 1) + i] = elevMeters;

        // True 1:1 physical elevation scale in kilometers
        const relElevKm = (elevMeters - centerElev) / 1000;

        positions[vIdx] = xKm;
        positions[vIdx + 1] = relElevKm * 1.0; // 1:1 true physical scale
        positions[vIdx + 2] = yKm;
        vIdx += 3;

        // Local UVs across the 40km surface
        uvs[uvIdx] = uFrac;
        uvs[uvIdx + 1] = 1 - vFrac;
        uvIdx += 2;
      }
    }

    // 2. Compute Analytical Topographic Surface Normals from Elevation Gradient
    const stepKm = spanKm / gridSize;
    let nIdx = 0;
    for (let j = 0; j <= gridSize; j++) {
      for (let i = 0; i <= gridSize; i++) {
        const iL = Math.max(0, i - 1);
        const iR = Math.min(gridSize, i + 1);
        const jD = Math.max(0, j - 1);
        const jU = Math.min(gridSize, j + 1);

        const hL = elevations[j * (gridSize + 1) + iL] / 1000;
        const hR = elevations[j * (gridSize + 1) + iR] / 1000;
        const hD = elevations[jD * (gridSize + 1) + i] / 1000;
        const hU = elevations[jU * (gridSize + 1) + i] / 1000;

        const dhdx = (hR - hL) / ((iR - iL) * stepKm);
        const dhdz = (hU - hD) / ((jU - jD) * stepKm);

        // Surface normal: (-dh/dx, 1, -dh/dz) normalized
        const nx = -dhdx;
        const ny = 1.0;
        const nz = -dhdz;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;

        normals[nIdx] = nx / len;
        normals[nIdx + 1] = ny / len;
        normals[nIdx + 2] = nz / len;
        nIdx += 3;
      }
    }

    // 3. Generate Triangle Mesh Indices
    let iIdx = 0;
    for (let j = 0; j < gridSize; j++) {
      for (let i = 0; i < gridSize; i++) {
        const a = j * (gridSize + 1) + i;
        const b = a + 1;
        const c = a + (gridSize + 1);
        const d = c + 1;

        indices[iIdx++] = a;
        indices[iIdx++] = c;
        indices[iIdx++] = b;

        indices[iIdx++] = b;
        indices[iIdx++] = c;
        indices[iIdx++] = d;
      }
    }

    return {
      positions,
      uvs,
      normals,
      indices,
      elevations,
      minElevation: minElev,
      maxElevation: maxElev,
      elevationRange: maxElev - minElev,
      centerElevation: centerElev,
      widthKm: spanKm,
      resolution: gridSize,
      isHighResLOLA: isHighRes,
      datasetName: isHighRes ? 'NASA LOLA LDEM_16 (16 px/deg)' : 'NASA LOLA Global DEM (2 px/deg)',
    };
  }

  private horizonCache = new Map<string, HorizonProfile>();

  /**
   * Compute 360-degree topocentric horizon profile (terrain elevation mask)
   * accounts for local LOLA topography and lunar curvature drop over radial rays.
   */
  getHorizonProfile(site: LunarSite, radiusKm = 60, azSteps = 360): HorizonProfile {
    const cacheKey = `${site.id}_${site.lat.toFixed(2)}_${site.lon.toFixed(2)}`;
    if (this.horizonCache.has(cacheKey)) {
      return this.horizonCache.get(cacheKey)!;
    }

    const points: HorizonPoint[] = [];
    const observerElev = site.elevation ?? this.getElevation(site.lat, site.lon);
    const rMoon = this.meta?.referenceRadiusKm ?? 1737.4;
    const dipDeg = -(Math.sqrt(Math.max(0, 2 * observerElev) / (rMoon * 1000)) * 180) / Math.PI;

    // Distances along radial rays (km)
    const sampleDistances = [1, 2, 4, 8, 15, 25, 40, radiusKm];
    const kmPerDegLat = rMoon * (Math.PI / 180); // ~30.32 km per degree
    const latRad = (site.lat * Math.PI) / 180;
    const kmPerDegLon = Math.max(0.5, kmPerDegLat * Math.cos(latRad));

    let maxObstruction = -90;
    let minObstruction = 90;
    const stepSize = 360 / azSteps;

    for (let az = 0; az < 360; az += stepSize) {
      const azRad = (az * Math.PI) / 180;
      const sinAz = Math.sin(azRad);
      const cosAz = Math.cos(azRad);

      let maxAngleForAz = dipDeg;

      for (const dKm of sampleDistances) {
        const dNorthKm = dKm * cosAz;
        const dEastKm = dKm * sinAz;

        const sampleLat = site.lat + (dNorthKm / kmPerDegLat);
        const sampleLon = site.lon + (dEastKm / kmPerDegLon);

        const sampleElev = this.getElevation(sampleLat, sampleLon);

        // Curvature drop: delta_h = d^2 / (2*R)
        const curvatureDropMeters = (dKm * dKm * 1000) / (2 * rMoon);
        const deltaHMeters = (sampleElev - observerElev) - curvatureDropMeters;
        const angleDeg = (Math.atan2(deltaHMeters, dKm * 1000) * 180) / Math.PI;

        if (angleDeg > maxAngleForAz) {
          maxAngleForAz = angleDeg;
        }
      }

      points.push({
        azimuthDeg: Math.round(az),
        horizonElevationDeg: Number(maxAngleForAz.toFixed(2)),
      });

      if (maxAngleForAz > maxObstruction) maxObstruction = maxAngleForAz;
      if (maxAngleForAz < minObstruction) minObstruction = maxAngleForAz;
    }

    const profile: HorizonProfile = {
      siteId: site.id,
      points,
      maxObstructionDeg: Number(maxObstruction.toFixed(2)),
      minObstructionDeg: Number(minObstruction.toFixed(2)),
    };

    this.horizonCache.set(cacheKey, profile);
    return profile;
  }

  /**
   * Look up terrain obstruction angle at a specific azimuth angle
   */
  getHorizonElevationAtAzimuth(profile: HorizonProfile, azimuthDeg: number): number {
    const normalizedAz = ((azimuthDeg % 360) + 360) % 360;
    const idx = Math.floor(normalizedAz) % profile.points.length;
    return profile.points[idx]?.horizonElevationDeg ?? 0;
  }
}

export const lunarTerrainService = new LunarTerrainService();
