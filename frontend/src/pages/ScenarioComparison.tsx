// ============================================================================
// Lunar Horizon — Scenario & Launch Slip Trade-off Matrix
// Professional Aerospace Decision Support Cockpit
// Evaluates candidate sites under identical mission conditions, evaluates launch
// slips (+7d, +14d, +29.5d synodic, +90d), and models contingency scenarios.
// Pure White Primary Interface (#FFFFFF) with solid Black Buttons (#000000).
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Plus,
  Trash2,
  Check,
  X,
  Mountain,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Sun,
  Globe,
  BatteryCharging,
  Radio,
  Layers,
  ArrowUpRight,
  Shield,
  HelpCircle,
  Eye,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useMissionStore } from '../stores/useMissionStore';
import { SITES, formatCoordinates } from '../data/sites';
import { formatDegrees, formatPercent, formatElevation, formatDurationHours } from '../utils/formatters';
import { missionAnalysisService } from '../services/missionAnalysisService';
import type { LunarSite, SiteMissionAnalysis } from '../types';

interface CustomScenario {
  id: string;
  name: string;
  site: LunarSite;
  date: string;
  isBaseline?: boolean;
}

export default function ScenarioComparison() {
  const {
    missionName,
    startDate,
    setStartDate,
    durationDays,
    setDurationDays,
    candidateSiteIds,
    toggleCandidateSite,
    selectedSite,
    setSelectedSite,
    analysisConfig,
    missionPriority,
    setMissionPriority,
  } = useMissionStore();

  // Mode: 'sites' (alternative sites) | 'dates' (launch slip on same site) | 'custom' (multi-variable matrix)
  const [comparisonMode, setComparisonMode] = useState<'sites' | 'dates' | 'custom'>('sites');

  // Custom multi-scenario list
  const [customScenarios, setCustomScenarios] = useState<CustomScenario[]>([
    {
      id: 'sc-baseline',
      name: 'Plan A (Nominal Baseline)',
      site: selectedSite,
      date: startDate,
      isBaseline: true,
    },
    {
      id: 'sc-alt-site',
      name: 'Plan B (Regional Alternate)',
      site: SITES.find((s) => s.id !== selectedSite.id && s.category === 'artemis') || SITES[0],
      date: startDate,
    },
    {
      id: 'sc-synodic-slip',
      name: 'Plan C (1-Month Launch Slip)',
      site: selectedSite,
      date: new Date(new Date(startDate).getTime() + 29.53 * 86400 * 1000).toISOString().slice(0, 16),
    },
  ]);

  const [newScenarioSiteId, setNewScenarioSiteId] = useState<string>(SITES[0].id);
  const [newScenarioDate, setNewScenarioDate] = useState<string>('2026-12-20T12:00');
  const [newScenarioName, setNewScenarioName] = useState<string>('Contingency Plan D');

  // Sites currently in the candidate comparison pool
  const comparedSites = useMemo(() => {
    return candidateSiteIds
      .map((id) => SITES.find((s) => s.id === id))
      .filter((s): s is LunarSite => !!s);
  }, [candidateSiteIds]);

  const availableSites = useMemo(() => {
    return SITES.filter((s) => !candidateSiteIds.includes(s.id));
  }, [candidateSiteIds]);

  // Multi-day analyses for compared sites
  const siteAnalyses = useMemo(() => {
    const map: Record<string, SiteMissionAnalysis> = {};
    for (const site of comparedSites) {
      map[site.id] = missionAnalysisService.analyzeSiteMission(site, {
        startDate,
        durationDays,
        config: analysisConfig,
      });
    }
    return map;
  }, [comparedSites, startDate, durationDays, analysisConfig]);

  // Baseline analysis (for selectedSite)
  const baselineAnalysis = useMemo(() => {
    return (
      siteAnalyses[selectedSite.id] ||
      missionAnalysisService.analyzeSiteMission(selectedSite, {
        startDate,
        durationDays,
        config: analysisConfig,
      })
    );
  }, [siteAnalyses, selectedSite, startDate, durationDays, analysisConfig]);

  // Launch slip delays definitions
  const slipDelays = [
    { label: 'Baseline (T0)', days: 0, desc: 'Original target launch window' },
    { label: '+7 Days Slip', days: 7, desc: 'Quarter-lunation slip' },
    { label: '+14 Days Slip', days: 14, desc: 'Half-lunation (illumination phase reversal)' },
    { label: '+29.5 Days Slip', days: 29.53, desc: '1 Synodic Month (next identical solar cycle)' },
    { label: '+90 Days Slip', days: 90, desc: 'Quarter-year seasonal polar tilt shift' },
  ];

  // Multi-day analyses for date slips
  const slipAnalyses = useMemo(() => {
    return slipDelays.map((slip) => {
      const baseEpoch = new Date(startDate).getTime();
      const slippedEpoch = baseEpoch + slip.days * 86400 * 1000;
      const slippedIso = new Date(slippedEpoch).toISOString().slice(0, 16);
      const analysis = missionAnalysisService.analyzeSiteMission(selectedSite, {
        startDate: slippedIso,
        durationDays,
        config: analysisConfig,
      });
      return {
        ...slip,
        iso: slippedIso,
        analysis,
      };
    });
  }, [selectedSite, startDate, durationDays, analysisConfig]);

  // Radar Chart Data preparation
  const radarData = useMemo(() => {
    if (comparedSites.length === 0) return [];
    
    // Normalized axes (0-100)
    const axes = [
      { key: 'sunlight', label: 'Sunlight Duration' },
      { key: 'earthLink', label: 'Earth Contact' },
      { key: 'nightSafety', label: 'Night Hardiness' },
      { key: 'outageSafety', label: 'Radio Continuity' },
      { key: 'peakSun', label: 'Peak Solar Angle' },
    ];

    return axes.map((axis) => {
      const point: any = { axis: axis.label };
      comparedSites.forEach((site) => {
        const a = siteAnalyses[site.id];
        if (!a) return;
        if (axis.key === 'sunlight') {
          point[site.name] = a.sunlightPercentage;
        } else if (axis.key === 'earthLink') {
          point[site.name] = a.earthVisiblePercentage;
        } else if (axis.key === 'nightSafety') {
          // 100% means 0h darkness, drops as darkness increases
          const nightPenalty = Math.min(100, (a.longestDarknessHours / (durationDays * 24)) * 100);
          point[site.name] = Math.max(0, Math.round(100 - nightPenalty));
        } else if (axis.key === 'outageSafety') {
          const outagePenalty = Math.min(100, (a.longestEarthOutageHours / (durationDays * 24)) * 100);
          point[site.name] = Math.max(0, Math.round(100 - outagePenalty));
        } else if (axis.key === 'peakSun') {
          point[site.name] = Math.min(100, Math.max(0, Math.round((a.maxSunElevationDeg / 3.0) * 100)));
        }
      });
      return point;
    });
  }, [comparedSites, siteAnalyses, durationDays]);

  // Color palette for radar chart
  const RADAR_COLORS = ['#000000', '#2563EB', '#D97706', '#059669', '#7C3AED'];

  // Add custom scenario
  const handleAddCustomScenario = () => {
    const site = SITES.find((s) => s.id === newScenarioSiteId) || SITES[0];
    const newSc: CustomScenario = {
      id: `sc-${Date.now()}`,
      name: newScenarioName || `Scenario ${customScenarios.length + 1}`,
      site,
      date: newScenarioDate,
    };
    setCustomScenarios([...customScenarios, newSc]);
  };

  const removeCustomScenario = (id: string) => {
    if (customScenarios.length <= 1) return;
    setCustomScenarios(customScenarios.filter((s) => s.id !== id));
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FFFFFF] p-4 lg:p-6 space-y-6 max-w-[1700px] mx-auto text-[#0F172A]">
      {/* ================================================================== */}
      {/* 1. Header & Trade Study Controls                                    */}
      {/* ================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#000000] text-white">
                DECISION SUPPORT SYSTEM
              </span>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Contingency Analysis & Trade Study Matrix
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
              Scenario & Launch Slip Comparison
            </h1>
            <p className="text-[12px] text-[#475569] mt-0.5 max-w-4xl leading-relaxed">
              When launch slips or hardware shifts occur, evaluate alternative landing sites in the same region,
              or alternative launch dates at the same site, to understand how constraints impact illumination and communications.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-1.5 rounded-2xl shadow-xs shrink-0">
            <button
              onClick={() => setComparisonMode('sites')}
              className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all flex items-center gap-1.5 ${
                comparisonMode === 'sites'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Mountain size={14} />
              <span>Alternative Sites</span>
            </button>

            <button
              onClick={() => setComparisonMode('dates')}
              className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all flex items-center gap-1.5 ${
                comparisonMode === 'dates'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Clock size={14} />
              <span>Launch Slip Delays</span>
            </button>

            <button
              onClick={() => setComparisonMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all flex items-center gap-1.5 ${
                comparisonMode === 'custom'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <GitCompare size={14} />
              <span>Multi-Variable Matrix</span>
            </button>
          </div>
        </div>

        {/* Operational Context Bar */}
        <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-[11.5px]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Calendar size={14} className="text-[#0F172A]" />
              <span>Mission Epoch:</span>
              <strong className="text-[#0F172A] font-mono">{startDate.replace('T', ' ')} UTC</strong>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Clock size={14} className="text-[#0F172A]" />
              <span>Evaluation Window:</span>
              <strong className="text-[#0F172A] font-mono">{durationDays} Days ({durationDays * 24} Hours)</strong>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Mountain size={14} className="text-[#0F172A]" />
              <span>Baseline Target:</span>
              <strong className="text-[#0F172A]">{selectedSite.name}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#64748B] font-semibold text-[11px]">Mission Priority:</span>
            {(['balanced', 'solar-priority', 'comm-priority'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setMissionPriority(p)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                  missionPriority === p
                    ? 'bg-[#000000] text-white'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {p === 'balanced' ? 'Balanced' : p === 'solar-priority' ? 'Solar Focus' : 'DTE Focus'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODE 1: REGIONAL CANDIDATE SITES TRADE STUDY                       */}
      {/* ================================================================== */}
      {comparisonMode === 'sites' && (
        <div className="space-y-6">
          {/* Top Row: Visual Radar Trade-Off Chart & Pool Management */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Radar Spider Chart (5 Cols) */}
            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-black text-[#0F172A]">
                    Multi-Variable Trade-off Spider
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-[#64748B]">Normalized 0–100</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Simultaneous visual balance between illumination, DTE contact, night duration, and topography.
                </p>
              </div>

              <div className="h-64 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="axis" stroke="#64748B" fontSize={10} tickLine={false} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" fontSize={9} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    {comparedSites.map((site, idx) => (
                      <Radar
                        key={site.id}
                        name={site.name}
                        dataKey={site.name}
                        stroke={RADAR_COLORS[idx % RADAR_COLORS.length]}
                        fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '8px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[10.5px] text-[#64748B] pt-2 border-t border-[#F1F5F9] flex items-center gap-1.5">
                <Info size={13} className="shrink-0 text-[#0F172A]" />
                <span>Radar shows relative trade-offs: high sunlight often balances with lower DTE elevation.</span>
              </div>
            </div>

            {/* Candidate Pool & Quick Selection (7 Cols) */}
            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#0F172A]">
                    Candidate Sites in Trade Pool ({comparedSites.length})
                  </h3>
                  {availableSites.length > 0 && comparedSites.length < 5 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#64748B]">Add Regional Target:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            toggleCandidateSite(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-2.5 py-1 text-[11px] font-bold text-[#0F172A] outline-none cursor-pointer shadow-xs"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select candidate site…
                        </option>
                        {availableSites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.lat.toFixed(1)}°)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Engineers compare alternative targets in the same lunar region to find optimal thermal and operational compromise.
                </p>
              </div>

              {/* Trade-off Matrix Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-[11.5px]">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-[#64748B]">
                      <th className="py-2.5 px-3">Site Candidate</th>
                      <th className="py-2.5 px-3">Sunlight (%)</th>
                      <th className="py-2.5 px-3">DTE Link (%)</th>
                      <th className="py-2.5 px-3">Worst Night</th>
                      <th className="py-2.5 px-3">Worst Outage</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {comparedSites.map((site) => {
                      const a = siteAnalyses[site.id];
                      if (!a) return null;
                      const isBaseline = site.id === selectedSite.id;

                      return (
                        <tr key={site.id} className={isBaseline ? 'bg-[#F8FAFC]/80 font-semibold' : 'hover:bg-[#F8FAFC]'}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#0F172A]">{site.name}</span>
                              {isBaseline && (
                                <span className="bg-[#000000] text-white text-[8px] font-mono font-bold px-1.5 py-0.2 rounded">
                                  BASELINE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-[#64748B]">
                              {formatCoordinates(site.lat, site.lon, 1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#E8A838]">
                            {a.sunlightPercentage}% <span className="text-[10px] text-[#64748B]">({a.totalSunlightHours}h)</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#2563EB]">
                            {a.earthVisiblePercentage}% <span className="text-[10px] text-[#64748B]">({a.totalEarthVisibleHours}h)</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#0F172A]">
                            {a.longestDarknessHours}h
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#0F172A]">
                            {a.longestEarthOutageHours}h
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isBaseline ? (
                              <button
                                onClick={() => setSelectedSite(site)}
                                className="px-2 py-1 bg-[#000000] text-white hover:bg-[#1E293B] rounded-lg text-[10px] font-bold transition-all"
                              >
                                Adopt
                              </button>
                            ) : (
                              <span className="text-[10.5px] font-bold text-[#16A34A] flex items-center justify-end gap-1">
                                <Check size={12} /> Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Trade-Off Guidance Notice */}
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-[#000000]" />
                  <span className="text-[#334155]">
                    No single site is universally superior. ASTRA highlights trade-offs rather than forcing an arbitrary score.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Aerospace Cards with Delta-to-Baseline Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {comparedSites.map((site) => {
              const a = siteAnalyses[site.id];
              if (!a) return null;
              const isBaseline = site.id === selectedSite.id;

              // Deltas relative to baseline
              const sunDelta = a.sunlightPercentage - baselineAnalysis.sunlightPercentage;
              const earthDelta = a.earthVisiblePercentage - baselineAnalysis.earthVisiblePercentage;
              const darknessDelta = a.longestDarknessHours - baselineAnalysis.longestDarknessHours;

              return (
                <div
                  key={site.id}
                  className={`bg-[#FFFFFF] border-2 rounded-2xl p-4 shadow-sm relative flex flex-col justify-between transition-all ${
                    isBaseline
                      ? 'border-[#000000] ring-2 ring-[#000000]/10'
                      : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <div>
                    {/* Top Row: Category and Remove */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#F1F5F9] text-[#475569] uppercase">
                        {site.category}
                      </span>
                      {comparedSites.length > 1 && (
                        <button
                          onClick={() => toggleCandidateSite(site.id)}
                          className="w-6 h-6 rounded-lg bg-[#000000] text-white flex items-center justify-center hover:bg-[#EF4444] transition-colors shadow-xs"
                          title="Remove site from matrix"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    <h3 className="text-base font-black text-[#0F172A] leading-snug">{site.name}</h3>
                    <p className="text-[10.5px] text-[#64748B] font-mono mt-0.5">
                      {formatCoordinates(site.lat, site.lon, 1)} • Elev {formatElevation(site.elevation)}
                    </p>

                    {/* Operational Highlights */}
                    <div className="mt-4 space-y-2.5 text-[11.5px]">
                      {/* Sunlight */}
                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <Sun size={13} className="text-[#E8A838]" /> Sunlight
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-[#0F172A]">{a.sunlightPercentage}%</span>
                            {!isBaseline && sunDelta !== 0 && (
                              <span
                                className={`text-[10px] font-bold ${
                                  sunDelta > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                }`}
                              >
                                {sunDelta > 0 ? `+${sunDelta.toFixed(1)}%` : `${sunDelta.toFixed(1)}%`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-[#000000] h-full rounded-full" style={{ width: `${a.sunlightPercentage}%` }} />
                        </div>
                      </div>

                      {/* Earth Contact */}
                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#64748B] flex items-center gap-1.5">
                            <Globe size={13} className="text-[#2563EB]" /> DTE Link
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-[#0F172A]">{a.earthVisiblePercentage}%</span>
                            {!isBaseline && earthDelta !== 0 && (
                              <span
                                className={`text-[10px] font-bold ${
                                  earthDelta > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                }`}
                              >
                                {earthDelta > 0 ? `+${earthDelta.toFixed(1)}%` : `${earthDelta.toFixed(1)}%`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${a.earthVisiblePercentage}%` }} />
                        </div>
                      </div>

                      {/* Outage stats */}
                      <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
                        <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                          <span className="text-[#64748B] block">Worst Night:</span>
                          <div className="flex items-center gap-1 font-mono font-bold">
                            <span className="text-[#0F172A]">{a.longestDarknessHours}h</span>
                            {!isBaseline && darknessDelta !== 0 && (
                              <span className={`text-[9.5px] ${darknessDelta < 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                ({darknessDelta < 0 ? `${darknessDelta}h` : `+${darknessDelta}h`})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                          <span className="text-[#64748B] block">Worst Outage:</span>
                          <span className="text-[#0F172A] font-mono font-bold">{a.longestEarthOutageHours}h</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => setSelectedSite(site)}
                      className={`w-full py-2 rounded-xl text-[11px] font-bold transition-all shadow-xs ${
                        isBaseline
                          ? 'bg-[#000000] text-white shadow-md'
                          : 'bg-[#F8FAFC] text-[#0F172A] hover:bg-[#000000] hover:text-white border border-[#CBD5E1]'
                      }`}
                    >
                      {isBaseline ? '✓ Active Selected Target' : 'Adopt as Active Mission Site'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 2: LAUNCH SLIP & DATE SHIFT STRESS TEST                       */}
      {/* ================================================================== */}
      {comparisonMode === 'dates' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] block">
                Schedule Stress Test & Synodic Window Analysis
              </span>
              <h3 className="text-base font-black text-[#0F172A] mt-0.5">
                {selectedSite.name} ({formatCoordinates(selectedSite.lat, selectedSite.lon, 1)})
              </h3>
              <p className="text-[11.5px] text-[#475569] mt-0.5">
                Evaluation of operational viability if launch delays force a slip of days or an entire synodic month.
              </p>
            </div>
            <div className="text-[11.5px] text-[#64748B] bg-white p-3 border border-[#E2E8F0] rounded-xl shadow-xs">
              Baseline Start: <strong className="text-[#0F172A] font-mono">{startDate.replace('T', ' ')} UTC</strong>
              <br />
              LOLA Altitude: <strong className="text-[#0F172A] font-mono">{formatElevation(selectedSite.elevation)}</strong>
            </div>
          </div>

          {/* Cards for Launch Slips */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {slipAnalyses.map((slip) => {
              const a = slip.analysis;
              const isNominal = slip.days === 0;
              const sunDelta = a.sunlightPercentage - baselineAnalysis.sunlightPercentage;
              const earthDelta = a.earthVisiblePercentage - baselineAnalysis.earthVisiblePercentage;

              return (
                <div
                  key={slip.label}
                  className={`bg-[#FFFFFF] border-2 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all ${
                    isNominal
                      ? 'border-[#000000] ring-2 ring-[#000000]/10'
                      : 'border-[#E2E8F0] hover:border-[#000000]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#000000] text-white uppercase">
                        {slip.label}
                      </span>
                      <span className="text-[9.5px] font-mono text-[#64748B]">
                        {slip.iso.slice(0, 10)}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-[#0F172A]">{slip.iso.replace('T', ' ')} UTC</h4>
                    <p className="text-[10px] text-[#64748B] mt-1 leading-snug">{slip.desc}</p>

                    {/* Operational metrics */}
                    <div className="mt-4 space-y-2 text-[11px]">
                      <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#64748B] flex items-center gap-1">
                            <Sun size={12} className="text-[#E8A838]" /> Sunlight
                          </span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-[#0F172A]">{a.sunlightPercentage}%</span>
                            {!isNominal && sunDelta !== 0 && (
                              <span className={`text-[9.5px] ${sunDelta > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                ({sunDelta > 0 ? `+${sunDelta.toFixed(1)}%` : `${sunDelta.toFixed(1)}%`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#64748B] flex items-center gap-1">
                            <Globe size={12} className="text-[#2563EB]" /> DTE Link
                          </span>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-[#0F172A]">{a.earthVisiblePercentage}%</span>
                            {!isNominal && earthDelta !== 0 && (
                              <span className={`text-[9.5px] ${earthDelta > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                                ({earthDelta > 0 ? `+${earthDelta.toFixed(1)}%` : `${earthDelta.toFixed(1)}%`})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                          <span className="text-[#64748B] block">Max Darkness:</span>
                          <span className="font-mono font-bold text-[#0F172A]">{a.longestDarknessHours}h</span>
                        </div>
                        <div className="p-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                          <span className="text-[#64748B] block">Max Outage:</span>
                          <span className="font-mono font-bold text-[#0F172A]">{a.longestEarthOutageHours}h</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => setStartDate(slip.iso)}
                      className="w-full py-2 bg-[#000000] text-white hover:bg-[#1E293B] rounded-xl text-[11px] font-bold transition-all shadow-xs"
                    >
                      {isNominal ? '✓ Nominal Date Active' : 'Adopt This Launch Date'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODE 3: MULTI-VARIABLE CUSTOM CONTINGENCY MATRIX                    */}
      {/* ================================================================== */}
      {comparisonMode === 'custom' && (
        <div className="space-y-6">
          {/* Add Custom Scenario Form */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded-2xl flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[9.5px] font-mono font-bold text-[#64748B] uppercase mb-1">
                Scenario Designation
              </label>
              <input
                type="text"
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-[#0F172A] outline-none"
                placeholder="e.g. Contingency Plan D"
              />
            </div>

            <div className="flex-1 min-w-[220px]">
              <label className="block text-[9.5px] font-mono font-bold text-[#64748B] uppercase mb-1">
                Candidate Landing Target
              </label>
              <select
                value={newScenarioSiteId}
                onChange={(e) => setNewScenarioSiteId(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-[#0F172A] outline-none cursor-pointer"
              >
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({formatElevation(s.elevation)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[190px]">
              <label className="block text-[9.5px] font-mono font-bold text-[#64748B] uppercase mb-1">
                Target Launch Epoch (UTC)
              </label>
              <input
                type="datetime-local"
                value={newScenarioDate}
                onChange={(e) => setNewScenarioDate(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-[11.5px] font-mono font-bold text-[#0F172A] outline-none"
              />
            </div>

            <button
              onClick={handleAddCustomScenario}
              className="bg-[#000000] text-white hover:bg-[#1E293B] px-4 py-2 rounded-xl text-[11.5px] font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus size={13} />
              <span>Add to Matrix</span>
            </button>
          </div>

          {/* Scenario Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {customScenarios.map((sc) => {
              const a = missionAnalysisService.analyzeSiteMission(sc.site, {
                startDate: sc.date,
                durationDays,
                config: analysisConfig,
              });

              return (
                <div
                  key={sc.id}
                  className="bg-[#FFFFFF] border-2 border-[#E2E8F0] hover:border-[#000000] rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#000000] text-white uppercase">
                        {sc.name}
                      </span>
                      {customScenarios.length > 1 && (
                        <button
                          onClick={() => removeCustomScenario(sc.id)}
                          className="w-6 h-6 rounded-lg bg-[#000000] text-white flex items-center justify-center hover:bg-[#EF4444] transition-colors shadow-xs"
                          title="Remove scenario"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    <h3 className="text-base font-black text-[#0F172A] leading-snug">{sc.site.name}</h3>
                    <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                      Date: <strong className="text-[#0F172A]">{sc.date.replace('T', ' ')} UTC</strong>
                    </p>

                    <div className="mt-3 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B] font-bold">LOLA Terrain Altitude:</span>
                      <span className="font-mono font-black text-[#0F172A]">
                        {formatElevation(sc.site.elevation)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5 text-[11.5px]">
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B] flex items-center gap-1.5">
                          <Sun size={13} className="text-[#E8A838]" /> Sunlight Visibility
                        </span>
                        <span className="font-mono font-black text-[#0F172A]">
                          {a.sunlightPercentage}% ({a.totalSunlightHours}h)
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B] flex items-center gap-1.5">
                          <Globe size={13} className="text-[#2563EB]" /> Earth DTE Visibility
                        </span>
                        <span className="font-mono font-black text-[#0F172A]">
                          {a.earthVisiblePercentage}% ({a.totalEarthVisibleHours}h)
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Longest Night</span>
                        <span className="font-mono font-black text-[#0F172A]">
                          {a.longestDarknessHours} hrs
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Longest Earth Blackout</span>
                        <span className="font-mono font-black text-[#0F172A]">
                          {a.longestEarthOutageHours} hrs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => {
                        setSelectedSite(sc.site);
                        setStartDate(sc.date);
                      }}
                      className="w-full py-2 bg-[#000000] text-white hover:bg-[#1E293B] rounded-xl text-[11px] font-bold transition-all shadow-xs"
                    >
                      Adopt Scenario as Mission Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
