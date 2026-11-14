// ============================================================================
// Lunar Horizon — Scenario & Site Comparison Modal / Cockpit
// Implements 2 Comparison Scenarios:
// 1. Same site, different dates (Nominal launch vs +7d, +14d, +29.5d launch slips)
// 2. Different sites, same date (Selected site vs Candidate alternate)
// Displays pure verified physical and astronomical metrics without unexplained scores.
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
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { LunarSite, AnalysisConfiguration, SiteMissionAnalysis } from '../../types';
import { SITES, formatCoordinates } from '../../data/sites';
import { missionAnalysisService } from '../../services/missionAnalysisService';
import { formatElevation } from '../../utils/formatters';

export interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSite: LunarSite;
  startDate: string;
  durationDays: number;
  config: AnalysisConfiguration;
  onSelectAlternativeSite?: (site: LunarSite) => void;
}

export default function CompareModal({
  isOpen,
  onClose,
  selectedSite,
  startDate,
  durationDays,
  config,
  onSelectAlternativeSite,
}: CompareModalProps) {
  // Mode: 'dates' (same site, different dates) | 'sites' (different sites, same date)
  const [compareMode, setCompareMode] = useState<'dates' | 'sites'>('dates');

  // Selected alternate site for 'sites' mode
  const [alternateSiteId, setAlternateSiteId] = useState<string>(() => {
    const other = SITES.find((s) => s.id !== selectedSite.id && s.category === selectedSite.category);
    return other ? other.id : SITES.find((s) => s.id !== selectedSite.id)?.id || SITES[0].id;
  });

  const alternateSite = useMemo(() => {
    return SITES.find((s) => s.id === alternateSiteId) || SITES[0];
  }, [alternateSiteId]);

  // 1. Date Alternatives Comparison (Launch Slips on Same Site)
  const dateAlternatives = useMemo(() => {
    if (!isOpen) return [];
    return missionAnalysisService.compareDateAlternatives(
      selectedSite,
      startDate,
      durationDays,
      [
        { label: 'Nominal Launch', offsetDays: 0 },
        { label: '+7 Days Slip', offsetDays: 7 },
        { label: '+14 Days Slip', offsetDays: 14 },
        { label: '+1 Synodic Month (+29.5d)', offsetDays: 29.53 },
      ]
    );
  }, [isOpen, selectedSite, startDate, durationDays]);

  // 2. Candidate Sites Comparison (Same Date & Duration)
  const siteAAnalysis = useMemo(() => {
    if (!isOpen) return null;
    return missionAnalysisService.analyzeSiteMission(selectedSite, {
      startDate,
      durationDays,
      config,
    });
  }, [isOpen, selectedSite, startDate, durationDays, config]);

  const siteBAnalysis = useMemo(() => {
    if (!isOpen || !alternateSite) return null;
    return missionAnalysisService.analyzeSiteMission(alternateSite, {
      startDate,
      durationDays,
      config,
    });
  }, [isOpen, alternateSite, startDate, durationDays, config]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-[#090D16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#04060B]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <GitCompare size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Mission Scenario Comparison Cockpit</h2>
              <p className="text-[11px] text-white/50">
                Aerospace trade study matrix — Transparent validated physical metrics
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

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10 bg-[#070A12]">
          <button
            type="button"
            onClick={() => setCompareMode('dates')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              compareMode === 'dates'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Calendar size={13} />
            <span>Same Site, Alternative Dates (Launch Slips)</span>
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('sites')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              compareMode === 'sites'
                ? 'bg-white text-black shadow-md'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MapPin size={13} />
            <span>Different Sites, Same Date (Candidate Trade Study)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Mode 1: Same Site, Different Dates */}
          {compareMode === 'dates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">
                    Launch Slip Sensitivity Analysis
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Evaluating environmental resilience for <span className="text-white font-medium">{selectedSite.name}</span> across schedule slip scenarios.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  Duration: {durationDays} days ({durationDays * 24} hours)
                </div>
              </div>

              {/* Matrix Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {dateAlternatives.map((alt, idx) => {
                  const isNominal = idx === 0;
                  const an = alt.analysis;
                  return (
                    <div
                      key={alt.label}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isNominal
                          ? 'bg-white/10 border-white/30 shadow-lg ring-1 ring-white/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <span className={`text-xs font-bold ${isNominal ? 'text-white' : 'text-white/80'}`}>
                            {alt.label}
                          </span>
                          {isNominal && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#38BDF8] text-black">
                              BASELINE
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-mono text-white/60">
                          {new Date(alt.startDate).toISOString().replace('T', ' ').slice(0, 16)} UTC
                        </div>

                        {/* Metrics */}
                        <div className="space-y-2 pt-1 text-[11px]">
                          {/* Sunlight */}
                          <div className="flex justify-between items-center">
                            <span className="text-white/50 flex items-center gap-1">
                              <Sun size={11} className="text-amber-400" />
                              <span>Sunlight</span>
                            </span>
                            <span className="font-mono font-bold text-white">
                              {an.sunlightPercentage}% ({an.totalSunlightHours}h)
                            </span>
                          </div>

                          {/* Earth LOS */}
                          <div className="flex justify-between items-center">
                            <span className="text-white/50 flex items-center gap-1">
                              <Globe size={11} className="text-sky-400" />
                              <span>Earth DTE</span>
                            </span>
                            <span className="font-mono font-bold text-white">
                              {an.earthVisiblePercentage}% ({an.totalEarthVisibleHours}h)
                            </span>
                          </div>

                          {/* Longest Darkness */}
                          <div className="flex justify-between items-center">
                            <span className="text-white/50 flex items-center gap-1">
                              <Clock size={11} className="text-rose-400" />
                              <span>Max Darkness</span>
                            </span>
                            <span className="font-mono font-bold text-rose-300">
                              {an.longestDarknessHours}h
                            </span>
                          </div>

                          {/* Longest Earth Outage */}
                          <div className="flex justify-between items-center">
                            <span className="text-white/50 flex items-center gap-1">
                              <Radio size={11} className="text-amber-400" />
                              <span>Max Comms Outage</span>
                            </span>
                            <span className="font-mono font-bold text-amber-300">
                              {an.longestEarthOutageHours}h
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Elevation Extents */}
                      <div className="mt-3 pt-2 border-t border-white/10 text-[9px] font-mono text-white/40 flex justify-between">
                        <span>Sun: {an.minSunElevationDeg}° to {an.maxSunElevationDeg}°</span>
                        <span>Earth: {an.minEarthElevationDeg}° to {an.maxEarthElevationDeg}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Different Sites, Same Date */}
          {compareMode === 'sites' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/90">
                    Candidate Landing Site Trade Study
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Evaluating alternative sites under identical launch epoch ({new Date(startDate).toISOString().replace('T', ' ').slice(0, 16)} UTC) and {durationDays}-day duration.
                  </p>
                </div>

                {/* Alternate Site Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">Compare against:</span>
                  <select
                    value={alternateSiteId}
                    onChange={(e) => setAlternateSiteId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-sans focus:outline-none focus:border-white"
                  >
                    {SITES.filter((s) => s.id !== selectedSite.id).map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#090D16] text-white">
                        {s.name} ({s.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {siteAAnalysis && siteBAnalysis && (
                <div className="space-y-4">
                  {/* Side-by-Side Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Site A Card */}
                    <div className="p-4 rounded-xl bg-white/10 border border-white/25 shadow-xl space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#38BDF8] font-bold">
                            PRIMARY SELECTED SITE
                          </span>
                          <h4 className="text-sm font-bold text-white">{selectedSite.name}</h4>
                        </div>
                        <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">
                          {formatElevation(selectedSite.elevation)}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-white/50">
                        Coords: {formatCoordinates(selectedSite.lat, selectedSite.lon, 2)}
                      </div>

                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Total Sunlight Duty Cycle</span>
                          <span className="font-mono font-bold text-white">
                            {siteAAnalysis.sunlightPercentage}% ({siteAAnalysis.totalSunlightHours}h)
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Direct Earth Line-of-Sight</span>
                          <span className="font-mono font-bold text-white">
                            {siteAAnalysis.earthVisiblePercentage}% ({siteAAnalysis.totalEarthVisibleHours}h)
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Longest Continuous Darkness</span>
                          <span className="font-mono font-bold text-rose-300">
                            {siteAAnalysis.longestDarknessHours}h
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Longest Comms Blackout</span>
                          <span className="font-mono font-bold text-amber-300">
                            {siteAAnalysis.longestEarthOutageHours}h
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-white/60">Solar Elevation Envelope</span>
                          <span className="font-mono text-white/80">
                            {siteAAnalysis.minSunElevationDeg}° to {siteAAnalysis.maxSunElevationDeg}°
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Site B Card */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/15 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 font-bold">
                            CANDIDATE ALTERNATIVE
                          </span>
                          <h4 className="text-sm font-bold text-white">{alternateSite.name}</h4>
                        </div>
                        <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">
                          {formatElevation(alternateSite.elevation)}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-white/50">
                        Coords: {formatCoordinates(alternateSite.lat, alternateSite.lon, 2)}
                      </div>

                      <div className="space-y-2 pt-1 text-xs">
                        {/* Sunlight with Delta */}
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Total Sunlight Duty Cycle</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">
                              {siteBAnalysis.sunlightPercentage}% ({siteBAnalysis.totalSunlightHours}h)
                            </span>
                            {(() => {
                              const delta = siteBAnalysis.sunlightPercentage - siteAAnalysis.sunlightPercentage;
                              if (Math.abs(delta) < 0.1) return null;
                              return (
                                <span
                                  className={`text-[10px] font-mono px-1 rounded ${
                                    delta > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Earth LOS with Delta */}
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Direct Earth Line-of-Sight</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">
                              {siteBAnalysis.earthVisiblePercentage}% ({siteBAnalysis.totalEarthVisibleHours}h)
                            </span>
                            {(() => {
                              const delta = siteBAnalysis.earthVisiblePercentage - siteAAnalysis.earthVisiblePercentage;
                              if (Math.abs(delta) < 0.1) return null;
                              return (
                                <span
                                  className={`text-[10px] font-mono px-1 rounded ${
                                    delta > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Darkness with Delta */}
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Longest Continuous Darkness</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-300">
                              {siteBAnalysis.longestDarknessHours}h
                            </span>
                            {(() => {
                              const delta = siteBAnalysis.longestDarknessHours - siteAAnalysis.longestDarknessHours;
                              if (delta === 0) return null;
                              return (
                                <span
                                  className={`text-[10px] font-mono px-1 rounded ${
                                    delta < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}h` : `${delta}h`}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Comms Outage with Delta */}
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-white/60">Longest Comms Blackout</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-300">
                              {siteBAnalysis.longestEarthOutageHours}h
                            </span>
                            {(() => {
                              const delta = siteBAnalysis.longestEarthOutageHours - siteAAnalysis.longestEarthOutageHours;
                              if (delta === 0) return null;
                              return (
                                <span
                                  className={`text-[10px] font-mono px-1 rounded ${
                                    delta < 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {delta > 0 ? `+${delta}h` : `${delta}h`}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1">
                          <span className="text-white/60">Solar Elevation Envelope</span>
                          <span className="font-mono text-white/80">
                            {siteBAnalysis.minSunElevationDeg}° to {siteBAnalysis.maxSunElevationDeg}°
                          </span>
                        </div>
                      </div>

                      {onSelectAlternativeSite && (
                        <div className="pt-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectAlternativeSite(alternateSite);
                              onClose();
                            }}
                            className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>Switch Primary Analysis to {alternateSite.name}</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#04060B]">
          <div className="text-[11px] text-white/40 flex items-center gap-1.5">
            <Info size={13} className="text-white/50" />
            <span>Values computed from 16 px/° NASA LOLA DEM & JPL ephemeris. Zero arbitrary weighting scores.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-md"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
