// ============================================================================
// Lunar Horizon — Autonomous AI Mission Advisor
// Adapted to ASTRA site architecture and design system (#FFFFFF + #000000 buttons)
// ChatGPT-style conversational assistant grounded in NASA LOLA DEM & JPL SPICE
// ============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  BrainCircuit,
  Cpu,
  ArrowUp,
  User,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Plus,
  MessageSquare,
  Trash2,
  Mountain,
  Clock,
  Radio,
  Sun,
  Globe,
  BatteryCharging,
  Sliders,
  Shield,
  HelpCircle,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Send,
} from 'lucide-react';
import { useMissionStore } from '../stores/useMissionStore';
import { SITES, formatCoordinates } from '../data/sites';
import { formatDegrees, formatPercent, formatElevation, formatDurationHours } from '../utils/formatters';
import { missionAnalysisService } from '../services/missionAnalysisService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  siteContext?: string;
  metricsBadge?: {
    sunPct: number;
    earthPct: number;
    longestNight: number;
  };
}

export default function AiAdvisor() {
  const {
    missionName,
    startDate,
    durationDays,
    selectedSite,
    setSelectedSite,
    candidateSiteIds,
    analysisConfig,
    missionPriority,
    setMissionPriority,
  } = useMissionStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Compute live multi-day scientific metrics for the current site
  const siteAnalysis = useMemo(() => {
    return missionAnalysisService.analyzeSiteMission(selectedSite, {
      startDate,
      durationDays,
      config: analysisConfig,
    });
  }, [selectedSite, startDate, durationDays, analysisConfig]);

  // Initial conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-initial',
      sender: 'assistant',
      text: `Hello, Mission Planner. I am **ASTRA Lunar Advisor**, your autonomous decision support co-pilot grounded in NASA LOLA DEM topography and JPL SPICE ephemerides.\n\nI have evaluated **${selectedSite.name}** (${formatCoordinates(
        selectedSite.lat,
        selectedSite.lon,
        1
      )}) for your **${durationDays}-day** operational period starting **${startDate.replace('T', ' ')} UTC**.\n\n### Current Mission Baseline Telemetry:\n- **Sunlight Visibility:** **${siteAnalysis.sunlightPercentage}%** (${siteAnalysis.totalSunlightHours}h total illumination)\n- **Direct-to-Earth Contact:** **${siteAnalysis.earthVisiblePercentage}%** (${siteAnalysis.totalEarthVisibleHours}h line-of-sight)\n- **Longest Continuous Night:** **${siteAnalysis.longestDarknessHours}h** (critical battery sizing factor)\n- **Longest Radio Outage:** **${siteAnalysis.longestEarthOutageHours}h** (telemetry store-and-forward needed)\n\nWhat scenario trade-offs, launch slip risks, or payload power constraints would you like to investigate?`,
      timestamp: 'Initial Evaluation',
      siteContext: selectedSite.name,
      metricsBadge: {
        sunPct: siteAnalysis.sunlightPercentage,
        earthPct: siteAnalysis.earthVisiblePercentage,
        longestNight: siteAnalysis.longestDarknessHours,
      },
    },
  ]);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Recommended quick prompt chips
  const QUICK_PROMPTS = [
    {
      label: 'Compare Candidate Sites',
      prompt: `Compare candidate site ${selectedSite.name} with other sites in the Artemis trade pool. What are the key illumination and communication trade-offs?`,
    },
    {
      label: 'Launch Delay (+14d / +29.5d)',
      prompt: `How would a 14-day or 1-month launch slip impact solar power and Earth visibility at ${selectedSite.name}?`,
    },
    {
      label: 'Longest Night & Battery Sizing',
      prompt: `What is the longest continuous darkness period at ${selectedSite.name} during our ${durationDays}-day mission, and what battery reserve margin is required?`,
    },
    {
      label: 'Direct-to-Earth Line of Sight',
      prompt: `Does local crater rim topography obstruct direct-to-Earth radio communication from ${selectedSite.name}?`,
    },
  ];

  // Submit query
  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsTyping(true);

    // Simulate intelligent scientific synthesis
    setTimeout(() => {
      let responseText = '';
      const q = query.toLowerCase();

      if (q.includes('compare') || q.includes('alternative') || q.includes('shackleton') || q.includes('malapert')) {
        const altSite = SITES.find((s) => s.id !== selectedSite.id) || SITES[0];
        const altAnalysis = missionAnalysisService.analyzeSiteMission(altSite, {
          startDate,
          durationDays,
          config: analysisConfig,
        });

        responseText = `### Regional Candidate Trade-Off Analysis\n\nComparing **${selectedSite.name}** vs **${altSite.name}** under identical mission conditions (${startDate.slice(0, 10)} for ${durationDays} days):\n\n| Mission Parameter | ${selectedSite.name} | ${altSite.name} | Delta |\n| :--- | :--- | :--- | :--- |\n| **Sunlight Duration** | **${siteAnalysis.sunlightPercentage}%** (${siteAnalysis.totalSunlightHours}h) | **${altAnalysis.sunlightPercentage}%** (${altAnalysis.totalSunlightHours}h) | ${siteAnalysis.sunlightPercentage >= altAnalysis.sunlightPercentage ? '+' : ''}${(siteAnalysis.sunlightPercentage - altAnalysis.sunlightPercentage).toFixed(1)}% |\n| **Earth Contact (DTE)** | **${siteAnalysis.earthVisiblePercentage}%** | **${altAnalysis.earthVisiblePercentage}%** | ${siteAnalysis.earthVisiblePercentage >= altAnalysis.earthVisiblePercentage ? '+' : ''}${(siteAnalysis.earthVisiblePercentage - altAnalysis.earthVisiblePercentage).toFixed(1)}% |\n| **Longest Darkness** | **${siteAnalysis.longestDarknessHours}h** | **${altAnalysis.longestDarknessHours}h** | ${siteAnalysis.longestDarknessHours - altAnalysis.longestDarknessHours}h |\n| **LOLA Elevation** | **${formatElevation(selectedSite.elevation)}** | **${formatElevation(altSite.elevation)}** | ${(selectedSite.elevation - altSite.elevation)}m |\n\n> **Flight Director Recommendation:** ${
          siteAnalysis.sunlightPercentage > altAnalysis.sunlightPercentage
            ? `${selectedSite.name} provides superior cumulative illumination, significantly reducing battery depth-of-discharge cycles.`
            : `${altSite.name} provides slightly longer illumination continuity, though ${selectedSite.name} maintains superior relief above crater shadows.`
        }`;
      } else if (q.includes('battery') || q.includes('darkness') || q.includes('night') || q.includes('power')) {
        responseText = `### Battery Storage & Thermal Assessment — ${selectedSite.name}\n\n- **Longest Continuous Darkness:** **${siteAnalysis.longestDarknessHours} hours**.\n- **Daylight Windows:** ${siteAnalysis.sunlightWindows.length} distinct solar windows across the ${durationDays}-day period.\n- **Solar Grazing Elevation:** Peak solar elevation reaches **${siteAnalysis.maxSunElevationDeg.toFixed(1)}°**.\n\n### Flight Architecture Guidance:\n1. **Battery Capacity:** Size the energy storage system to support baseline avionics (50–120W) for at least **${Math.round(siteAnalysis.longestDarknessHours * 1.25)} hours** (includes standard NASA 25% margin).\n2. **Vertical Solar Arrays:** Due to low polar sun elevation (< 2°), vertical cylindrical or multi-faceted arrays provide optimal cross-section for solar collection.\n3. **Thermal Management:** Initiate survival heaters prior to shadow ingress to avoid cryogenic shock at 95K.`;
      } else if (q.includes('delay') || q.includes('slip') || q.includes('date')) {
        responseText = `### Launch Slip & Schedule Contingency Analysis\n\nWhen evaluating schedule shifts from nominal start **${startDate}**:\n\n- **+7 Days Delay (Quarter-Lunation):** The solar azimuth shifts ~85°. Topographical shadows rotate, altering which crater rims cast shade.\n- **+14 Days Delay (Half-Lunation):** Polar illumination inverts. Slopes facing North drop into night, while Southern slopes emerge.\n- **+29.53 Days Delay (1 Synodic Month):** The Sun returns to nearly the exact same sub-solar longitude and elevation!\n\n> **Key Strategic Takeaway:** If a delay exceeds 10 days, slipping by **exactly 1 synodic month (+29.5d)** preserves identical solar illumination and communications geometries, minimizing trajectory replanning.`;
      } else if (q.includes('earth') || q.includes('communication') || q.includes('radio') || q.includes('dte')) {
        responseText = `### Direct-to-Earth (DTE) Radio Link Analysis — ${selectedSite.name}\n\n- **Total Line-of-Sight Window:** **${siteAnalysis.earthVisiblePercentage}%** of mission duration (${siteAnalysis.totalEarthVisibleHours}h).\n- **Longest Radio Outage:** **${siteAnalysis.longestEarthOutageHours} hours**.\n- **Libration Wobble:** Earth elevation oscillates between ${siteAnalysis.minEarthElevationDeg.toFixed(1)}° and ${siteAnalysis.maxEarthElevationDeg.toFixed(1)}° due to lunar libration.\n\n> **Operational Conclusion:** Direct-to-Earth communication is fully viable without an orbital relay satellite during line-of-sight periods. A buffer memory of ~32 GB is recommended to store science telemetry during the ${siteAnalysis.longestEarthOutageHours}h blackout window.`;
      } else {
        responseText = `### Mission Telemetry Synthesis for ${selectedSite.name}\n\nBased on your query, here is the current environmental status calculated using NASA LOLA DEM altimetry:\n\n- **Sunlight Availability:** **${siteAnalysis.sunlightPercentage}%** (${siteAnalysis.totalSunlightHours}h over ${durationDays} days).\n- **Earth DTE Link:** **${siteAnalysis.earthVisiblePercentage}%** (${siteAnalysis.totalEarthVisibleHours}h line-of-sight).\n- **Longest Night:** **${siteAnalysis.longestDarknessHours}h**.\n- **LOLA Altitude:** **${formatElevation(selectedSite.elevation)}**.\n\nYou can ask me to compare candidate sites, test launch slip dates, or size payload battery reserves.`;
      }

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        siteContext: selectedSite.name,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 750);
  };

  // Copy helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset conversation
  const handleReset = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Mission session reset for **${selectedSite.name}**. Ready to analyze alternative landing sites, launch dates, or thermal/power constraints.`,
        timestamp: 'Just now',
        siteContext: selectedSite.name,
      },
    ]);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FFFFFF] p-4 lg:p-6 space-y-6 max-w-[1700px] mx-auto text-[#0F172A]">
      {/* ==================================================================== */}
      {/* 1. Header & Mission Context Bar (Consistent ASTRA Design System)     */}
      {/* ==================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#000000] text-white">
                FLIGHT INTELLIGENCE
              </span>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Autonomous Mission Decision Co-Pilot
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0F172A] mt-1 tracking-tight">
              AI Mission Advisor
            </h1>
            <p className="text-[12px] text-[#475569] mt-0.5 max-w-4xl leading-relaxed">
              Automated scenario synthesis, trade-off reconciliation, and operational recommendations
              grounded in high-resolution NASA LOLA DEM topography and JPL SPICE orbital ephemerides.
            </p>
          </div>

          {/* Quick Target Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748B]">Active Candidate:</span>
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
              <span>Duration:</span>
              <strong className="text-[#0F172A] font-mono">{durationDays} Days ({durationDays * 24}h)</strong>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Mountain size={14} className="text-[#0F172A]" />
              <span>Altitude LOLA:</span>
              <strong className="text-[#0F172A] font-mono">{formatElevation(selectedSite.elevation)}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#475569] px-2.5 py-1 rounded-lg">
              NASA SPICE + LOLA 16 px/° Calibrated
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Main 2-Column Aerospace Layout: Conversation Console + Telemetry   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversational Chat Interface (8 Cols) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm flex flex-col h-[750px] overflow-hidden">
          {/* Chat Window Top Bar */}
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#000000] text-white flex items-center justify-center shadow-xs">
                <BrainCircuit size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-[#0F172A]">ASTRA Flight Advisor Co-Pilot</h3>
                  <span className="text-[9px] font-mono font-bold bg-[#000000] text-white px-1.5 py-0.2 rounded">
                    ONLINE
                  </span>
                </div>
                <span className="text-[10px] text-[#64748B]">Active context: {selectedSite.name}</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[11px] font-bold text-[#475569] hover:text-[#0F172A] transition-all shadow-xs"
              title="Clear conversation"
            >
              <RotateCcw size={12} />
              <span>New Session</span>
            </button>
          </div>

          {/* Scrollable Message Stream */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#000000] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <BrainCircuit size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12.5px] leading-relaxed relative ${
                    msg.sender === 'user'
                      ? 'bg-[#000000] text-white font-medium shadow-xs'
                      : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shadow-xs'
                  }`}
                >
                  {/* Formatted Text */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h4 key={pIdx} className="text-sm font-black text-[#0F172A] mt-2 mb-1">
                            {paragraph.replace('### ', '')}
                          </h4>
                        );
                      }
                      if (paragraph.startsWith('> ')) {
                        return (
                          <div key={pIdx} className="p-3 bg-white border-l-4 border-[#000000] text-[12px] text-[#334155] rounded-r-xl my-2 shadow-xs">
                            {paragraph.replace('> ', '')}
                          </div>
                        );
                      }
                      return <p key={pIdx}>{paragraph}</p>;
                    })}
                  </div>

                  {/* Assistant Footer Actions */}
                  {msg.sender === 'assistant' && (
                    <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span className="font-mono text-[10px]">{msg.timestamp}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="p-1 hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-[#16A34A]" /> : <Copy size={12} />}
                        </button>
                        <button className="p-1 hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors">
                          <ThumbsUp size={12} />
                        </button>
                        <button className="p-1 hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors">
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3.5 justify-start">
                <div className="w-8 h-8 rounded-full bg-[#000000] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BrainCircuit size={16} />
                </div>
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3 shadow-xs flex items-center gap-2.5">
                  <span className="text-[11.5px] font-bold text-[#64748B]">Synthesizing LOLA DEM & SPICE Ephemeris</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#000000] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#000000] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#000000] animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips (Above Input) */}
          <div className="px-5 pt-2 pb-1 border-t border-[#F1F5F9] bg-[#FFFFFF] overflow-x-auto">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold uppercase text-[#94A3B8] mr-1">Suggested:</span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#000000] hover:text-white border border-[#CBD5E1] text-[11px] font-semibold text-[#475569] transition-all shadow-xs"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Floating-Style Input Box */}
          <div className="p-4 bg-[#FFFFFF] border-t border-[#E2E8F0]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 bg-[#FFFFFF] border border-[#CBD5E1] focus-within:border-[#000000] focus-within:ring-2 focus-within:ring-[#000000]/10 rounded-2xl p-1.5 shadow-sm transition-all"
            >
              <div className="p-1.5 text-[#64748B] ml-1">
                <Cpu size={16} />
              </div>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={`Ask flight advisor about solar windows, blackout risks, or launch slip for ${selectedSite.name}…`}
                className="flex-1 bg-transparent border-none text-[12.5px] font-medium text-[#0F172A] outline-none px-2 placeholder:text-[#94A3B8]"
              />

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isTyping}
                className={`px-4 py-2 rounded-xl text-[11.5px] font-bold flex items-center gap-1.5 transition-all ${
                  inputPrompt.trim() && !isTyping
                    ? 'bg-[#000000] text-white hover:bg-[#1E293B] shadow-sm'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                }`}
              >
                <span>Analyze</span>
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Telemetry & Mission Intelligence Cards (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Live Site Operational Snapshot */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#0F172A]">
                Evaluated Site Telemetry
              </h3>
              <span className="bg-[#000000] text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                {selectedSite.category.toUpperCase()}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1">
              <span className="text-sm font-bold text-[#0F172A] block">{selectedSite.name}</span>
              <p className="text-[11px] font-mono text-[#64748B]">
                {formatCoordinates(selectedSite.lat, selectedSite.lon, 2)} • LOLA {formatElevation(selectedSite.elevation)}
              </p>
            </div>

            <div className="space-y-2.5 text-[11.5px]">
              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#64748B] flex items-center gap-1.5">
                    <Sun size={13} className="text-[#E8A838]" /> Sunlight Visibility
                  </span>
                  <span className="font-mono text-[#0F172A]">{siteAnalysis.sunlightPercentage}%</span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#000000] h-full rounded-full" style={{ width: `${siteAnalysis.sunlightPercentage}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-[#64748B] flex items-center gap-1.5">
                    <Globe size={13} className="text-[#2563EB]" /> Direct Earth (DTE)
                  </span>
                  <span className="font-mono text-[#0F172A]">{siteAnalysis.earthVisiblePercentage}%</span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${siteAnalysis.earthVisiblePercentage}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <span className="text-[#64748B] block">Worst Darkness:</span>
                  <span className="font-mono font-bold text-[#0F172A]">{siteAnalysis.longestDarknessHours}h</span>
                </div>
                <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  <span className="text-[#64748B] block">Worst Outage:</span>
                  <span className="font-mono font-bold text-[#0F172A]">{siteAnalysis.longestEarthOutageHours}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Strategic Flight Director Insights */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#000000]" />
              <h4 className="text-sm font-black text-[#0F172A]">Flight Director Strategic Rules</h4>
            </div>

            <ul className="text-[11.5px] text-[#475569] space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#0F172A]">•</span>
                <span><strong>No Universal Site:</strong> A site with peak sunlight may exhibit lower Earth line-of-sight elevation. Choose based on lander battery vs downlink priority.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#0F172A]">•</span>
                <span><strong>Synodic Resets:</strong> If launch delays exceed 7 days, slipping by 29.5 days replicates nearly identical illumination conditions.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#0F172A]">•</span>
                <span><strong>Vertical Orientation:</strong> South Pole solar rays arrive at &lt; 2° elevation; vertical panel deployment is mandatory.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
