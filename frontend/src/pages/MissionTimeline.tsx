// ============================================================================
// Lunar Horizon — Mission Operations Timeline Cockpit
// Multi-day chronological environmental sequencer, Gantt visibility windows,
// and synchronized astronomical event log (SOE).
// Pure White Primary Interface (#FFFFFF) with solid Black Buttons (#000000).
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Sun,
  Globe,
  Radio,
  BatteryCharging,
  Calendar,
  Mountain,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import { useMissionStore } from '../stores/useMissionStore';
import { SITES, formatCoordinates } from '../data/sites';
import { formatDegrees, formatPercent, formatDurationHours, formatElevation } from '../utils/formatters';
import { missionAnalysisService } from '../services/missionAnalysisService';
import type { VisibilityWindow, TemporalDataPoint } from '../types';

export default function MissionTimeline() {
  const {
    missionName,
    startDate,
    setStartDate,
    durationDays,
    setDurationDays,
    activeHour,
    setActiveHour,
    selectedSite,
    setSelectedSite,
    candidateSiteIds,
    analysisConfig,
  } = useMissionStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedDayTab, setSelectedDayTab] = useState<number>(0); // 0 = All days, 1 = Day 1, etc.
  const [windowFilter, setWindowFilter] = useState<'all' | 'sunlight' | 'darkness' | 'earth'>('all');
  const [compareSiteId, setCompareSiteId] = useState<string>(
    candidateSiteIds.find((id) => id !== selectedSite.id) || candidateSiteIds[0] || selectedSite.id
  );

  // Compute full-mission temporal analysis
  const primaryAnalysis = useMemo(() => {
    return missionAnalysisService.analyzeSiteMission(selectedSite, {
      startDate,
      durationDays,
      config: analysisConfig,
    });
  }, [selectedSite, startDate, durationDays, analysisConfig]);

  // Comparison site analysis (for timeline overlay)
  const compareSite = useMemo(() => {
    return SITES.find((s) => s.id === compareSiteId) || selectedSite;
  }, [compareSiteId, selectedSite]);

  const compareAnalysis = useMemo(() => {
    if (compareSite.id === selectedSite.id) return null;
    return missionAnalysisService.analyzeSiteMission(compareSite, {
      startDate,
      durationDays,
      config: analysisConfig,
    });
  }, [compareSite, selectedSite, startDate, durationDays, analysisConfig]);

  // Current active time point
  const currentPoint = useMemo(() => {
    const series = primaryAnalysis.timeSeries;
    const idx = Math.min(activeHour, series.length - 1);
    return series[idx] || series[0];
  }, [primaryAnalysis, activeHour]);

  // Filtered time series by day tab if requested
  const displayTimeSeries = useMemo(() => {
    if (selectedDayTab === 0) return primaryAnalysis.timeSeries;
    const startH = (selectedDayTab - 1) * 24;
    const endH = selectedDayTab * 24;
    return primaryAnalysis.timeSeries.filter((pt) => pt.relativeHour >= startH && pt.relativeHour <= endH);
  }, [primaryAnalysis, selectedDayTab]);

  // Aggregated chronological sequence of events (SOE)
  const sequenceOfEvents = useMemo(() => {
    const events: {
      id: string;
      hour: number;
      timestamp: string;
      type: 'sunrise' | 'sunset' | 'earthrise' | 'earthset';
      label: string;
      description: string;
      impact: 'optimal' | 'caution' | 'critical';
    }[] = [];

    const series = primaryAnalysis.timeSeries;
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];

      // Sun transitions
      if (!prev.sunTerrainVisible && curr.sunTerrainVisible) {
        events.push({
          id: `sr-${curr.relativeHour}`,
          hour: curr.relativeHour,
          timestamp: curr.timestamp,
          type: 'sunrise',
          label: 'Sunrise Over Terrain Rim',
          description: `Sun cleared local terrain at azimuth ${curr.sunAzimuthDeg}°. Solar arrays receiving direct flux.`,
          impact: 'optimal',
        });
      } else if (prev.sunTerrainVisible && !curr.sunTerrainVisible) {
        events.push({
          id: `ss-${curr.relativeHour}`,
          hour: curr.relativeHour,
          timestamp: curr.timestamp,
          type: 'sunset',
          label: 'Sunset Behind Topography',
          description: `Sun occluded by local ridge at azimuth ${curr.sunAzimuthDeg}°. Lander enters battery discharge.`,
          impact: 'critical',
        });
      }

      // Earth transitions
      if (!prev.earthTerrainVisible && curr.earthTerrainVisible) {
        events.push({
          id: `er-${curr.relativeHour}`,
          hour: curr.relativeHour,
          timestamp: curr.timestamp,
          type: 'earthrise',
          label: 'Earth Line-of-Sight Acquisition',
          description: `Direct-to-Earth link open at elevation +${curr.earthElevationDeg}°. DSN downlink established.`,
          impact: 'optimal',
        });
      } else if (prev.earthTerrainVisible && !curr.earthTerrainVisible) {
        events.push({
          id: `es-${curr.relativeHour}`,
          hour: curr.relativeHour,
          timestamp: curr.timestamp,
          type: 'earthset',
          label: 'Earth LOS Occultation',
          description: `Earth dips below terrain. Telemetry blackout initiated; payload data buffering active.`,
          impact: 'caution',
        });
      }
    }

    return events;
  }, [primaryAnalysis]);

  // Playback timer
  useEffect(() => {
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
      }, 250);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, durationDays, activeHour, setActiveHour]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FFFFFF] p-4 lg:p-6 space-y-6 max-w-[1700px] mx-auto text-[#0F172A]">
      {/* ================================================================== */}
      {/* 1. Header & Timeline Master Controller                              */}
      {/* ================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#000000] text-white">
                FLIGHT OPERATIONS
              </span>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Sequential Chronology & Visibility Gantt
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
              Mission Operations Timeline
            </h1>
            <p className="text-[12px] text-[#475569] mt-0.5 max-w-4xl leading-relaxed">
              Continuous chronological evaluation of illumination, shadow passages, and Direct-to-Earth communication windows
              for <strong className="text-[#0F172A]">{selectedSite.name}</strong> over {durationDays} days ({durationDays * 24} hours).
            </p>
          </div>

          {/* Quick Target Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748B]">Target Site:</span>
            <select
              value={selectedSite.id}
              onChange={(e) => {
                const s = SITES.find((site) => site.id === e.target.value);
                if (s) setSelectedSite(s);
              }}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-[#0F172A] outline-none cursor-pointer shadow-xs"
            >
              {SITES.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.lat.toFixed(1)}°)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Playback Controls & Master Time Scrubber */}
        <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#000000] text-white text-[11.5px] font-bold hover:bg-[#1E293B] shadow-xs transition-all"
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? 'Pause Playback' : 'Play Timeline'}</span>
              </button>

              <button
                onClick={() => setActiveHour(0)}
                className="p-2 rounded-xl border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
                title="Rewind to Mission Start (T+0h)"
              >
                <RotateCcw size={14} />
              </button>

              <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-xl text-[11px]">
                <span className="text-[#64748B] font-semibold">Speed:</span>
                {[1, 2, 6, 24].map((s) => (
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

            {/* Current Active Timestamp Display */}
            <div className="flex items-center gap-3 text-[12px] bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-1.5 rounded-xl">
              <span className="text-[#64748B] flex items-center gap-1 font-semibold">
                <Clock size={13} className="text-[#0F172A]" /> Current Epoch:
              </span>
              <span className="font-mono font-black text-[#0F172A]">
                T+{activeHour}h ({new Date(currentPoint.epochMs).toUTCString()})
              </span>
            </div>
          </div>

          {/* Master Scrubber Slider */}
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
              <span>T+0h ({new Date(startDate).toISOString().slice(0, 10)})</span>
              <span>T+{Math.round((durationDays * 24) / 2)}h (Midpoint)</span>
              <span>T+{durationDays * 24}h (Mission Complete)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. Instantaneous Status Dashboard at T+activeHour                  */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sun State */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
              Solar Illumination
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black font-mono text-[#0F172A]">
                {formatDegrees(currentPoint.sunElevationDeg)}
              </span>
              <span className="text-[11px] font-bold text-[#64748B]">
                (Az {currentPoint.sunAzimuthDeg}°)
              </span>
            </div>
            <p className="text-[10.5px] text-[#64748B] mt-1">
              Terrain cutoff: {currentPoint.localHorizonAtSunDeg}°
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              currentPoint.sunTerrainVisible ? 'bg-[#FFFBEB] text-[#E8A838]' : 'bg-[#F1F5F9] text-[#94A3B8]'
            }`}
          >
            <Sun size={20} />
          </div>
        </div>

        {/* Earth Link State */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
              Direct-to-Earth Link
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black font-mono text-[#0F172A]">
                {formatDegrees(currentPoint.earthElevationDeg)}
              </span>
              <span className="text-[11px] font-bold text-[#64748B]">
                (Az {currentPoint.earthAzimuthDeg}°)
              </span>
            </div>
            <p className="text-[10.5px] text-[#64748B] mt-1">
              Terrain cutoff: {currentPoint.localHorizonAtEarthDeg}°
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              currentPoint.earthTerrainVisible ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#FEF2F2] text-[#EF4444]'
            }`}
          >
            <Globe size={20} />
          </div>
        </div>

        {/* Estimated Flux Output */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
              Solar Array Incident Flux
            </span>
            <div className="text-xl font-black font-mono text-[#0F172A] mt-1">
              {currentPoint.estimatedSolarFluxPct}%
            </div>
            <p className="text-[10.5px] text-[#64748B] mt-1">
              {currentPoint.sunTerrainVisible ? 'Nominal Power Generation' : 'Array Shaded — Battery Mode'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0 text-[#0F172A]">
            <BatteryCharging size={20} />
          </div>
        </div>

        {/* Operational Phase Indicator */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
              Operational Regime
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  currentPoint.sunTerrainVisible && currentPoint.earthTerrainVisible
                    ? 'bg-[#22C55E]'
                    : currentPoint.sunTerrainVisible
                    ? 'bg-[#EAB308]'
                    : 'bg-[#EF4444]'
                }`}
              />
              <span className="text-sm font-black text-[#0F172A]">
                {currentPoint.sunTerrainVisible && currentPoint.earthTerrainVisible
                  ? 'Prime Science'
                  : currentPoint.sunTerrainVisible
                  ? 'Solar Only (LOS Block)'
                  : 'Darkness / Low Power'}
              </span>
            </div>
            <p className="text-[10.5px] text-[#64748B] mt-1">
              At current mission step
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0 text-[#0F172A]">
            <Radio size={20} />
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. Gantt Visibility Strip Charts (Sunlight vs Earth Contact)       */}
      {/* ================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#0F172A]">
              Operational Visibility Gantt Windows ({durationDays} Days / {durationDays * 24}h)
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Contiguous active windows for solar array power generation and Direct-to-Earth communication
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-[#0F172A]">
              <span className="w-3 h-3 rounded bg-[#E8A838]" /> Sunlight Window
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#0F172A]">
              <span className="w-3 h-3 rounded bg-[#2563EB]" /> Earth Contact (DTE)
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#64748B]">
              <span className="w-3 h-3 rounded bg-[#CBD5E1]" /> Inactive / Occluded
            </span>
          </div>
        </div>

        {/* Gantt Strip Bars */}
        <div className="space-y-3 pt-2">
          {/* Sunlight Track */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="flex items-center gap-1 text-[#0F172A]">
                <Sun size={12} className="text-[#E8A838]" /> Solar Illumination Windows
              </span>
              <span className="font-mono text-[#64748B]">
                {primaryAnalysis.sunlightPercentage}% Total ({primaryAnalysis.totalSunlightHours}h)
              </span>
            </div>
            <div className="h-6 w-full bg-[#F1F5F9] rounded-lg overflow-hidden flex border border-[#E2E8F0] relative">
              {primaryAnalysis.sunlightWindows.map((w, idx) => {
                const totalH = durationDays * 24;
                const leftPct = (w.startHour / totalH) * 100;
                const widthPct = (w.durationHours / totalH) * 100;

                return (
                  <div
                    key={idx}
                    className="h-full bg-[#E8A838] absolute hover:brightness-110 transition-all cursor-pointer"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`Sunlight Window: ${w.startHour}h to ${w.endHour}h (${w.durationHours} hours)`}
                  />
                );
              })}
              {/* Active Hour Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#000000] z-10"
                style={{ left: `${(activeHour / (durationDays * 24)) * 100}%` }}
              />
            </div>
          </div>

          {/* Earth DTE Track */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1">
              <span className="flex items-center gap-1 text-[#0F172A]">
                <Globe size={12} className="text-[#2563EB]" /> Direct-to-Earth Line of Sight
              </span>
              <span className="font-mono text-[#64748B]">
                {primaryAnalysis.earthVisiblePercentage}% Total ({primaryAnalysis.totalEarthVisibleHours}h)
              </span>
            </div>
            <div className="h-6 w-full bg-[#F1F5F9] rounded-lg overflow-hidden flex border border-[#E2E8F0] relative">
              {primaryAnalysis.earthVisibleWindows.map((w, idx) => {
                const totalH = durationDays * 24;
                const leftPct = (w.startHour / totalH) * 100;
                const widthPct = (w.durationHours / totalH) * 100;

                return (
                  <div
                    key={idx}
                    className="h-full bg-[#2563EB] absolute hover:brightness-110 transition-all cursor-pointer"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`Earth Contact Window: ${w.startHour}h to ${w.endHour}h (${w.durationHours} hours)`}
                  />
                );
              })}
              {/* Active Hour Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#000000] z-10"
                style={{ left: `${(activeHour / (durationDays * 24)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 4. Sequential Astronomical Elevation Chart                         */}
      {/* ================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#0F172A]">
              Topocentric Celestial Elevation Curves
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Solar & Earth elevation relative to the local topographical horizon threshold (0°)
            </p>
          </div>

          {/* Day Scale Tabs */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#CBD5E1] p-1 rounded-xl text-[11px]">
            <button
              onClick={() => setSelectedDayTab(0)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                selectedDayTab === 0 ? 'bg-[#000000] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Days ({durationDays}d)
            </button>
            {Array.from({ length: Math.min(durationDays, 7) }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDayTab(day)}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  selectedDayTab === day ? 'bg-[#000000] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayTimeSeries}
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
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(val: any) => [`${val}°`, '']}
                labelFormatter={(h) => `Mission Time: T+${h}h`}
              />
              <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: 'Horizon (0°)', fill: '#94A3B8', fontSize: 10 }} />
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

      {/* ================================================================== */}
      {/* 5. Chronological Sequence of Events (SOE) Table                    */}
      {/* ================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#0F172A]">
                Sequence of Events (SOE) & Operational Milestones
              </h3>
              <span className="badge badge-demo font-mono text-[9px]">
                {sequenceOfEvents.length} Events Detected
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Topographical sunrise, sunset, and Earth occultation transition timestamps
            </p>
          </div>
        </div>

        {sequenceOfEvents.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            Continuous unchanging conditions throughout this operational period (No sun/earth occultations detected).
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left text-[11.5px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-[#64748B]">
                  <th className="py-2.5 px-3">Mission Hour</th>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Transition Event</th>
                  <th className="py-2.5 px-3">Operational Context</th>
                  <th className="py-2.5 px-3 text-right">Jump to Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sequenceOfEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A]">
                      T+{evt.hour}h
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#475569]">
                      {new Date(evt.timestamp).toISOString().slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold">
                        {evt.type === 'sunrise' ? (
                          <Sun size={13} className="text-[#E8A838]" />
                        ) : evt.type === 'sunset' ? (
                          <Sun size={13} className="text-[#DC2626]" />
                        ) : (
                          <Globe size={13} className="text-[#2563EB]" />
                        )}
                        <span className="text-[#0F172A]">{evt.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#64748B]">
                      {evt.description}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setActiveHour(evt.hour)}
                        className="px-2 py-1 bg-[#000000] text-white hover:bg-[#1E293B] rounded-lg text-[10px] font-bold transition-all shadow-xs"
                      >
                        Seek T+{evt.hour}h
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
