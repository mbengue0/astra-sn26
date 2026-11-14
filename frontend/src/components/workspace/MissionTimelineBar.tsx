// ============================================================================
// Lunar Horizon — Vertical Interactive Mission Timeline & Celestial Playback Dock
// Positioned vertically on the left side to keep 3D views 100% unobstructed.
// Supports vertical scrub track with dual Gantt ribbons (Sunlight & Earth LOS),
// play/pause, step controls, speed toggles, and retractable edge tab.
// ============================================================================

import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sun,
  Globe,
} from 'lucide-react';
import { SiteMissionAnalysis } from '../../types';

export interface MissionTimelineBarProps {
  analysis: SiteMissionAnalysis;
  activeHour: number;
  onSeekHour: (hour: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onStepHour: (deltaHours: number) => void;
  startDateIso: string;
}

export default function MissionTimelineBar({
  analysis,
  activeHour,
  onSeekHour,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  onStepHour,
  startDateIso,
}: MissionTimelineBarProps) {
  const [isRetracted, setIsRetracted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalHours = Math.max(1, analysis.totalDurationHours);
  const clampedHour = Math.min(Math.max(0, activeHour), totalHours);
  const progressPct = (clampedHour / totalHours) * 100;

  // Compute exact UTC timestamp for current activeHour
  const startEpoch = new Date(startDateIso).getTime();
  const currentEpoch = startEpoch + clampedHour * 3600 * 1000;
  const currentIsoStr = new Date(currentEpoch).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  // Handle click / drag on vertical timeline track
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const ratio = clickY / rect.height;
    const targetHour = Math.round(ratio * totalHours);
    onSeekHour(targetHour);
  };

  // If retracted, show minimal vertical tab on the left edge
  if (isRetracted) {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 bg-[#04060B]/90 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl text-white font-sans text-xs select-none transition-all duration-200"
      >
        <button
          type="button"
          onClick={onTogglePlay}
          className="p-2 rounded-xl bg-white text-black hover:bg-white/90 transition-all cursor-pointer shadow-md"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={12} className="text-black" /> : <Play size={12} className="text-black fill-black" />}
        </button>

        <div className="flex flex-col items-center py-1">
          <span className="font-mono text-[#38BDF8] font-bold text-[11px]">T+{clampedHour}h</span>
          <span className="text-[9px] font-mono text-white/50">D{Math.floor(clampedHour / 24) + 1}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsRetracted(false)}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-t border-white/15"
          title="Expand Celestial Playback Dock"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-30 w-44 bg-[#04060B]/92 backdrop-blur-xl border border-white/15 rounded-3xl p-3 shadow-2xl text-white font-sans select-none transition-all duration-300 animate-in fade-in slide-in-from-left-4"
    >
      {/* Header: Title, Retract button */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-[#38BDF8]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
            Celestial Time
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsRetracted(true)}
          className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Retract timeline dock"
        >
          <ChevronLeft size={13} />
        </button>
      </div>

      {/* Main Play / Pause & Time Indicator */}
      <div className="flex flex-col items-center space-y-2 pb-2.5 border-b border-white/10">
        {/* Play / Pause Primary Action */}
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-full py-2 px-3 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          title={isPlaying ? 'Pause Simulation' : 'Play Celestial Orbit'}
        >
          {isPlaying ? (
            <>
              <Pause size={13} className="text-black" />
              <span>Pause Sky</span>
            </>
          ) : (
            <>
              <Play size={13} className="text-black fill-black" />
              <span>Play Celestial</span>
            </>
          )}
        </button>

        {/* Current Time Readout */}
        <div className="text-center">
          <div className="font-mono text-base font-extrabold text-[#38BDF8] leading-none">
            T+{clampedHour}h
          </div>
          <div className="text-[9px] font-mono text-white/40 mt-1">
            Day {Math.floor(clampedHour / 24) + 1} of {Math.ceil(totalHours / 24)} ({totalHours}h)
          </div>
          <div className="text-[9px] font-mono text-white/70 truncate max-w-[150px] mt-0.5">
            {currentIsoStr}
          </div>
        </div>
      </div>

      {/* Vertical Interactive Gantt Track */}
      <div className="py-2.5 flex items-center gap-2.5">
        {/* Track Column */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[8px] font-mono text-white/40 px-0.5">
            <span>T+0h</span>
            <span>T+{totalHours}h</span>
          </div>

          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="relative h-44 w-full bg-white/5 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex"
            title="Click or drag to scrub timeline"
          >
            {/* Lane 1: Sunlight Windows (Left half) */}
            <div className="relative w-1/2 h-full bg-black/40 border-r border-white/5">
              {analysis.sunlightWindows.map((w, idx) => {
                const topPct = (w.startHour / totalHours) * 100;
                const heightPct = (w.durationHours / totalHours) * 100;
                return (
                  <div
                    key={`sun-${idx}`}
                    style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                    className="absolute left-0.5 right-0.5 bg-amber-400/90 rounded-xs shadow-sm"
                    title={`Sunlight: ${w.durationHours}h`}
                  />
                );
              })}
            </div>

            {/* Lane 2: Earth Line-of-Sight Windows (Right half) */}
            <div className="relative w-1/2 h-full bg-black/40">
              {analysis.earthVisibleWindows.map((w, idx) => {
                const topPct = (w.startHour / totalHours) * 100;
                const heightPct = (w.durationHours / totalHours) * 100;
                return (
                  <div
                    key={`earth-${idx}`}
                    style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                    className="absolute left-0.5 right-0.5 bg-sky-400/90 rounded-xs shadow-sm"
                    title={`Earth LOS: ${w.durationHours}h`}
                  />
                );
              })}
            </div>

            {/* Scrub Needle Line (Horizontal) */}
            <div
              style={{ top: `${progressPct}%` }}
              className="absolute left-0 right-0 h-1 bg-white shadow-[0_0_8px_#FFFFFF] pointer-events-none -translate-y-1/2 z-10 flex items-center justify-between px-0.5"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full -ml-0.5" />
              <div className="w-1.5 h-1.5 bg-white rounded-full -mr-0.5" />
            </div>
          </div>

          {/* Lane Labels */}
          <div className="flex items-center justify-between text-[8px] font-mono text-white/50 px-0.5 pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-xs bg-amber-400" />
              <span>Sun</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-xs bg-sky-400" />
              <span>Earth</span>
            </span>
          </div>
        </div>
      </div>

      {/* Step Buttons & Speed Controls */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        {/* Step Buttons */}
        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => onStepHour(-1)}
            className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
            title="Step back 1 hour"
          >
            <SkipBack size={10} />
            <span>-1h</span>
          </button>
          <button
            type="button"
            onClick={() => onStepHour(1)}
            className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center gap-0.5 cursor-pointer"
            title="Step forward 1 hour"
          >
            <span>+1h</span>
            <SkipForward size={10} />
          </button>
          <button
            type="button"
            onClick={() => onStepHour(24)}
            className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Step forward 24 hours (1 Earth day)"
          >
            +24h
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center justify-between bg-white/5 p-1 rounded-xl border border-white/10">
          <span className="text-[9px] font-mono text-white/40 pl-1">Speed</span>
          <div className="flex items-center gap-0.5">
            {([1, 10, 60] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
