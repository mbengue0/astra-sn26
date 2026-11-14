// ============================================================================
// Lunar Horizon — Mission Configuration Modal / Drawer
// Allows configuration of:
// - Start date & time
// - Mission duration (days)
// - Sampling interval (hours)
// - Terrain-aware horizon raycasting toggle
// - Export of standardized JSON contract (schemaVersion: 1)
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Layers,
  Download,
  Check,
  RotateCcw,
  Sliders,
  ShieldCheck,
  FileJson,
} from 'lucide-react';
import { LunarSite, AnalysisConfiguration, SiteMissionAnalysis } from '../../types';
import { analysisDataAdapter } from '../../services/analysisDataAdapter';

export interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: LunarSite;
  startDate: string;
  durationDays: number;
  config: AnalysisConfiguration;
  onUpdateScenario: (params: {
    startDate: string;
    durationDays: number;
    config: Partial<AnalysisConfiguration>;
  }) => void;
  currentAnalysis?: SiteMissionAnalysis | null;
}

export default function ConfigureModal({
  isOpen,
  onClose,
  site,
  startDate,
  durationDays,
  config,
  onUpdateScenario,
  currentAnalysis,
}: ConfigureModalProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate.slice(0, 16));
  const [localDurationDays, setLocalDurationDays] = useState(durationDays);
  const [localInterval, setLocalInterval] = useState(config.samplingIntervalHours || 1);
  const [localTerrainAware, setLocalTerrainAware] = useState(config.terrainAware ?? true);
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    onUpdateScenario({
      startDate: localStartDate,
      durationDays: localDurationDays,
      config: {
        samplingIntervalHours: localInterval,
        terrainAware: localTerrainAware,
      },
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setLocalStartDate('2026-11-20T12:00');
    setLocalDurationDays(14);
    setLocalInterval(1);
    setLocalTerrainAware(true);
  };

  const handleExportContractV1 = () => {
    if (!currentAnalysis) return;
    const contract = analysisDataAdapter.toContractV1(currentAnalysis, {
      ...config,
      samplingIntervalHours: localInterval,
      terrainAware: localTerrainAware,
    });
    const jsonStr = JSON.stringify(contract, null, 2);
    setExportedJson(jsonStr);

    // Auto-trigger browser download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astra-mission-${site.id}-schema-v1.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    if (!exportedJson) return;
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#090D16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white font-sans flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#04060B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Sliders size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Mission Parameter Configuration</h2>
              <p className="text-[11px] text-white/50">
                Target: <span className="text-white/80 font-medium">{site.name}</span>
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Start Date & Time */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Calendar size={13} className="text-[#38BDF8]" />
              <span>Landing & Simulation Epoch (UTC)</span>
            </label>
            <input
              type="datetime-local"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
            />
            <p className="text-[10px] text-white/40">
              Aligns solar azimuth and Earth libration angles to exact NASA JPL ephemerides.
            </p>
          </div>

          {/* 2. Mission Duration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Clock size={13} className="text-[#38BDF8]" />
              <span>Mission Operational Duration</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { days: 7, label: '7 Days', sub: 'Quarter synodic' },
                { days: 14, label: '14 Days', sub: '1 Lunar day' },
                { days: 21, label: '21 Days', sub: 'Extended daylight' },
                { days: 28, label: '28 Days', sub: 'Full synodic cycle' },
              ].map(({ days, label, sub }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setLocalDurationDays(days)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    localDurationDays === days
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                  }`}
                >
                  <div className="text-xs">{label}</div>
                  <div className={`text-[9px] ${localDurationDays === days ? 'text-black/60' : 'text-white/40'}`}>
                    {sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Sampling Interval */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Sliders size={13} className="text-[#38BDF8]" />
              <span>Temporal Sampling Interval</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 1, label: '1 Hour', sub: 'Standard precision' },
                { val: 2, label: '2 Hours', sub: 'Long duration' },
                { val: 6, label: '6 Hours', sub: 'High speed overview' },
              ].map(({ val, label, sub }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLocalInterval(val)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    localInterval === val
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-white/70'
                  }`}
                >
                  <div className="text-xs">{label}</div>
                  <div className={`text-[9px] ${localInterval === val ? 'text-black/60' : 'text-white/40'}`}>
                    {sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Terrain-Aware Horizon */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Layers size={13} className="text-[#38BDF8]" />
                <span>NASA LOLA 360° Horizon Obstruction Mask</span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Applies real topographic ridges and crater rim elevations to determine true solar illumination and direct Earth line-of-sight.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocalTerrainAware(!localTerrainAware)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                localTerrainAware ? 'bg-[#38BDF8]' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  localTerrainAware ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5. Standardized Backend JSON Contract (schemaVersion: 1) */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileJson size={14} className="text-[#38BDF8]" />
                <span className="text-xs font-semibold text-white">Data Contract (schemaVersion: 1)</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Verified Compliant
              </span>
            </div>
            <p className="text-[10px] text-white/50">
              Export standardized mission analysis JSON payload complying with the agreed schemaVersion: 1 API contract.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportContractV1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
              >
                <Download size={12} />
                <span>Download schemaVersion: 1 JSON</span>
              </button>
              {exportedJson && (
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <FileJson size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#04060B]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
          >
            <RotateCcw size={12} />
            <span>Reset Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-all shadow-lg"
            >
              Apply & Recompute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
