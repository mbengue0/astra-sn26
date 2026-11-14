// ============================================================================
// Lunar Horizon — Mission Analysis Workspace
// "One mission. Multiple candidate sites. An entire operational period."
// Architecture: Progressive Disclosure (Levels 1, 2, 3)
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  Sun,
  Globe,
  Clock,
  BatteryCharging,
  Radio,
  Mountain,
  Calendar,
  Layers,
  ChevronRight,
  Plus,
  X,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowRightLeft,
  CheckCircle2,
  Eye,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useMissionStore } from '../stores/useMissionStore';
import { SITES, formatCoordinates } from '../data/sites';
import { formatDegrees, formatPercent, formatDurationHours } from '../utils/formatters';
import { missionAnalysisService } from '../services/missionAnalysisService';
import { lunarTerrainService } from '../services/lunarTerrainService';

export default function MissionOverview() {
  const {
    missionName,
    setMissionName,
    startDate,
    setStartDate,
    durationDays,
    setDurationDays,
    activeHour,
    setActiveHour,
    candidateSiteIds,
    toggleCandidateSite,
    selectedSite,
    setSelectedSite,
    analysisConfig,
    setAnalysisConfig,
    missionPriority,
    setMissionPriority,
    siteAnalyses,
    activeWorkspaceLevel,
    setActiveWorkspaceLevel,
  } = useMissionStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);

  // Active inspected site's multi-day analysis
  const primaryAnalysis = useMemo(() => {
    return (
      siteAnalyses[selectedSite.id] ||
      missionAnalysisService.analyzeSiteMission(selectedSite, {
        startDate,
        durationDays,
        config: analysisConfig,
      })
    );
  }, [siteAnalyses, selectedSite, startDate, durationDays, analysisConfig]);

  // Current time point within the mission
  const currentPoint = useMemo(() => {
    const series = primaryAnalysis.timeSeries;
    const idx = Math.min(activeHour, series.length - 1);
    return series[idx] || series[0];
  }, [primaryAnalysis, activeHour]);

  // Horizon profile for Level 3 scientific view
  const horizonProfile = useMemo(() => {
    return lunarTerrainService.getHorizonProfile(selectedSite);
  }, [selectedSite]);

  // Launch slip date alternatives
  const dateAlternatives = useMemo(() => {
    return missionAnalysisService.compareDateAlternatives(selectedSite, startDate, durationDays);
  }, [selectedSite, startDate, durationDays]);

  // Playback timer for time scrub
  React.useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        const maxH = durationDays * 24;
        const next = activeHour + playbackSpeed;
        if (next >= maxH) {
          setIsPlaying(false);
          setActiveHour(0);
        } else {
          setActiveHour(next);
        }
      }, 300);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, durationDays, activeHour, setActiveHour]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FFFFFF] p-4 md:p-6 space-y-6 max-w-[1700px] mx-auto text-[#0F172A]">
      {/* ==================================================================== */}
      {/* Top Header & Mission Scenario Context Bar                             */}
      {/* ==================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#000000] text-white">
                NASA CLPS / ARTEMIS
              </span>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Challenge: Lunar Landing Site Navigator
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
              Mission Analysis Workspace
            </h1>
            <p className="text-[12px] text-[#475569] mt-0.5">
              Evaluating environmental conditions, illumination windows, and Earth communications across the complete operational timeline.
            </p>
          </div>

          {/* Quick Scenario Preferences */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Selector */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#CBD5E1] p-1 rounded-xl text-[11px]">
              <span className="px-2 text-[#64748B] font-semibold">Priority:</span>
              {(['balanced', 'solar-priority', 'comm-priority'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setMissionPriority(p)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    missionPriority === p
                      ? 'bg-[#000000] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {p === 'balanced' ? 'Balanced' : p === 'solar-priority' ? 'Solar' : 'Direct Link'}
                </button>
              ))}
            </div>

            {/* Terrain-Aware Mode Switch */}
            <button
              onClick={() =>
                setAnalysisConfig({ terrainAware: !analysisConfig.terrainAware })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                analysisConfig.terrainAware
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1] hover:border-[#94A3B8]'
              }`}
              title="Toggle between real NASA LOLA topography occlusion and smooth geometric sphere"
            >
              <Mountain size={13} />
              <span>{analysisConfig.terrainAware ? 'Terrain-Aware (LOLA)' : 'Geometric Sphere'}</span>
            </button>
          </div>
        </div>

        {/* Mission Parameters Config Row */}
        <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          {/* Mission Start */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl">
            <Calendar size={15} className="text-[#0F172A] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[9.5px] uppercase font-bold text-[#64748B]">Mission Start (UTC)</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent text-[12px] font-mono font-bold text-[#0F172A] outline-none"
              />
            </div>
          </div>

          {/* Operational Duration */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-xl">
            <Clock size={15} className="text-[#0F172A] shrink-0" />
            <div className="flex-1 min-w-0">
              <label className="block text-[9.5px] uppercase font-bold text-[#64748B]">Operational Duration</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full bg-transparent text-[12px] font-bold text-[#0F172A] outline-none cursor-pointer"
              >
                <option value={7}>7 Days (168 Hours)</option>
                <option value={14}>14 Days (336 Hours — Lunar Daytime)</option>
                <option value={21}>21 Days (504 Hours)</option>
                <option value={28}>28 Days (672 Hours — Full Synodic Month)</option>
              </select>
            </div>
          </div>

          {/* Candidate Sites Selection */}
          <div className="md:col-span-2 flex flex-wrap items-center gap-1.5 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[10px] uppercase font-bold text-[#64748B] mr-1">
              Candidate Sites ({candidateSiteIds.length}):
            </span>

            {candidateSiteIds.map((siteId) => {
              const site = SITES.find((s) => s.id === siteId);
              if (!site) return null;
              const isSelected = selectedSite.id === site.id;

              return (
                <div
                  key={site.id}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#000000] text-white shadow-xs'
                      : 'bg-[#FFFFFF] border border-[#CBD5E1] text-[#334155] hover:border-[#0F172A]'
                  }`}
                  onClick={() => setSelectedSite(site)}
                >
                  <span>{site.name}</span>
                  {candidateSiteIds.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCandidateSite(site.id);
                      }}
                      className="p-0.5 hover:bg-white/20 rounded-full"
                      title="Remove candidate"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Candidate Site Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddSiteModal(!showAddSiteModal)}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-dashed border-[#94A3B8] rounded-lg text-[11px] font-bold text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
              >
                <Plus size={12} />
                <span>Add Site</span>
              </button>

              {showAddSiteModal && (
                <div className="absolute top-8 left-0 z-30 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-2 shadow-xl min-w-[240px] max-h-60 overflow-y-auto space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#94A3B8] px-2 py-1">
                    Select a Site to Add
                  </div>
                  {SITES.filter((s) => !candidateSiteIds.includes(s.id)).map((site) => (
                    <button
                      key={site.id}
                      onClick={() => {
                        toggleCandidateSite(site.id);
                        setShowAddSiteModal(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-[#F1F5F9] font-medium flex items-center justify-between"
                    >
                      <span className="truncate">{site.name}</span>
                      <span className="font-mono text-[10px] text-[#64748B]">{site.lat.toFixed(1)}°</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Progressive Disclosure Navigation Tabs                               */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveWorkspaceLevel(1)}
          className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
            activeWorkspaceLevel === 1
              ? 'bg-[#FFFFFF] border-[#000000] ring-2 ring-[#000000] shadow-md'
              : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}
        >
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              activeWorkspaceLevel === 1 ? 'bg-[#000000] text-white' : 'bg-[#E2E8F0] text-[#475569]'
            }`}
          >
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-[#64748B]">Level 1</span>
              <span className="text-sm font-black text-[#0F172A]">Mission Overview</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
              Full-mission metrics, sunlight totals, and multi-site trade-off comparisons.
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveWorkspaceLevel(2)}
          className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
            activeWorkspaceLevel === 2
              ? 'bg-[#FFFFFF] border-[#000000] ring-2 ring-[#000000] shadow-md'
              : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}
        >
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              activeWorkspaceLevel === 2 ? 'bg-[#000000] text-white' : 'bg-[#E2E8F0] text-[#475569]'
            }`}
          >
            <Clock size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-[#64748B]">Level 2</span>
              <span className="text-sm font-black text-[#0F172A]">Temporal Exploration</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
              Multi-day operational timeline, time scrubber, visibility windows, and launch slips.
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveWorkspaceLevel(3)}
          className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
            activeWorkspaceLevel === 3
              ? 'bg-[#FFFFFF] border-[#000000] ring-2 ring-[#000000] shadow-md'
              : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}
        >
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              activeWorkspaceLevel === 3 ? 'bg-[#000000] text-white' : 'bg-[#E2E8F0] text-[#475569]'
            }`}
          >
            <Mountain size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-[#64748B]">Level 3</span>
              <span className="text-sm font-black text-[#0F172A]">Scientific Exploration</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
              360° LOLA DEM terrain horizon mask, celestial positions, and physical methodology.
            </p>
          </div>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* LEVEL 1: MISSION OVERVIEW                                            */}
      {/* ==================================================================== */}
      {activeWorkspaceLevel === 1 && (
        <div className="space-y-6">
          {/* Executive Metrics Grid for the selected site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sunlight Duration */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#64748B] mb-2">
                <span className="text-[10.5px] uppercase font-bold tracking-wider">Total Sunlight</span>
                <Sun size={17} className="text-[#E8A838]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#0F172A]">
                  {formatDurationHours(primaryAnalysis.totalSunlightHours)}
                </span>
                <span className="text-sm font-mono font-bold text-[#E8A838]">
                  ({primaryAnalysis.sunlightPercentage}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-[#000000] h-full rounded-full transition-all duration-300"
                  style={{ width: `${primaryAnalysis.sunlightPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">
                Across full {durationDays}-day operational window ({primaryAnalysis.totalDurationHours}h)
              </p>
            </div>

            {/* Total Direct-to-Earth Communication */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#64748B] mb-2">
                <span className="text-[10.5px] uppercase font-bold tracking-wider">Direct-to-Earth</span>
                <Globe size={17} className="text-[#2563EB]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#0F172A]">
                  {formatDurationHours(primaryAnalysis.totalEarthVisibleHours)}
                </span>
                <span className="text-sm font-mono font-bold text-[#2563EB]">
                  ({primaryAnalysis.earthVisiblePercentage}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-[#2563EB] h-full rounded-full transition-all duration-300"
                  style={{ width: `${primaryAnalysis.earthVisiblePercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">
                Line-of-sight elevation above local topography
              </p>
            </div>

            {/* Longest Continuous Darkness */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#64748B] mb-2">
                <span className="text-[10.5px] uppercase font-bold tracking-wider">Longest Darkness</span>
                <BatteryCharging size={17} className="text-[#0F172A]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#0F172A]">
                  {formatDurationHours(primaryAnalysis.longestDarknessHours)}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">
                {primaryAnalysis.longestDarknessHours === 0
                  ? 'Zero continuous night (Quasi-permanent illumination)'
                  : `Requires minimum ${primaryAnalysis.longestDarknessHours}h of lander battery reserve`}
              </p>
            </div>

            {/* Longest Earth Outage */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-[#64748B] mb-2">
                <span className="text-[10.5px] uppercase font-bold tracking-wider">Longest Earth Outage</span>
                <Radio size={17} className="text-[#0F172A]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-[#0F172A]">
                  {formatDurationHours(primaryAnalysis.longestEarthOutageHours)}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">
                {primaryAnalysis.longestEarthOutageHours === 0
                  ? 'Continuous DTE line of sight throughout mission'
                  : 'Requires telemetry store-and-forward capability'}
              </p>
            </div>
          </div>

          {/* Candidate Sites Multi-Scenario Comparison Matrix */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-[#0F172A]">
                  Candidate Sites Trade-Off Evaluation (Identical Conditions)
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  Direct side-by-side comparison under mission scenario: {startDate} for {durationDays} days.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold bg-[#F1F5F9] text-[#475569] px-2.5 py-1 rounded-lg">
                Terrain-Aware: {analysisConfig.terrainAware ? 'ON (LOLA DEM)' : 'OFF (Geometric)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {candidateSiteIds.map((siteId) => {
                const site = SITES.find((s) => s.id === siteId);
                if (!site) return null;
                const analysis =
                  siteAnalyses[site.id] ||
                  missionAnalysisService.analyzeSiteMission(site, {
                    startDate,
                    durationDays,
                    config: analysisConfig,
                  });
                const isSelected = selectedSite.id === site.id;

                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#FFFFFF] border-[#000000] ring-2 ring-[#000000] shadow-sm'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#94A3B8]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[#0F172A] text-sm">{site.name}</h4>
                          {isSelected && (
                            <span className="bg-[#000000] text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-[#64748B]">
                          {formatCoordinates(site.lat, site.lon)} • Elev {site.elevation}m
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2E8F0] text-[#334155]">
                        {site.category.toUpperCase()}
                      </span>
                    </div>

                    {/* Comparative bars */}
                    <div className="mt-4 space-y-2.5 text-[11px]">
                      <div>
                        <div className="flex justify-between font-semibold mb-1">
                          <span className="text-[#64748B] flex items-center gap-1">
                            <Sun size={12} className="text-[#E8A838]" /> Sunlight Visibility
                          </span>
                          <span className="font-mono text-[#0F172A]">
                            {analysis.sunlightPercentage}% ({analysis.totalSunlightHours}h)
                          </span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#000000] h-full rounded-full"
                            style={{ width: `${analysis.sunlightPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-semibold mb-1">
                          <span className="text-[#64748B] flex items-center gap-1">
                            <Globe size={12} className="text-[#2563EB]" /> Earth Visibility
                          </span>
                          <span className="font-mono text-[#0F172A]">
                            {analysis.earthVisiblePercentage}% ({analysis.totalEarthVisibleHours}h)
                          </span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#2563EB] h-full rounded-full"
                            style={{ width: `${analysis.earthVisiblePercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Operational Trade-off highlight */}
                    <div className="mt-4 pt-3 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-[10.5px]">
                      <div>
                        <span className="text-[#64748B] block">Worst Darkness:</span>
                        <span className="font-mono font-bold text-[#0F172A]">
                          {analysis.longestDarknessHours} hrs
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Worst Earth Outage:</span>
                        <span className="font-mono font-bold text-[#0F172A]">
                          {analysis.longestEarthOutageHours} hrs
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LEVEL 2: TEMPORAL EXPLORATION                                        */}
      {/* ==================================================================== */}
      {activeWorkspaceLevel === 2 && (
        <div className="space-y-6">
          {/* Interactive Operational Timeline Scrubber */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#64748B]">Time Controller</span>
                <h3 className="text-base font-black text-[#0F172A]">
                  Operational Hour: T+{activeHour}h ({new Date(currentPoint.epochMs).toUTCString()})
                </h3>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#000000] text-white text-[11px] font-bold hover:bg-[#1E293B]"
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
                </button>
                <button
                  onClick={() => setActiveHour(0)}
                  className="p-1.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]"
                  title="Reset to Mission Start T+0h"
                >
                  <RotateCcw size={14} />
                </button>
                <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-1 rounded-xl text-[11px]">
                  <span className="text-[#64748B] font-semibold">Speed:</span>
                  {[1, 4, 12].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        playbackSpeed === s ? 'bg-[#000000] text-white' : 'text-[#475569]'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrubber Range Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={durationDays * 24}
                value={activeHour}
                onChange={(e) => setActiveHour(Number(e.target.value))}
                className="w-full accent-[#000000] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
                <span>T+0h (Mission Start)</span>
                <span>T+{Math.round((durationDays * 24) / 2)}h (Midpoint)</span>
                <span>T+{durationDays * 24}h (Mission End)</span>
              </div>
            </div>
          </div>

          {/* Full Mission Operational Elevation Chart */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Continuous Sun & Earth Elevation Over Complete Mission Window
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  True astronomical topocentric elevation with local terrain mask line-of-sight threshold
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8A838]" />
                  <span>Sun Elevation</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <span>Earth Elevation</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={primaryAnalysis.timeSeries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="relativeHour"
                    unit="h"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} unit="°" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val}°`, '']}
                    labelFormatter={(hour) => `Mission Time: T+${hour}h`}
                  />
                  <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: 'Local Horizon (0°)', fill: '#94A3B8', fontSize: 10 }} />
                  <ReferenceLine x={activeHour} stroke="#000000" strokeWidth={2} label={{ value: `T+${activeHour}h`, fill: '#000000', fontSize: 10, position: 'top' }} />
                  <Line
                    type="monotone"
                    dataKey="sunElevationDeg"
                    name="Sun Elevation"
                    stroke="#E8A838"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="earthElevationDeg"
                    name="Earth Elevation"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alternative Launch Dates Comparison (Launch Slip Analysis) */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#0F172A]">
                  Alternative Launch Dates & Schedule Slip Analysis
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  How mission environmental feasibility shifts if launch is delayed for {selectedSite.name}
                </p>
              </div>
              <span className="badge badge-demo">Schedule Flexibility</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[10.5px] uppercase font-bold text-[#64748B]">
                    <th className="py-2.5 px-3">Launch Scenario</th>
                    <th className="py-2.5 px-3">Start Date (UTC)</th>
                    <th className="py-2.5 px-3">Sunlight Total</th>
                    <th className="py-2.5 px-3">Earth Contact</th>
                    <th className="py-2.5 px-3">Worst Darkness</th>
                    <th className="py-2.5 px-3">Worst Outage</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {dateAlternatives.map((alt, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-bold text-[#0F172A]">{alt.label}</td>
                      <td className="py-3 px-3 font-mono text-[#475569]">
                        {new Date(alt.startDate).toISOString().slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[#E8A838]">
                          {alt.analysis.sunlightPercentage}%
                        </span>{' '}
                        <span className="text-[#64748B]">({alt.analysis.totalSunlightHours}h)</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-[#2563EB]">
                          {alt.analysis.earthVisiblePercentage}%
                        </span>{' '}
                        <span className="text-[#64748B]">({alt.analysis.totalEarthVisibleHours}h)</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#0F172A]">
                        {alt.analysis.longestDarknessHours}h
                      </td>
                      <td className="py-3 px-3 font-mono text-[#0F172A]">
                        {alt.analysis.longestEarthOutageHours}h
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setStartDate(alt.startDate)}
                          className="px-2.5 py-1 rounded-lg bg-[#000000] text-white font-bold text-[11px] hover:bg-[#1E293B]"
                        >
                          Adopt Date
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LEVEL 3: SCIENTIFIC EXPLORATION                                      */}
      {/* ==================================================================== */}
      {activeWorkspaceLevel === 3 && (
        <div className="space-y-6">
          {/* 360-Degree Local Horizon Profile Mask */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#0F172A]">
                    360° Topocentric Terrain Horizon Mask — {selectedSite.name}
                  </h3>
                  <span className="badge badge-demo">NASA LOLA DEM</span>
                </div>
                <p className="text-[11.5px] text-[#64748B]">
                  Elevation angle of local mountain peaks and crater rims blocking the sky as seen by a surface lander
                </p>
              </div>

              {/* Instantaneous Celestial Coordinates */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#92400E]">
                  <Sun size={13} className="text-[#E8A838]" />
                  <span>Sun: Az {currentPoint.sunAzimuthDeg}° / El {currentPoint.sunElevationDeg}°</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#1E40AF]">
                  <Globe size={13} className="text-[#2563EB]" />
                  <span>Earth: Az {currentPoint.earthAzimuthDeg}° / El {currentPoint.earthElevationDeg}°</span>
                </div>
              </div>
            </div>

            {/* Horizon Profile Area Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={horizonProfile.points}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="horizonGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F172A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0F172A" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="azimuthDeg"
                    unit="°"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    ticks={[0, 45, 90, 135, 180, 225, 270, 315, 360]}
                  />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} unit="°" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val}°`, 'Terrain Obstruction']}
                    labelFormatter={(az) => `Azimuth: ${az}°`}
                  />
                  <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: 'Horizontal 0°', fill: '#94A3B8', fontSize: 10 }} />
                  {/* Sun position marker */}
                  <ReferenceLine
                    x={Math.round(currentPoint.sunAzimuthDeg)}
                    stroke="#E8A838"
                    strokeWidth={2}
                    label={{ value: `Sun (${currentPoint.sunElevationDeg}°)`, fill: '#E8A838', fontSize: 10, position: 'top' }}
                  />
                  {/* Earth position marker */}
                  <ReferenceLine
                    x={Math.round(currentPoint.earthAzimuthDeg)}
                    stroke="#2563EB"
                    strokeWidth={2}
                    label={{ value: `Earth (${currentPoint.earthElevationDeg}°)`, fill: '#2563EB', fontSize: 10, position: 'top' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="horizonElevationDeg"
                    name="Terrain Horizon"
                    stroke="#0F172A"
                    strokeWidth={2}
                    fill="url(#horizonGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-2 border-t border-[#F1F5F9]">
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[#64748B] block font-medium">Sun Terrain Obstruction Check</span>
                  <span className="font-bold text-[#0F172A]">
                    {currentPoint.sunElevationDeg >= currentPoint.localHorizonAtSunDeg
                      ? `Visible (+${(currentPoint.sunElevationDeg - currentPoint.localHorizonAtSunDeg).toFixed(2)}° above ridge)`
                      : `Shadowed (${(currentPoint.localHorizonAtSunDeg - currentPoint.sunElevationDeg).toFixed(2)}° behind ridge)`}
                  </span>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentPoint.sunTerrainVisible ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                  }`}
                />
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[#64748B] block font-medium">Earth Line-of-Sight Check</span>
                  <span className="font-bold text-[#0F172A]">
                    {currentPoint.earthElevationDeg >= currentPoint.localHorizonAtEarthDeg
                      ? `Direct Link (+${(currentPoint.earthElevationDeg - currentPoint.localHorizonAtEarthDeg).toFixed(2)}° clear of terrain)`
                      : `Occluded by local topography`}
                  </span>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentPoint.earthTerrainVisible ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Scientific Methodology, Assumptions & Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#000000]" />
                <h4 className="font-bold text-sm text-[#0F172A]">Scientific Assumptions & Modeling</h4>
              </div>
              <ul className="text-[12px] text-[#475569] space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-[#0F172A]">Geometric vs Terrain Visibility:</strong> Geometric visibility only considers a smooth lunar sphere with horizon dip √(2h/R). Terrain-aware visibility conducts radial ray-sampling against local LOLA DEM topography.
                </li>
                <li>
                  <strong className="text-[#0F172A]">Solar Grazing Incidence:</strong> At the lunar South Pole, the Sun never rises higher than ~1.5° to 2.0°. Solar panels must be mounted vertically to maximize incident power flux.
                </li>
                <li>
                  <strong className="text-[#0F172A]">Optical & Physical Libration:</strong> The Earth oscillates by ±7.9° in longitude and ±6.7° in latitude over an anomalistic/draconic cycle, causing the Earth to rise and set periodically for high-latitude polar sites.
                </li>
              </ul>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-[#000000]" />
                <h4 className="font-bold text-sm text-[#0F172A]">Data Provenance & Physical Limits</h4>
              </div>
              <ul className="text-[12px] text-[#475569] space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-[#0F172A]">DEM Resolution:</strong> Topography derived from Lunar Orbiter Laser Altimeter (LOLA) 16-bit DEM at 16 pixels per degree, interpolated bilinearly. Micro-boulders and sub-meter slopes are below DEM resolution.
                </li>
                <li>
                  <strong className="text-[#0F172A]">RF Propagation:</strong> Earth visibility confirms physical line of sight. Actual RF link margin requires link-budget calculation (frequency band, ground station antenna G/T, and atmospheric loss on Earth).
                </li>
                <li>
                  <strong className="text-[#0F172A]">Power Generation:</strong> Sun visibility indicates solar ray intercept. Power output assumes vertical solar array oriented dynamically towards solar azimuth.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
