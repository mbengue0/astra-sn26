// ============================================================================
// Lunar Horizon — Instantaneous Telemetry HUD & Validated Mission Metrics
// Retractable side panel displaying real-time Azimuth, Elevation,
// Terrain Horizon Obstruction, Visibility states, and Full-Mission Validated Metrics.
// Follows ASTRA design system (Inter, JetBrains Mono, crisp borders, dark glass).
// ============================================================================

import React, { useState } from 'react';
import {
  Sun,
  Globe,
  Radio,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Activity,
} from 'lucide-react';
import { SiteMissionAnalysis, TemporalDataPoint } from '../../types';

export interface TelemetryHudProps {
  analysis: SiteMissionAnalysis;
  currentPoint: TemporalDataPoint;
}

export default function TelemetryHud({ analysis, currentPoint }: TelemetryHudProps) {
  const [isRetracted, setIsRetracted] = useState(false);
  const [showFullMetrics, setShowFullMetrics] = useState(false);

  const sunVisible = currentPoint.sunTerrainVisible;
  const earthVisible = currentPoint.earthTerrainVisible;

  // If retracted, show minimal floating edge pill
  if (isRetracted) {
    return (
      <button
        type="button"
        onClick={() => setIsRetracted(false)}
        className="fixed top-16 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#04060B]/88 backdrop-blur-xl border border-white/20 hover:border-white/40 shadow-2xl text-white font-sans text-xs transition-all duration-200 cursor-pointer group"
        title="Expand Telemetry HUD"
      >
        <ChevronLeft size={13} className="text-[#38BDF8] group-hover:-translate-x-0.5 transition-transform" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
        <span className="font-bold text-[11px] tracking-wider uppercase text-white/90">Telemetry</span>
        <span className="text-white/30">·</span>
        <span className="font-mono text-[10px] text-amber-300">
          ☀️ {currentPoint.sunElevationDeg > 0 ? '+' : ''}{currentPoint.sunElevationDeg.toFixed(1)}°
        </span>
        <span className="text-white/30">·</span>
        <span className="font-mono text-[10px] text-sky-300">
          🌍 {currentPoint.earthElevationDeg > 0 ? '+' : ''}{currentPoint.earthElevationDeg.toFixed(1)}°
        </span>
      </button>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-30 w-76 max-w-[calc(100vw-2rem)] bg-[#04060B]/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl text-white font-sans select-none overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-right-3">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          <span className="text-xs font-bold tracking-wide uppercase text-white/90">
            Real-Time Telemetry
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowFullMetrics(!showFullMetrics)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title={showFullMetrics ? "Show concise telemetry" : "Show all mission metrics"}
          >
            {showFullMetrics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setIsRetracted(true)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Retract HUD to side"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Instantaneous Angles & States */}
      <div className="p-3 space-y-2.5">
        {/* 1. Sun Telemetry */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sun size={13} className="text-amber-400" />
              <span className="text-xs font-bold text-white">Solar Vector</span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                sunVisible
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {sunVisible ? 'ILLUMINATED' : 'OCCULTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
              <div className="text-[8px] text-white/40 uppercase">Elevation</div>
              <div className={`font-bold ${currentPoint.sunElevationDeg >= 0 ? 'text-amber-300' : 'text-white/60'}`}>
                {currentPoint.sunElevationDeg > 0 ? '+' : ''}
                {currentPoint.sunElevationDeg.toFixed(2)}°
              </div>
            </div>
            <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
              <div className="text-[8px] text-white/40 uppercase">Azimuth</div>
              <div className="font-bold text-white">
                {currentPoint.sunAzimuthDeg.toFixed(1)}°
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-white/60 pt-0.5">
            <span>Terrain Obstruction:</span>
            <span className="font-mono text-white/80">+{currentPoint.localHorizonAtSunDeg.toFixed(2)}°</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-white/60">
            <span>Estimated Flux:</span>
            <span className="font-mono text-white/80">{currentPoint.estimatedSolarFluxPct}%</span>
          </div>
        </div>

        {/* 2. Earth Telemetry */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-sky-400" />
              <span className="text-xs font-bold text-white">Earth Vector</span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                earthVisible
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {earthVisible ? 'LINE-OF-SIGHT' : 'OCCULTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
              <div className="text-[8px] text-white/40 uppercase">Elevation</div>
              <div className={`font-bold ${currentPoint.earthElevationDeg >= 0 ? 'text-sky-300' : 'text-white/60'}`}>
                {currentPoint.earthElevationDeg > 0 ? '+' : ''}
                {currentPoint.earthElevationDeg.toFixed(2)}°
              </div>
            </div>
            <div className="bg-black/40 p-1.5 rounded-lg border border-white/5">
              <div className="text-[8px] text-white/40 uppercase">Azimuth</div>
              <div className="font-bold text-white">
                {currentPoint.earthAzimuthDeg.toFixed(1)}°
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-white/60 pt-0.5">
            <span>Terrain Obstruction:</span>
            <span className="font-mono text-white/80">+{currentPoint.localHorizonAtEarthDeg.toFixed(2)}°</span>
          </div>
        </div>

        {/* 3. Full Mission Metrics (Collapsible) */}
        {showFullMetrics && (
          <div className="pt-2 border-t border-white/10 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider text-white/50">
              <span>Full Mission Metrics</span>
              <span>{analysis.totalDurationHours}h total</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[8px] text-white/40">Sunlight Total</div>
                <div className="font-mono font-bold text-amber-300">
                  {analysis.sunlightPercentage}% ({analysis.totalSunlightHours}h)
                </div>
              </div>

              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[8px] text-white/40">Earth DTE Total</div>
                <div className="font-mono font-bold text-sky-300">
                  {analysis.earthVisiblePercentage}% ({analysis.totalEarthVisibleHours}h)
                </div>
              </div>

              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[8px] text-white/40">Max Darkness</div>
                <div className="font-mono font-bold text-rose-300">
                  {analysis.longestDarknessHours}h
                </div>
              </div>

              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className="text-[8px] text-white/40">Max Blackout</div>
                <div className="font-mono font-bold text-amber-300">
                  {analysis.longestEarthOutageHours}h
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
