// ============================================================================
// Lunar Horizon — Application Root Component & Core V1 User Flow
// ASTRA-SN: Connected User Journey:
// Explore → Select → Configure → Analyse → Compare → Understand
// ============================================================================

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { MapPin } from 'lucide-react';

// Navigation & Layout Shell
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

// Pages & Components (Preserved)
import MissionOverview from './pages/MissionOverview';
import SiteExplorer from './pages/SiteExplorer';
import Simulator from './pages/Simulator';
import ScenarioComparison from './pages/ScenarioComparison';
import MissionTimeline from './pages/MissionTimeline';
import AiAdvisor from './pages/AiAdvisor';
import DataSources from './pages/DataSources';
import Settings from './pages/Settings';

// 3D Visualizations
import NasaMoonGlobe from './components/three/NasaMoonGlobe';
import ImmersiveLunarSky from './components/three/ImmersiveLunarSky';

// Exploration & Navigation
import MoonSearchNavigator from './components/visualization/MoonSearchNavigator';
import EssentialCameraControls from './components/visualization/EssentialCameraControls';
import RightSiteOverviewPanel, { ActiveSiteScreenData } from './components/visualization/RightSiteOverviewPanel';
import MiniThumbnailPreviews from './components/visualization/MiniThumbnailPreviews';

// Integrated Workspace Components
import WorkspaceHeader from './components/workspace/WorkspaceHeader';
import TelemetryHud from './components/workspace/TelemetryHud';
import MissionTimelineBar from './components/workspace/MissionTimelineBar';
import ConfigureModal from './components/workspace/ConfigureModal';
import MultiSiteCompareCockpit from './components/workspace/MultiSiteCompareCockpit';
import AstraAiCopilot from './components/workspace/AstraAiCopilot';

// State & Services
import { useMissionStore } from './stores/useMissionStore';
import { lunarTerrainService } from './services/lunarTerrainService';
import { astronomicalService } from './services/astronomicalService';
import { missionAnalysisService } from './services/missionAnalysisService';
import type { LunarSite, AnalysisConfiguration } from './types';

// Step 1 Abstraction: Focused Moon visualization with minimal selector
const SHOW_MOON_VISUALIZATION_ONLY = true;

type MoonViewMode = 'global' | 'terrain' | 'horizon';

/**
 * Pure Moon Visualization Focus View with Progressive Site Selection & Complete Connected User Flow:
 * Explore → Select → Configure → Analyse → Compare → Understand
 */
