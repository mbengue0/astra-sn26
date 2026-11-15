// ============================================================================
// Lunar Horizon — Right Site Overview Panel & Connecting Leader Line
// Inspired by Google Moon (Jonathan Cheseaux) Dribbble Reference:
// 1. Name displayed beside the point on the Moon (with intelligent collision prevention)
// 2. Thin, subtle connecting line from the point towards the RIGHT panel
// 3. 100% Transparent panel (no solid card background, heavy borders, or shadows)
// 4. Follows authentic ASTRA-SN typography (Inter primary, JetBrains Mono for telemetry)
// ============================================================================

import React, { useMemo } from 'react';
import { ArrowRight, Compass, Mountain } from 'lucide-react';
import type { LunarSite } from '../../types';
import { CATEGORIES, formatCoordinates } from '../../data/sites';
import { formatElevation } from '../../utils/formatters';

export interface ActiveSiteScreenData {
  x: number;
  y: number;
  isVisible: boolean;
  site: LunarSite;
}

export interface RightSiteOverviewPanelProps {
  activeData: ActiveSiteScreenData | null;
  onExploreSite: (site: LunarSite) => void;
  onPointerEnterPanel?: () => void;
  onPointerLeavePanel?: () => void;
}

export default function RightSiteOverviewPanel({
  activeData,
  onExploreSite,
  onPointerEnterPanel,
  onPointerLeavePanel,
}: RightSiteOverviewPanelProps) {
  // If no site is active or site is occluded behind lunar horizon, don't display
  if (!activeData || !activeData.isVisible) {
    return null;
  }

  const { x: startX, y: startY, site } = activeData;
  const category = CATEGORIES[site.category] || { label: site.category, color: '#38BDF8' };

  // Screen bounds
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 900;

  // The right panel is anchored at right: 2rem (32px) to 4rem (64px)
  const panelWidth = Math.min(370, windowWidth * 0.28);
  const panelRightMargin = windowWidth >= 1024 ? 64 : 32;
  const targetX = windowWidth - panelWidth - panelRightMargin - 20;

  // Vertical anchor on the right panel
  const targetY = windowHeight * 0.46;

  // Estimate label width in pixels (font-bold text-xs ~7.5px per character + padding/dot)
  const estimatedLabelWidth = Math.min(220, site.name.length * 7.5 + 28);

  // Dynamic collision prevention:
  // If marker is on the right half of the screen or too close to the right panel,
  // place the label on the LEFT of the point so it never runs into or overlaps the panel!
  const distanceToPanel = targetX - startX;
  const placeLabelOnLeft = distanceToPanel < (estimatedLabelWidth + 60) || startX > (windowWidth * 0.50);

  // Generate SVG path: Start at Moon point -> horizontal break -> gentle angle -> horizontal landing
  const pathD = useMemo(() => {
    // If dot is already at or past targetX
    if (startX >= targetX - 10) {
      return `M ${startX} ${startY} L ${targetX} ${targetY}`;
    }

    // Origin of the connecting line:
    // If label is placed on the left, the line starts cleanly right at the dot (startX + 4)
    // If label is on the right, the line starts just past the label
    const lineStartX = placeLabelOnLeft
      ? startX + 4
      : Math.min(startX + estimatedLabelWidth + 14, targetX - 30);

    if (lineStartX >= targetX - 20) {
      return `M ${lineStartX} ${startY} L ${targetX} ${targetY}`;
    }

    const midX = lineStartX + (targetX - lineStartX) * 0.52;
    const breakX = Math.min(midX + 24, targetX - 8);

    return `M ${lineStartX} ${startY} L ${midX} ${startY} L ${breakX} ${targetY} L ${targetX} ${targetY}`;
  }, [startX, startY, targetX, targetY, placeLabelOnLeft, estimatedLabelWidth]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden font-sans">
      {/* 1. Thin, Subtle Connecting Leader Line (SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="googleMoonLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.85)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0.7)" />
          </linearGradient>
        </defs>

        {/* Small halo ring at the origin point on the Moon */}
        <circle
          cx={startX}
          cy={startY}
          r="5.5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth="1"
          className="animate-ping opacity-35"
        />
        <circle
          cx={startX}
          cy={startY}
          r="2.5"
          fill="#FFFFFF"
        />

        {/* Delicate Connecting Path */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#googleMoonLineGrad)"
          strokeWidth="1"
          strokeDasharray="4 2"
          className="opacity-80"
        />

        {/* Subtle Terminal Node at the Right Panel */}
        <circle
          cx={targetX}
          cy={targetY}
          r="2.5"
          fill="#38BDF8"
        />
      </svg>

      {/* 2. Site Name Displayed Beside the Point on the Moon (Zero Overlap Guaranteed) */}
      <div
        style={{
          left: placeLabelOnLeft ? startX - 12 : startX + 12,
          top: startY,
          transform: placeLabelOnLeft ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
        }}
        className={`absolute flex items-center gap-2 pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150 ${
          placeLabelOnLeft ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_6px_#FFFFFF]"
          style={{ backgroundColor: category.color || '#FFFFFF' }}
        />
        <span
          className="text-xs sm:text-[13px] font-bold tracking-wide text-white whitespace-nowrap px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm border border-white/10"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9)',
          }}
        >
          {site.name}
        </span>
      </div>

      {/* 3. Transparent Information Panel on the RIGHT Side */}
      <div
        onMouseEnter={onPointerEnterPanel}
        onMouseLeave={onPointerLeavePanel}
        style={{
          width: panelWidth,
          right: panelRightMargin,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        className="absolute pointer-events-auto select-none bg-transparent p-0 animate-in fade-in slide-in-from-right-6 duration-250 ease-out text-left"
      >
        {/* Category Pill Badge */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[10px] font-semibold tracking-wide border border-white/15 backdrop-blur-md"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: category.color || '#38BDF8' }}
            />
            <span>{category.label}</span>
          </span>

          <span className="text-[#64748B] text-xs">·</span>
          <span className="text-[11px] font-mono font-medium text-[#94A3B8]">
            {site.elevation > 0 ? '+' : ''}{site.elevation.toFixed(0)}m DEM
          </span>
        </div>

        {/* Site Name in Bold, Modern ASTRA Typography */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {site.name}
        </h2>

        {/* Subtitle / Geographic Region */}
        {site.subtitle && (
          <p className="text-xs sm:text-[13px] text-[#94A3B8] font-medium mt-1 leading-normal">
            {site.subtitle}
          </p>
        )}

        {/* Delicate Hairline Divider */}
        <div className="w-full h-px bg-white/15 my-3.5" />

        {/* Key Metrics Chips (Clean 2x2 grid with subtle glass finish) */}
        <div className="grid grid-cols-2 gap-2 my-3.5">
          {/* Metric 1: Coordinates */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5 backdrop-blur-md">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] block">
              Coordinates
            </span>
            <div className="flex items-center gap-1 text-white font-mono text-xs font-bold">
              <Compass size={11} className="text-[#38BDF8] shrink-0" />
              <span>{formatCoordinates(site.lat, site.lon, 2)}</span>
            </div>
          </div>

          {/* Metric 2: LOLA Altimetry */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5 backdrop-blur-md">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] block">
              Elevation
            </span>
            <div className="flex items-center gap-1 text-[#38BDF8] font-mono text-xs font-bold">
              <Mountain size={11} className="text-[#38BDF8] shrink-0" />
              <span>{formatElevation(site.elevation)}</span>
            </div>
          </div>

          {/* Metric 3: Solar Light */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Sunlight
              </span>
              <span className="text-xs font-mono font-bold text-[#E8A838]">
                {site.sunVisibilityPct != null ? `${site.sunVisibilityPct}%` : '—'}
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#E8A838] rounded-full transition-all duration-500"
                style={{ width: `${site.sunVisibilityPct ?? 0}%` }}
              />
            </div>
          </div>

          {/* Metric 4: Earth Direct Link */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Earth Contact
              </span>
              <span className="text-xs font-mono font-bold text-[#38BDF8]">
                {site.earthVisibilityPct != null ? `${site.earthVisibilityPct}%` : '—'}
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-[#38BDF8] rounded-full transition-all duration-500"
                style={{ width: `${site.earthVisibilityPct ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Narrative Context Description */}
        <p className="text-xs sm:text-[12.5px] text-[#CBD5E1] leading-relaxed font-normal my-3 line-clamp-3">
          {site.description || site.simpleSummary}
        </p>

        {/* Hairline Divider */}
        <div className="w-full h-px bg-white/15 my-3" />

        {/* Minimal Guidance Notice (Replacing the redundant button) */}
        <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-2 pt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse shrink-0" />
          <span>Click site marker on the Moon to explore 3D terrain</span>
        </div>
      </div>
    </div>
  );
}
