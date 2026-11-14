// ============================================================================
// Lunar Horizon — Immersive Multi-Site Aerospace Trade Matrix Cockpit
// Unified trade study comparing multiple candidate landing sites simultaneously
// with dynamic Launch Slip schedule adjustments (+0d, +7d, +14d, +29.5d).
// Uses validated physical and astronomical metrics without arbitrary scores.
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  X,
  GitCompare,
  Calendar,
  MapPin,
  Sun,
  Globe,
  Clock,
  Radio,
  Sliders,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { LunarSite, AnalysisConfiguration, SiteMissionAnalysis } from '../../types';
import { SITES, CATEGORIES, formatCoordinates } from '../../data/sites';
import { missionAnalysisService } from '../../services/missionAnalysisService';
import { formatElevation } from '../../utils/formatters';

export interface MultiSiteCompareCockpitProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSite: LunarSite;
  startDate: string;
  durationDays: number;
  config: AnalysisConfiguration;
  onSelectPrimarySite: (site: LunarSite) => void;
}

export default function MultiSiteCompareCockpit({
  isOpen,
  onClose,
  selectedSite,
  startDate,
  durationDays,
  config,
  onSelectPrimarySite,
}: MultiSiteCompareCockpitProps) {
  // Candidate sites included in the trade matrix (default: selectedSite + 2 relevant polar candidates)
  const [comparedSiteIds, setComparedSiteIds] = useState<string[]>(() => {
    const pool = SITES.filter((s) => s.id !== selectedSite.id && s.category === selectedSite.category);
    const initialOther = pool.slice(0, 2).map((s) => s.id);
    return [selectedSite.id, ...initialOther];
  });

  // Dynamic Launch Slip Offset in days (0d, +7d, +14d, +29.5d)
  const [slipOffsetDays, setSlipOffsetDays] = useState<number>(0);

  // Compute active evaluation start date based on slip offset
  const evaluatedStartDate = useMemo(() => {
    const baseEpoch = new Date(startDate).getTime();
    const shiftedEpoch = baseEpoch + slipOffsetDays * 86400 * 1000;
    return new Date(shiftedEpoch).toISOString();
  }, [startDate, slipOffsetDays]);

  // Compute multi-site analyses across all compared sites simultaneously
  const analyses = useMemo(() => {
    if (!isOpen) return {};
    const results: Record<string, SiteMissionAnalysis> = {};
    for (const siteId of comparedSiteIds) {
      const site = SITES.find((s) => s.id === siteId);
      if (site) {
        results[siteId] = missionAnalysisService.analyzeSiteMission(site, {
          startDate: evaluatedStartDate,
          durationDays,
          config,
        });
      }
    }
    return results;
  }, [isOpen, comparedSiteIds, evaluatedStartDate, durationDays, config]);

  // Determine top-performing site per key physical metric (no arbitrary scores)
  const metricWinners = useMemo(() => {
    const siteList = comparedSiteIds.map((id) => analyses[id]).filter(Boolean);
    if (siteList.length === 0) return { bestSun: '', bestComm: '', lowestNight: '' };

    let bestSun = siteList[0].site.id;
    let maxSunPct = siteList[0].sunlightPercentage;

    let bestComm = siteList[0].site.id;
    let maxCommPct = siteList[0].earthVisiblePercentage;

    let lowestNight = siteList[0].site.id;
    let minDarkness = siteList[0].longestDarknessHours;

    for (const an of siteList) {
      if (an.sunlightPercentage > maxSunPct) {
        maxSunPct = an.sunlightPercentage;
        bestSun = an.site.id;
      }
      if (an.earthVisiblePercentage > maxCommPct) {
        maxCommPct = an.earthVisiblePercentage;
        bestComm = an.site.id;
      }
      if (an.longestDarknessHours < minDarkness) {
        minDarkness = an.longestDarknessHours;
        lowestNight = an.site.id;
      }
    }

    return { bestSun, bestComm, lowestNight };
  }, [analyses, comparedSiteIds]);

  if (!isOpen) return null;

  const toggleSiteInComparison = (siteId: string) => {
    if (comparedSiteIds.includes(siteId)) {
      if (comparedSiteIds.length <= 2) return; // keep at least 2 sites
      setComparedSiteIds(comparedSiteIds.filter((id) => id !== siteId));
    } else {
      if (comparedSiteIds.length >= 4) return; // max 4 sites for clean matrix view
      setComparedSiteIds([...comparedSiteIds, siteId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#090D16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#04060B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <GitCompare size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Multi-Site Aerospace Trade Study Cockpit</h2>
              <p className="text-[11px] text-white/50">
                Evaluating candidate landing sites under synchronized launch epoch and operational duration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Schedule & Site Filter Controls Bar */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#070A12] flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Launch Slip Controller */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 flex items-center gap-1.5 text-xs font-semibold">
              <Calendar size={13} className="text-[#38BDF8]" />
              <span>Launch Slip Offset:</span>
            </span>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {[
                { label: 'Nominal (0d)', offset: 0 },
                { label: '+7 Days', offset: 7 },
                { label: '+14 Days', offset: 14 },
                { label: '+29.5d (1 Synodic)', offset: 29.53 },
              ].map(({ label, offset }) => (
                <button
                  key={offset}
                  type="button"
                  onClick={() => setSlipOffsetDays(offset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                    slipOffsetDays === offset
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Evaluation Timestamp Readout */}
          <div className="text-[11px] font-mono text-white/70 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
            Epoch: <span className="text-white font-bold">{evaluatedStartDate.replace('T', ' ').slice(0, 16)} UTC</span> · {durationDays}d Duration
          </div>
        </div>

        {/* Candidate Pool Chips */}
        <div className="px-6 py-2.5 bg-[#050811] border-b border-white/5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-white/50 mr-1">Include Sites in Matrix:</span>
          {SITES.map((site) => {
            const isIncluded = comparedSiteIds.includes(site.id);
            const isCurrentPrimary = site.id === selectedSite.id;
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => toggleSiteInComparison(site.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isIncluded
                    ? 'bg-white/15 text-white border border-white/30 font-semibold shadow-sm'
                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {isIncluded && <CheckCircle2 size={11} className="text-[#38BDF8]" />}
                <span>{site.name}</span>
                {isCurrentPrimary && (
                  <span className="text-[9px] font-mono bg-[#38BDF8] text-black px-1 rounded font-bold">
                    PRIMARY
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Matrix Grid: Side-by-Side Candidate Cards */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(4, Math.max(2, comparedSiteIds.length))} gap-4`}>
            {comparedSiteIds.map((siteId) => {
              const site = SITES.find((s) => s.id === siteId);
              const an = analyses[siteId];
              if (!site || !an) return null;

              const isPrimary = site.id === selectedSite.id;
              const hasBestSun = metricWinners.bestSun === site.id;
              const hasBestComm = metricWinners.bestComm === site.id;
              const hasLowestNight = metricWinners.lowestNight === site.id;

              return (
                <div
                  key={site.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    isPrimary
                      ? 'bg-white/10 border-white/30 shadow-2xl ring-1 ring-white/20'
                      : 'bg-white/5 border-white/15 hover:border-white/25'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Top: Title, Elevation & Primary Badge */}
                    <div className="pb-2.5 border-b border-white/10">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#38BDF8] font-bold">
                          {CATEGORIES[site.category]?.label || site.category}
                        </span>
                        {isPrimary && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#38BDF8] text-black">
                            ACTIVE 3D SITE
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white leading-tight">{site.name}</h3>
                      <div className="text-[10px] font-mono text-white/50 flex justify-between pt-1">
                        <span>{formatCoordinates(site.lat, site.lon, 1)}</span>
                        <span>LOLA {formatElevation(site.elevation)}</span>
                      </div>
                    </div>

                    {/* Operational Advantages Tags */}
                    <div className="flex flex-wrap gap-1">
                      {hasBestSun && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Sun size={10} />
                          <span>Max Solar</span>
                        </span>
                      )}
                      {hasBestComm && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Globe size={10} />
                          <span>Max Earth LOS</span>
                        </span>
                      )}
                      {hasLowestNight && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck size={10} />
                          <span>Min Darkness</span>
                        </span>
                      )}
                    </div>

                    {/* Key Physical Metrics */}
                    <div className="space-y-2 pt-1 text-xs">
                      {/* Sunlight */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center text-white/60">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Sun size={12} className="text-amber-400" />
                            <span>Sunlight Duty Cycle</span>
                          </span>
                          <span className="font-mono font-bold text-white text-xs">
                            {an.sunlightPercentage}%
                          </span>
                        </div>
                        {/* Visual Progress Bar */}
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${an.sunlightPercentage}%` }}
                          />
                        </div>
                        <div className="text-[9px] font-mono text-white/40 text-right">
                          {an.totalSunlightHours}h of {an.totalDurationHours}h
                        </div>
                      </div>

                      {/* Earth LOS */}
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center text-white/60">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Globe size={12} className="text-sky-400" />
                            <span>Earth DTE Contact</span>
                          </span>
                          <span className="font-mono font-bold text-white text-xs">
                            {an.earthVisiblePercentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400 rounded-full"
                            style={{ width: `${an.earthVisiblePercentage}%` }}
                          />
                        </div>
                        <div className="text-[9px] font-mono text-white/40 text-right">
                          {an.totalEarthVisibleHours}h of {an.totalDurationHours}h
                        </div>
                      </div>

                      {/* Longest Darkness & Outage */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="p-1.5 rounded-lg bg-black/30 border border-white/5">
                          <div className="text-white/40">Max Darkness</div>
                          <div className="font-mono font-bold text-rose-300 text-xs mt-0.5">
                            {an.longestDarknessHours}h
                          </div>
                        </div>
                        <div className="p-1.5 rounded-lg bg-black/30 border border-white/5">
                          <div className="text-white/40">Max Comms Outage</div>
                          <div className="font-mono font-bold text-amber-300 text-xs mt-0.5">
                            {an.longestEarthOutageHours}h
                          </div>
                        </div>
                      </div>

                      {/* Solar & Earth Elevation Ranges */}
                      <div className="text-[9px] font-mono text-white/50 pt-1 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Sun Elevation:</span>
                          <span className="text-white/80">{an.minSunElevationDeg}° to {an.maxSunElevationDeg}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Earth Elevation:</span>
                          <span className="text-white/80">{an.minEarthElevationDeg}° to {an.maxEarthElevationDeg}°</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Switch to this site action */}
                  <div className="pt-3 mt-3 border-t border-white/10">
                    {isPrimary ? (
                      <div className="py-1.5 text-center text-[10px] font-mono text-[#38BDF8] font-bold">
                        Currently Inspected in 3D
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPrimarySite(site);
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Select as Active Site</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#04060B]">
          <div className="text-[11px] text-white/40 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-white/50" />
            <span>NASA LOLA LDEM_16 altimetry & JPL ephemerides. Unbiased physical parameters.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Close Trade Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
