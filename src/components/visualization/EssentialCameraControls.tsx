// ============================================================================
// Lunar Horizon — Essential Camera Controls
// Discreetly positioned camera controls (Reset View, Fullscreen)
// Follows ASTRA-SN design tokens: Pure White (#FFFFFF), Slate Borders (#E2E8F0)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

export interface EssentialCameraControlsProps {
  onResetView: () => void;
  className?: string;
}

export default function EssentialCameraControls({ onResetView, className }: EssentialCameraControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={className || "fixed bottom-6 right-6 z-30 flex flex-col items-center gap-1 bg-[#FFFFFF]/95 backdrop-blur-xl border border-[#E2E8F0] p-1 rounded-2xl shadow-xl text-[#0F172A] select-none pointer-events-auto"}
    >
      {/* 1. Reset Camera View */}
      <button
        onClick={onResetView}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all cursor-pointer"
        title="Reset camera view"
        aria-label="Reset camera view"
      >
        <RotateCcw size={14} />
      </button>

      <div className="w-4 h-px bg-[#E2E8F0]" />

      {/* 2. Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all cursor-pointer"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );
}
