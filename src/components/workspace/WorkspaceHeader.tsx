// ============================================================================
// Lunar Horizon — Mission Workspace Navigation Header
// Minimal, coherent ASTRA header:
// - Return to Global Moon (ASTRA Logo with arrow)
// - Active Site Identity Badge (Name, Coordinates, LOLA Elevation)
// - Configure & Compare Action Buttons
// (View switching is restored to the bottom miniature 3D square previews)
// ============================================================================

import React from 'react';
import {
  ArrowLeft,
  Sliders,
  GitCompare,
} from 'lucide-react';
import { LunarSite } from '../../types';
import { formatCoordinates } from '../../data/sites';

export interface WorkspaceHeaderProps {
  site: LunarSite;
  onReturnToGlobal: () => void;
  onOpenConfigure: () => void;
  onOpenCompare: () => void;
}

export default function WorkspaceHeader({
  site,
  onReturnToGlobal,
  onOpenConfigure,
  onOpenCompare,
}: WorkspaceHeaderProps) {
  return (
    <header className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between gap-2 select-none pointer-events-none">
      {/* 1. Left: ASTRA Brand Logo (Click to Return to Global View) */}
      <button
        type="button"
        onClick={onReturnToGlobal}
        className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#04060B]/85 hover:bg-[#000000] backdrop-blur-xl border border-white/20 hover:border-white/40 shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group ring-1 ring-white/10"
        title="Return to Global Moon View"
      >
        <ArrowLeft size={13} className="text-white/80 group-hover:-translate-x-0.5 transition-transform" />
        <div className="h-6 w-18 overflow-hidden flex items-center justify-center">
          <img
            src="/assets/brand/astra-logo-clean.webp"
            alt="ASTRA"
            className="w-full h-full object-contain group-hover:brightness-125 transition-all"
          />
        </div>
      </button>

      {/* 2. Center: Active Site Identity Badge */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2E8F0] px-3.5 py-1.5 rounded-xl shadow-xl text-[#0F172A] hidden sm:flex">
        <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse shrink-0" />
        <span className="text-xs font-extrabold whitespace-nowrap">{site.name}</span>
        <span className="text-[#CBD5E1]">·</span>
        <span className="text-[11px] font-mono text-[#64748B] whitespace-nowrap">
          {formatCoordinates(site.lat, site.lon, 1)}
        </span>
        <span className="text-[#CBD5E1]">·</span>
        <span className="bg-[#000000] text-white px-1.5 py-0.2 rounded font-mono text-[9px] font-bold shrink-0">
          LOLA {site.elevation > 0 ? '+' : ''}{site.elevation.toFixed(0)}m
        </span>
      </div>

      {/* 3. Right: Workspace Action Buttons (Configure & Multi-Site Compare) */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-[#04060B]/85 backdrop-blur-xl border border-white/15 px-2 py-1 rounded-2xl shadow-2xl text-white">
        <button
          type="button"
          onClick={onOpenConfigure}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all cursor-pointer"
          title="Configure Mission Parameters (Epoch, Duration, Interval)"
        >
          <Sliders size={13} className="text-[#38BDF8]" />
          <span>Configure</span>
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all cursor-pointer"
          title="Compare Multiple Candidate Sites & Launch Slips"
        >
          <GitCompare size={13} className="text-[#38BDF8]" />
          <span>Compare Sites</span>
        </button>
      </div>
    </header>
  );
}
