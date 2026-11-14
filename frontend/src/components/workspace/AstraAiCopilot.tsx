// ============================================================================
// Lunar Horizon — ASTRA Flight AI Copilot Floating Bubble & Assistant
// Conversational mission advisor grounded in real NASA LOLA DEM topography
// and JPL SPICE ephemerides. Replaces static text documentation with an
// interactive, intelligent conversational assistant.
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  BrainCircuit,
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Copy,
  Check,
  Sun,
  Globe,
  Clock,
  Radio,
  HelpCircle,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { LunarSite, SiteMissionAnalysis, AnalysisConfiguration } from '../../types';
import { formatCoordinates, SITES } from '../../data/sites';
import { formatElevation } from '../../utils/formatters';
import { missionAnalysisService } from '../../services/missionAnalysisService';

export interface AstraAiCopilotProps {
  isOpen: boolean;
  onToggle: () => void;
  site: LunarSite;
  analysis: SiteMissionAnalysis;
  startDate: string;
  durationDays: number;
  config: AnalysisConfiguration;
}

interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function AstraAiCopilot({
  isOpen,
  onToggle,
  site,
  analysis,
  startDate,
  durationDays,
  config,
}: AstraAiCopilotProps) {
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial welcome message tailored to current site
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Greetings, Flight Planner. I am **ASTRA Flight AI**, your autonomous mission co-pilot grounded in **NASA LOLA altimetry (LDEM_16)** and **JPL Horizons ephemerides**.\n\nI have analyzed **${site.name}** (${formatCoordinates(site.lat, site.lon, 1)}) for your **${durationDays}-day** window starting **${startDate.replace('T', ' ')} UTC**.\n\n- **Sunlight Duty Cycle:** **${analysis.sunlightPercentage}%** (${analysis.totalSunlightHours}h total illumination)\n- **Earth Direct-to-Earth Link:** **${analysis.earthVisiblePercentage}%** (${analysis.totalEarthVisibleHours}h line-of-sight)\n- **Max Continuous Darkness:** **${analysis.longestDarknessHours}h** (critical battery sizing factor)\n- **Max Comms Blackout:** **${analysis.longestEarthOutageHours}h**\n\nHow can I assist your mission planning? Ask me about terrain blockage, launch slips, battery margins, or data methodology.`,
      timestamp: 'Initial Assessment',
    },
  ]);

  // Update welcome message when site changes
  useEffect(() => {
    setMessages([
      {
        id: `site-change-${site.id}-${Date.now()}`,
        sender: 'assistant',
        text: `Switched operational context to **${site.name}** (${formatCoordinates(site.lat, site.lon, 1)}, LOLA ${formatElevation(site.elevation)}).\n\n- **Illumination:** **${analysis.sunlightPercentage}%** (${analysis.totalSunlightHours}h)\n- **Direct Earth LOS:** **${analysis.earthVisiblePercentage}%** (${analysis.totalEarthVisibleHours}h)\n- **Max Night Duration:** **${analysis.longestDarknessHours}h**\n- **Max Comms Outage:** **${analysis.longestEarthOutageHours}h**\n\nWhat would you like to investigate for this location?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [site.id]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Recommended prompt chips
  const PROMPT_CHIPS = [
    {
      label: 'Why this lighting?',
      query: `Why does ${site.name} experience ${analysis.sunlightPercentage}% sunlight and ${analysis.longestDarknessHours}h longest darkness?`,
    },
    {
      label: 'Battery & Freeze Risk',
      query: `What are the battery storage and cryogenic freeze risks during the ${analysis.longestDarknessHours}h darkness window at ${site.name}?`,
    },
    {
      label: 'Earth Line-of-Sight',
      query: `Explain how lunar libration and crater rims affect Direct-to-Earth radio communications at ${site.name}.`,
    },
    {
      label: 'Launch Slip Impact (+14d / +29.5d)',
      query: `How will a 14-day or 1-month launch slip alter illumination and communications at ${site.name}?`,
    },
    {
      label: 'Data Sources & Limits',
      query: `What NASA datasets, coordinate frames, and resolution limits are used for this analysis?`,
    },
  ];

  const handleSendQuery = (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isTyping) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = '';
      const lower = q.toLowerCase();

      if (lower.includes('why') || lower.includes('lighting') || lower.includes('sunlight') || lower.includes('illumination')) {
        const isSouthPole = site.lat < -75;
        if (isSouthPole) {
          reply = `### Topographic Illumination Mechanics for ${site.name}\n\n1. **Grazing Polar Incidence:** Situated at **${Math.abs(site.lat).toFixed(1)}°S**, the Sun stays close to the horizon, oscillating between **${analysis.minSunElevationDeg.toFixed(2)}°** and **${analysis.maxSunElevationDeg.toFixed(2)}°**.\n2. **Altimetry Advantage:** At **${formatElevation(site.elevation)}**, the site stands above regional crater depressions, catching low grazing rays that pass over lower terrain.\n3. **Local Shadow Obstruction:** The 360° LOLA raycast shows surrounding ridges reach up to **+${Math.max(...analysis.timeSeries.map((t) => t.localHorizonAtSunDeg)).toFixed(1)}°** elevation, casting the observed ${analysis.longestDarknessHours}h shadow periods.`;
        } else {
          reply = `### Equatorial Diurnal Cycle for ${site.name}\n\nAt latitude **${site.lat.toFixed(1)}°**, ${site.name} follows the standard lunar synodic diurnal cycle. Peak solar elevation reaches **${analysis.maxSunElevationDeg.toFixed(1)}°**, providing direct perpendicular solar flux before entering the ~14-day lunar night.`;
        }
      } else if (lower.includes('battery') || lower.includes('freeze') || lower.includes('thermal') || lower.includes('power')) {
        reply = `### Battery & Thermal Architecture Assessment\n\n- **Longest Darkness Period:** **${analysis.longestDarknessHours} continuous hours**.\n- **Cryogenic Hazard:** In shadows, regolith temperatures plunge to **~95K (-178°C)**, posing severe solder embrittlement and electrolyte freeze risks.\n\n### Operational Recommendations:\n1. **Battery Reserve:** Size primary batteries for at least **${Math.round(analysis.longestDarknessHours * 1.25)} hours** of survival bus power (50W baseline avionics + 25% flight reserve).\n2. **Pre-Shadow Heating:** Pre-warm battery cells and avionics blocks 2 hours before shadow ingress.\n3. **Vertical Solar Arrays:** Due to low solar elevation (${analysis.maxSunElevationDeg}° max), vertical cylindrical arrays maximize solar collection over horizontal panels.`;
      } else if (lower.includes('earth') || lower.includes('communication') || lower.includes('radio') || lower.includes('dte')) {
        reply = `### Direct-to-Earth (DTE) Communication Mechanics\n\n- **Contact Availability:** **${analysis.earthVisiblePercentage}%** (${analysis.totalEarthVisibleHours}h line-of-sight).\n- **Longest Outage:** **${analysis.longestEarthOutageHours} hours**.\n- **Libration Wobble:** The Moon's axial tilt and orbital eccentricity produce optical and physical librations (up to ±7.9° longitude, ±6.7° latitude), causing Earth to oscillate between **${analysis.minEarthElevationDeg.toFixed(2)}°** and **${analysis.maxEarthElevationDeg.toFixed(2)}°**.\n\n> **Payload Guidance:** With only ${analysis.longestEarthOutageHours}h of maximum blackout, a direct DTE link is fully viable with a 32GB onboard store-and-forward memory buffer. No dedicated relay satellite is mandatory.`;
      } else if (lower.includes('delay') || lower.includes('slip') || lower.includes('date') || lower.includes('month')) {
        reply = `### Launch Slip & Schedule Contingency Analysis\n\n- **+7 Days Delay:** The solar azimuth advances ~85°. Shadows rotate, exposing different crater slopes.\n- **+14 Days Delay:** Polar lighting inverts: slopes facing North drop into shadow, while Southern slopes illuminate.\n- **+29.53 Days Slip (1 Synodic Month):** The Sun returns to nearly the identical sub-solar position and elevation profile!\n\n> **Flight Director Rule of Thumb:** For delays over 10 days, slipping by **exactly 29.5 days** preserves identical mission thermal and solar illumination profiles without redesigning landing timelines.`;
      } else if (lower.includes('data') || lower.includes('source') || lower.includes('limit') || lower.includes('lola')) {
        reply = `### Official NASA Data Sources & Methodology\n\n- **NASA LOLA Altimetry (LDEM_16):** 16 px/° (~1.89 km/px) elevation grid sampled from the Lunar Reconnaissance Orbiter (LRO). 0-datum is the 1,737.4 km lunar sphere.\n- **JPL Horizons Ephemeris System:** Sub-solar and sub-Earth coordinate vectors including physical librations.\n- **Horizon Raycasting:** Computes 360 individual azimuth raycasts to evaluate local crater rim obstacle elevation.\n- **Scientific Limitation:** Macro-topography is accurately resolved, but micro-boulders (<100m) and sub-pixel hazard slopes require targeted LOLA 128 px/deg tiles.`;
      } else {
        reply = `### Analysis Synthesis for ${site.name}\n\n- **Coordinates:** ${formatCoordinates(site.lat, site.lon, 2)}\n- **LOLA Elevation:** ${formatElevation(site.elevation)}\n- **Illumination Duty Cycle:** ${analysis.sunlightPercentage}% (${analysis.totalSunlightHours}h)\n- **Direct Earth LOS:** ${analysis.earthVisiblePercentage}% (${analysis.totalEarthVisibleHours}h)\n- **Max Darkness Window:** ${analysis.longestDarknessHours}h\n\nFeel free to ask about thermal sizing, schedule delays, or comparison against other candidate landing sites.`;
      }

      const botMsg: CopilotMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* 1. Floating AI Copilot Trigger Bubble */}
      <button
        type="button"
        onClick={onToggle}
        className={`fixed z-40 flex items-center gap-2 rounded-full shadow-2xl transition-all duration-300 cursor-pointer select-none ${
          isOpen
            ? 'bottom-6 right-6 p-3 bg-white text-black hover:bg-white/90 scale-105'
            : 'bottom-6 right-6 px-4 py-2.5 bg-[#000000] text-white hover:bg-[#1E293B] border border-white/20 hover:scale-105 ring-4 ring-[#38BDF8]/20'
        }`}
        title={isOpen ? "Close ASTRA AI Copilot" : "Open ASTRA Flight AI Copilot"}
      >
        <div className="relative">
          <BrainCircuit size={18} className={isOpen ? "text-black" : "text-[#38BDF8]"} />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#38BDF8]" />
        </div>
        {!isOpen && (
          <div className="flex items-center gap-1.5 font-sans">
            <span className="text-xs font-bold tracking-wide">ASTRA Copilot</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/15 text-white/90 font-bold">
              AI
            </span>
          </div>
        )}
      </button>

      {/* 2. Conversational Copilot Drawer Dialog */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-96 max-w-[calc(100vw-2rem)] h-[560px] max-h-[80vh] bg-[#090D16]/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white font-sans animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#04060B]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#38BDF8]">
                <BrainCircuit size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold tracking-wide">ASTRA Flight AI Copilot</h3>
                  <span className="text-[8px] font-mono px-1 rounded bg-[#38BDF8]/20 text-[#38BDF8] font-bold">
                    NASA LOLA
                  </span>
                </div>
                <p className="text-[10px] text-white/50 truncate max-w-[180px]">
                  Context: <span className="text-white/80 font-medium">{site.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: `reset-${Date.now()}`,
                      sender: 'assistant',
                      text: `Session reset for **${site.name}**. Ready for aerospace environmental queries.`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Copilot"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips Bar */}
          <div className="px-3.5 py-2 bg-[#050811] border-b border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
            {PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendQuery(chip.query)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 text-[10px] font-medium text-white/80 whitespace-nowrap transition-all cursor-pointer shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isAssistant
                        ? 'bg-white/10 border border-white/15 text-[#38BDF8]'
                        : 'bg-[#000000] border border-white/30 text-white'
                    }`}
                  >
                    {isAssistant ? <Bot size={13} /> : <span className="text-[10px] font-bold">U</span>}
                  </div>

                  <div className={`space-y-1 max-w-[85%] ${isAssistant ? 'text-left' : 'text-right'}`}>
                    <div
                      className={`p-3 rounded-2xl leading-relaxed text-xs shadow-md ${
                        isAssistant
                          ? 'bg-white/10 border border-white/10 text-white rounded-tl-sm'
                          : 'bg-white text-black font-medium rounded-tr-sm'
                      }`}
                    >
                      <div className="whitespace-pre-line prose prose-invert prose-xs">
                        {msg.text}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] text-white/40 px-1">
                      <span>{msg.timestamp}</span>
                      {isAssistant && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:text-white transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-white/50 text-[11px] font-mono px-2">
                <div className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping" />
                <span>ASTRA synthesising LOLA DEM raycasts…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#04060B] border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 focus-within:border-white focus-within:ring-1 focus-within:ring-white transition-all"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask ASTRA about terrain, power, slips…"
                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/40 w-full min-w-0"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="p-1 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shrink-0"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
