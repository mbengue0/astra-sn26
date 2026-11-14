// ============================================================================
// Lunar Horizon — Celestial Horizon Time & Orbital Simulation Dock
// Restores animated Sun & Earth sky movement across the lunar horizon
// ============================================================================

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sun,
  Globe2,
} from 'lucide-react';
import { CelestialBodySkyState } from '../../services/astronomicalService';
import { formatDegrees } from '../../utils/formatters';

export interface HorizonTimeControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onStep: (hours: number) => void;
  currentDate: Date;
  sun: CelestialBodySkyState;
  earth: CelestialBodySkyState;
}

export default function HorizonTimeControls({
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  onStep,
  currentDate,
  sun,
  earth,
}: HorizonTimeControlsProps) {
  // Format current UTC simulation date
  const dateStr = currentDate.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 select-none max-w-full px-3">
      {/* Simulation Control Dock */}
      <div className="flex flex-wrap items-center justify-center gap-2 bg-[#000000]/85 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-white/15 shadow-2xl text-white">
        {/* 1. Play / Pause */}
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-md"
          title={isPlaying ? 'Pause simulation' : 'Play orbital simulation'}
        >
          {isPlaying ? (
            <>
              <Pause size={12} className="text-black" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={12} className="text-black fill-black" />
              <span>Play</span>
            </>
          )}
        </button>

        {/* 2. Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStep(-1)}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono transition-all flex items-center gap-0.5"
            title="Step back 1 hour"
          >
            <SkipBack size={10} />
            <span>-1h</span>
          </button>
          <button
            onClick={() => onStep(1)}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono transition-all flex items-center gap-0.5"
            title="Step forward 1 hour"
          >
            <span>+1h</span>
            <SkipForward size={10} />
          </button>
          <button
            onClick={() => onStep(24)}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono transition-all hidden sm:flex items-center"
            title="Step forward 24 hours"
          >
            <span>+24h</span>
          </button>
        </div>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        {/* 3. Speed Multipliers */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 p-0.5 rounded-xl">
          {([1, 10, 100] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                playbackSpeed === spd
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {spd}×
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/20 mx-0.5 hidden sm:block" />

        {/* 4. Current Simulation Time */}
        <div className="text-[11px] font-mono text-white/90 px-1 font-semibold">
          {dateStr}
        </div>

        <div className="w-px h-4 bg-white/20 mx-0.5 hidden md:block" />

        {/* 5. Live Telemetry: Sun & Earth Sky Elevations */}
        <div className="hidden md:flex items-center gap-2 text-[10.5px] font-mono">
          <div className="flex items-center gap-1 text-[#FCD34D]">
            <Sun size={12} />
            <span>El: {formatDegrees(sun.elevationDeg, 1)}</span>
            <span
              className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase ${
                sun.isVisible ? 'bg-[#15803D] text-white' : 'bg-[#DC2626] text-white'
              }`}
            >
              {sun.isVisible ? 'Sun Above' : 'Sun Below'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#38BDF8]">
            <Globe2 size={12} />
            <span>Earth: {formatDegrees(earth.elevationDeg, 1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
