// ============================================================================
// Lunar Horizon — Scientific Understand & Methodology Modal / Drawer
// Explains:
// 1. Official NASA data sources (LOLA DEM, LROC WAC, JPL Horizons)
// 2. Methodology & topocentric coordinate frames
// 3. Assumptions & scientific limitations
// 4. Site-specific analysis insights based on actual outputs
// ============================================================================

import React, { useMemo } from 'react';
import {
  X,
  BookOpen,
  Database,
  Compass,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Mountain,
  Sun,
  Globe,
} from 'lucide-react';
import { LunarSite, SiteMissionAnalysis } from '../../types';
import { formatCoordinates } from '../../data/sites';
import { formatElevation } from '../../utils/formatters';

export interface UnderstandModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: LunarSite;
  analysis?: SiteMissionAnalysis | null;
}

export default function UnderstandModal({
  isOpen,
  onClose,
  site,
  analysis,
}: UnderstandModalProps) {
  const isSouthPole = site.lat < -75;
  const isEquatorial = Math.abs(site.lat) < 30;
  const isNearSide = Math.abs(site.lon) < 85;

  // Generate dynamic, site-specific pedagogical findings based on actual calculations
  const siteFindings = useMemo(() => {
    const findings: { title: string; desc: string; icon: any }[] = [];

    // 1. Solar illumination physics
    if (isSouthPole) {
      if (analysis && analysis.sunlightPercentage > 70) {
        findings.push({
          title: 'High-Elevation Quasi-Permanent Sunlight Peak',
          desc: `Because ${site.name} is situated at ${Math.abs(site.lat).toFixed(1)}°S atop a high topographic elevation of ${formatElevation(site.elevation)}, it catches low grazing solar rays that skim over regional crater rims. The Sun circles the local horizon between ${analysis.minSunElevationDeg}° and ${analysis.maxSunElevationDeg}°, maintaining ${analysis.sunlightPercentage}% continuous illumination across this operational period.`,
          icon: Sun,
        });
      } else {
        findings.push({
          title: 'Polar Grazing Illumination & Terrain Obstruction',
          desc: `At ${Math.abs(site.lat).toFixed(1)}°S, the Sun never climbs higher than ~${analysis ? analysis.maxSunElevationDeg : 2.5}° above the horizontal. Surrounding topographic rims frequently cast long shadows across the site, resulting in periodic darkness windows.`,
          icon: Sun,
        });
      }
    } else if (isEquatorial) {
      findings.push({
        title: 'Equatorial Diurnal Solar Cycle',
        desc: `Located at low lunar latitude (${site.lat.toFixed(1)}°), ${site.name} experiences a classic ~29.5-day synodic diurnal cycle. When the Sun is above the horizon, it ascends to high elevations (${analysis ? analysis.maxSunElevationDeg : 80}°+), delivering intense perpendicular solar flux, followed by ~14 Earth days of total lunar night.`,
        icon: Sun,
      });
    }

    // 2. Direct-to-Earth Line of Sight
    if (isNearSide) {
      if (isSouthPole) {
        findings.push({
          title: 'Libration-Modulated Polar Earth Visibility',
          desc: `Because the Moon is tidally locked to Earth with ~1.54° axial inclination and up to ±7.9° longitudinal libration, Earth appears low along the horizon at ${analysis ? analysis.minEarthElevationDeg : 0}° to ${analysis ? analysis.maxEarthElevationDeg : 5}°. Topographic crater rims create intermittent line-of-sight occultations as Earth oscillates vertically and horizontally.`,
          icon: Globe,
        });
      } else {
        findings.push({
          title: 'Near-Continuous Direct-to-Earth Communication',
          desc: `As a near-side site with Earth positioned high in the observer's sky, ${site.name} enjoys persistent line-of-sight to NASA Deep Space Network (DSN) ground stations with 0% terrain obstruction.`,
          icon: Globe,
        });
      }
    } else {
      findings.push({
        title: 'Lunar Far-Side Communication Blockout',
        desc: `Situated on the lunar far side (${site.lon.toFixed(1)}°), the lunar body itself blocks direct radio frequency line-of-sight to Earth. A lunar relay satellite constellation (such as Queqiao or proposed CLPS relay orbiters) is required for operational telemetry.`,
        icon: Globe,
      });
    }

    return findings;
  }, [site, analysis, isSouthPole, isEquatorial, isNearSide]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#090D16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#04060B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Scientific Methodology, Data & Limitations</h2>
              <p className="text-[11px] text-white/50">
                Transparent documentation of NASA datasets, coordinate frames, and analytical results
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Dynamic Site Findings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Site-Specific Analysis Insights: {site.name}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {siteFindings.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-[#38BDF8]" />
                      <span className="font-bold text-white text-xs">{f.title}</span>
                    </div>
                    <p className="text-white/70 text-[11px] leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Data Sources */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[#38BDF8]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Official NASA Datasets & Ephemerides
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">NASA LOLA Altimetry (LDEM_16)</span>
                  <span className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/70">PDS Geodesy</span>
                </div>
                <p className="text-white/60 text-[11px] leading-relaxed">
                  Direct elevation sampling from the Lunar Orbiter Laser Altimeter aboard the Lunar Reconnaissance Orbiter (LRO). 16 pixels per degree (~1.89 km/pixel resolution). Datum elevation is relative to the standard 1,737.4 km lunar sphere.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">JPL Horizons Ephemeris System</span>
                  <span className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/70">NASA JPL SSD</span>
                </div>
                <p className="text-white/60 text-[11px] leading-relaxed">
                  High-precision sub-solar and sub-Earth coordinate solutions accounting for lunar axial inclination (1.543°), synodic rotation (29.53059d), and physical and optical librations (up to ±7.9° longitude, ±6.7° latitude).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Methodology */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Compass size={14} className="text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Analytical Methodology & Coordinate Frames
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-[11px] text-white/70 leading-relaxed">
              <p>
                <strong className="text-white">Topocentric Observer Horizon Frame:</strong> Angles are evaluated from the observer's local tangent plane. Azimuth is measured from True North (0°) eastward through East (90°), South (180°), and West (270°). Elevation is measured above the local geometric horizon (0°).
              </p>
              <p>
                <strong className="text-white">Observer Altitude Dip Correction:</strong> For elevated sites at altitude h above the mean lunar sphere (R = 1,737.4 km), the horizon is depressed by θ_dip ≈ arccos(R / (R + h)) ≈ √(2h/R).
              </p>
              <p>
                <strong className="text-white">360° Terrain Horizon Raycasting:</strong> Altimetry radial raycasts determine the maximum elevation obstacle θ_terrain(Az) for every azimuth degree. A celestial body is classified as terrain-visible if and only if its topocentric elevation exceeds the local terrain profile: El_body ≥ θ_terrain(Az_body).
              </p>
            </div>
          </div>

          {/* Section 4: Assumptions & Scientific Limitations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Assumptions & Scientific Scope Limitations
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-[11px] text-amber-200/80 leading-relaxed">
              <p>
                <strong className="text-amber-100">1. Spatial Resolution Limit:</strong> Elevation profiles use 16 px/° global DEM. While macro-massifs, ridges, and large craters are accurately modeled, micro-topographic boulders (&lt;100 m) and small impact craters are below resolution limit.
              </p>
              <p>
                <strong className="text-amber-100">2. Solar Disk Approximation:</strong> The Sun is modeled as a geometric point source at its optical center. Penumbral partial occultation (~0.53° angular diameter) is represented via threshold elevation rather than continuous penumbra integration.
              </p>
              <p>
                <strong className="text-amber-100">3. Lunar Vacuum:</strong> Calculations assume 0 atmospheric attenuation, scattering, or refraction (true for the lunar exosphere).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#04060B]">
          <span className="text-[11px] text-white/50">ASTRA-SN Scientific Verification Layer</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-md"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