function MoonVisualizationFocus() {
  const {
    selectedSite,
    setSelectedSite,
    startDate,
    setStartDate,
    durationDays,
    setDurationDays,
    activeHour,
    setActiveHour,
    analysisConfig,
    setAnalysisConfig,
  } = useMissionStore();

  const [isSiteFocused, setIsSiteFocused] = useState<boolean>(false);
  const [hasSiteBeenSelected, setHasSiteBeenSelected] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<MoonViewMode>('global');
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Search-highlighted target site (keeps global Moon view while displaying search drawer)
  const [highlightedSite, setHighlightedSite] = useState<LunarSite | null>(null);

  // Hover state for the dropdown overview panel on the global Moon
  const [hoveredSite, setHoveredSite] = useState<LunarSite | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Real-time 2D projected screen coordinate data for the active site
  const [activeSiteScreenData, setActiveSiteScreenData] = useState<ActiveSiteScreenData | null>(null);

  // Workflow Modal States
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Simulation playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // --------------------------------------------------------------------------
  // Multi-Day Environmental & Mission Analysis
  // --------------------------------------------------------------------------
  const missionAnalysis = useMemo(() => {
    return missionAnalysisService.analyzeSiteMission(selectedSite, {
      startDate,
      durationDays,
      config: analysisConfig,
    });
  }, [selectedSite, startDate, durationDays, analysisConfig]);

  // Current temporal data point at activeHour
  const currentPoint = useMemo(() => {
    const series = missionAnalysis.timeSeries;
    const clamped = Math.min(Math.max(0, activeHour), series.length - 1);
    return series[clamped] || series[0];
  }, [missionAnalysis, activeHour]);

  // Synchronized simulation epoch & astronomical sky positions
  const currentEpoch = useMemo(() => {
    const baseEpoch = new Date(startDate).getTime();
    return baseEpoch + activeHour * 3600 * 1000;
  }, [startDate, activeHour]);

  const observation = useMemo(() => {
    return astronomicalService.calculateSkyPositions(selectedSite, currentEpoch);
  }, [selectedSite, currentEpoch]);

  // Animated mission playback loop: advances activeHour smoothly across totalHours
  useEffect(() => {
    if (!isPlaying || !hasSiteBeenSelected) return;
    const totalHours = durationDays * 24;
    const intervalMs = Math.max(40, Math.round(1000 / playbackSpeed));
    const timer = setInterval(() => {
      setActiveHour(activeHour >= totalHours ? 0 : activeHour + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, hasSiteBeenSelected, durationDays, activeHour, setActiveHour]);

  const handleStepHour = (deltaHours: number) => {
    const totalHours = durationDays * 24;
    setActiveHour(Math.min(totalHours, Math.max(0, activeHour + deltaHours)));
  };

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  // Hover handlers for smooth panel appearance without flicker
  const handleHoverSite = (site: LunarSite | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (site) {
      setHoveredSite(site);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredSite(null);
      }, 180);
    }
  };

  const handlePanelMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handlePanelMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSite(null);
    }, 150);
  };

  // 1. Highlight site from search bar on global Moon (keeps global view)
  const handleHighlightSiteFromSearch = (site: LunarSite) => {
    setSelectedSite(site);
    setHighlightedSite(site);
    setHoveredSite(site);
    setIsSiteFocused(true);
    setActiveMode('global');
  };

  // 2. Explore site: Opens connected Mission Workspace in 3D Local Terrain mode
  const handleExploreSite = (site: LunarSite) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredSite(null);
    setActiveSiteScreenData(null);
    setSelectedSite(site);
    setHighlightedSite(site);
    setHasSiteBeenSelected(true);
    setIsSiteFocused(true);
    setActiveMode('terrain'); // Enters 3D Local Terrain!
    setActiveHour(0);
  };

  // 3. Clear highlight: Clears search selection and returns camera to default framing
  const handleClearHighlight = () => {
    setHighlightedSite(null);
    setHoveredSite(null);
    setActiveSiteScreenData(null);
    setIsSiteFocused(false);
    setResetTrigger((prev) => prev + 1);
  };

  // 4. Deselect site and return to pristine Global 3D Moon
  const handleDeselectAndReturnToGlobal = () => {
    setHasSiteBeenSelected(false);
    setIsSiteFocused(false);
    setActiveMode('global');
    setHoveredSite(null);
    setHighlightedSite(null);
    setActiveSiteScreenData(null);
    setIsPlaying(false);
    setResetTrigger((prev) => prev + 1);
  };

  // 5. Update scenario from Configure modal
  const handleUpdateScenario = (params: {
    startDate: string;
    durationDays: number;
    config: Partial<AnalysisConfiguration>;
  }) => {
    setStartDate(params.startDate);
    setDurationDays(params.durationDays);
    setAnalysisConfig(params.config);
    setActiveHour(0);
  };

  return (
    <div className="w-screen h-screen relative bg-[#04060B] overflow-hidden select-none">
      <Suspense
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono font-bold tracking-wider">
              STREAMING NASA 3D ENVIRONMENT…
            </span>
          </div>
        }
      >
        {/* Mode 1: Global Moon View */}
        {activeMode === 'global' && (
          <Canvas camera={{ position: [5.48, -3.90, -0.97], fov: 42 }} style={{ background: '#04060B' }} shadows>
            <Stars radius={80} depth={50} count={3500} factor={4} saturation={0} fade speed={0.2} />
            <NasaMoonGlobe
              mode="orbital"
              sunDate={startDate}
              selectedSite={hasSiteBeenSelected ? (highlightedSite || selectedSite) : null}
              activeSite={hoveredSite || (isSiteFocused ? (highlightedSite || selectedSite) : null)}
              onActiveSiteScreenPos={setActiveSiteScreenData}
              onSelectSite={handleExploreSite}
              onHoverSite={handleHoverSite}
              autoRotate={!isSiteFocused && !hoveredSite}
              displacementScale={0.1}
              isFocused={isSiteFocused}
              resetTrigger={resetTrigger}
            />
          </Canvas>
        )}

        {/* Mode 2: Local 3D Terrain View (LOLA DEM 16 px/° with grazing solar illumination) */}
        {activeMode === 'terrain' && (
          <Canvas camera={{ position: [0, 8, 22], fov: 50 }} style={{ background: '#04060B' }} shadows>
            <Stars radius={80} depth={50} count={3500} factor={4} saturation={0} fade speed={0.2} />
            <NasaMoonGlobe
              mode="surface"
              selectedSite={selectedSite}
              onSelectSite={handleExploreSite}
              autoRotate={false}
              displacementScale={0.1}
              isFocused={isSiteFocused}
            />
          </Canvas>
        )}

        {/* Mode 3: Celestial Horizon View with Animated Sun & Earth Sky Movement */}
        {activeMode === 'horizon' && (
          <Canvas
            camera={{ position: [2.8, 1.6, 3.2], fov: 72 }}
            style={{ background: '#04060B' }}
            shadows
          >
            <ImmersiveLunarSky
              site={selectedSite}
              sun={observation.sun}
              earth={observation.earth}
              viewMode="ground"
              showHud={false}
            />
          </Canvas>
        )}
      </Suspense>

      {/* ================================================================== */}
      {/* 1. INITIAL LANDING SCREEN (Explore & Select)                       */}
      {/* ================================================================== */}
      {!hasSiteBeenSelected && (
        <>
          {/* ASTRA Brand Logo (Top-Left) */}
          <div className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#04060B]/85 backdrop-blur-xl border border-white/20 shadow-2xl select-none ring-1 ring-white/10">
            <div className="h-6 w-20 overflow-hidden flex items-center justify-center">
              <img
                src="/assets/brand/astra-logo-clean.webp"
                alt="ASTRA"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Dribbble Google Moon Style Transparent Right Overview Panel & Connecting Line */}
          <RightSiteOverviewPanel
            activeData={activeSiteScreenData}
            onExploreSite={handleExploreSite}
            onPointerEnterPanel={handlePanelMouseEnter}
            onPointerLeavePanel={handlePanelMouseLeave}
          />

          {/* Minimal Top-Right Collapsible Search & Coordinate Navigator */}
          <MoonSearchNavigator
            onHighlightSite={handleHighlightSiteFromSearch}
            onExploreSite={handleExploreSite}
            onClearHighlight={handleClearHighlight}
            highlightedSite={highlightedSite}
          />

          {/* Discreet Essential Camera Controls (Reset View & Fullscreen) */}
          <EssentialCameraControls onResetView={handleResetView} />

          {/* Subtle Hint on Initial View */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-xs">
            <MapPin size={13} className="text-[#38BDF8]" />
            <span>Click on any candidate landing site on the Moon to enter mission workspace</span>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* 2. CONNECTED MISSION WORKSPACE (Selected Site Active)              */}
      {/* ================================================================== */}
      {hasSiteBeenSelected && (
        <>
          {/* Unified Workspace Navigation Header (Minimal, No cluttered view icons) */}
          <WorkspaceHeader
            site={selectedSite}
            onReturnToGlobal={handleDeselectAndReturnToGlobal}
            onOpenConfigure={() => setIsConfigureOpen(true)}
            onOpenCompare={() => setIsCompareOpen(true)}
          />

          {/* Restored Miniature 3D Square Viewport Switchers (Bottom-Left) */}
          <MiniThumbnailPreviews
            selectedSite={selectedSite}
            activeMode={activeMode}
            onSelectMode={setActiveMode}
            sun={observation.sun}
            earth={observation.earth}
          />

          {/* Retractable Real-Time Telemetry HUD */}
          <TelemetryHud
            analysis={missionAnalysis}
            currentPoint={currentPoint}
          />

          {/* Collapsible Interactive Mission Timeline Bar & Gantt Sequencer */}
          <MissionTimelineBar
            analysis={missionAnalysis}
            activeHour={activeHour}
            onSeekHour={setActiveHour}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
            onStepHour={handleStepHour}
            startDateIso={startDate}
          />

          {/* Floating ASTRA Flight AI Copilot Bubble (Replaces static Understand) */}
          <AstraAiCopilot
            isOpen={isCopilotOpen}
            onToggle={() => setIsCopilotOpen(!isCopilotOpen)}
            site={selectedSite}
            analysis={missionAnalysis}
            startDate={startDate}
            durationDays={durationDays}
            config={analysisConfig}
          />

          {/* Discreet Camera Controls (docked above AI Copilot bubble) */}
          <EssentialCameraControls
            onResetView={handleResetView}
            className="fixed bottom-20 right-6 z-30 flex flex-col items-center gap-1 bg-[#FFFFFF]/95 backdrop-blur-xl border border-[#E2E8F0] p-1 rounded-2xl shadow-xl text-[#0F172A] select-none pointer-events-auto"
          />
        </>
      )}

      {/* ================================================================== */}
      {/* 3. WORKFLOW MODALS                                                 */}
      {/* ================================================================== */}
      {/* Configure Modal: Date, Duration, Interval, LOLA Mask, JSON Contract */}
      <ConfigureModal
        isOpen={isConfigureOpen}
        onClose={() => setIsConfigureOpen(false)}
        site={selectedSite}
        startDate={startDate}
        durationDays={durationDays}
        config={analysisConfig}
        onUpdateScenario={handleUpdateScenario}
        currentAnalysis={missionAnalysis}
      />

      {/* Immersive Multi-Site Aerospace Trade Matrix Cockpit */}
      <MultiSiteCompareCockpit
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        selectedSite={selectedSite}
        startDate={startDate}
        durationDays={durationDays}
        config={analysisConfig}
        onSelectPrimarySite={(site) => {
          setSelectedSite(site);
          setActiveHour(0);
        }}
      />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Warm up NASA LOLA elevation service in the background
    lunarTerrainService.init().catch(console.error);
  }, []);

  // Step 1 Abstraction: Render pure Moon visualization without interface clutter
  if (SHOW_MOON_VISUALIZATION_ONLY) {
    return <MoonVisualizationFocus />;
  }

  // Full Application Interface Shell (Preserved for progressive reintroduction)
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FFFFFF] text-[#0F172A]">
        {/* Persistent Top Navigation Bar */}
        <Navbar />

        {/* Main Body Area: Persistent Sidebar + Content */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          <Sidebar />

          <main className="flex-1 min-w-0 h-full overflow-hidden relative">
            <Routes>
              <Route path="/" element={<MissionOverview />} />
              <Route path="/explorer" element={<SiteExplorer />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/comparison" element={<ScenarioComparison />} />
              <Route path="/timeline" element={<MissionTimeline />} />
              <Route path="/advisor" element={<AiAdvisor />} />
              <Route path="/data" element={<DataSources />} />
              <Route path="/settings" element={<Settings />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
