// ============================================================================
// Lunar Horizon — Global Mission Scenario & State Management (Zustand)
// Unified Mission Scenario Architecture:
// "One mission. Multiple candidate sites. An entire operational period."
// ============================================================================

import { create } from 'zustand';
import {
  LunarSite,
  MissionScenario,
  AnalysisConfiguration,
  MissionPriority,
  SiteMissionAnalysis,
} from '../types';
import { SITES } from '../data/sites';
import { missionAnalysisService } from '../services/missionAnalysisService';

export interface MissionStoreState {
  // --------------------------------------------------------------------------
  // 1. Mission Scenario State
  // --------------------------------------------------------------------------
  missionName: string;
  startDate: string; // ISO string e.g. "2026-11-20T12:00"
  durationDays: number; // e.g. 14 days
  activeHour: number; // T+hours within current mission [0, durationDays * 24]
  candidateSiteIds: string[]; // List of candidate landing sites
  selectedSite: LunarSite; // Primary inspected candidate site
  
  // Analysis parameters & priority
  analysisConfig: AnalysisConfiguration;
  missionPriority: MissionPriority;

  // Cached analyses for candidate sites under current scenario
  siteAnalyses: Record<string, SiteMissionAnalysis>;

  // --------------------------------------------------------------------------
  // 2. UI & Progressive Disclosure State
  // --------------------------------------------------------------------------
  activeWorkspaceLevel: 1 | 2 | 3; // 1 = Overview, 2 = Temporal, 3 = Scientific
  theme: 'light' | 'dark';
  dataMode: 'nasa-dem' | 'synthetic';
  isSidebarCollapsed: boolean;

  // --------------------------------------------------------------------------
  // 3. Backward Compatibility Aliases & Legacy Props
  // --------------------------------------------------------------------------
  selectedDate: string;
  simulationDurationHours: number;
  comparisonSiteIds: string[];

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  setMissionName: (name: string) => void;
  setStartDate: (date: string) => void;
  setSelectedDate: (date: string) => void;
  setDurationDays: (days: number) => void;
  setSimulationDurationHours: (hours: number) => void;
  setActiveHour: (hour: number) => void;
  setSelectedSite: (site: LunarSite) => void;
  toggleCandidateSite: (siteId: string) => void;
  setCandidateSiteIds: (siteIds: string[]) => void;
  setComparisonSiteIds: (siteIds: string[]) => void;
  toggleComparisonSite: (siteId: string) => void;
  setMissionPriority: (priority: MissionPriority) => void;
  setAnalysisConfig: (config: Partial<AnalysisConfiguration>) => void;
  setActiveWorkspaceLevel: (level: 1 | 2 | 3) => void;
  recomputeAnalyses: () => void;
  getSiteAnalysis: (siteId: string) => SiteMissionAnalysis;
  setDataMode: (mode: 'nasa-dem' | 'synthetic') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const DEFAULT_START_DATE = '2026-11-20T12:00';
const DEFAULT_DURATION_DAYS = 14;
const DEFAULT_CANDIDATE_IDS = ['malapert-massif', 'shackleton-connecting-ridge', 'nobile-rim-1'];

const DEFAULT_CONFIG: AnalysisConfiguration = {
  samplingIntervalHours: 1,
  terrainAware: true,
  priority: 'balanced',
  solarElevationCutoffDeg: 0,
  earthElevationCutoffDeg: 0,
};

function computeAnalysesForSites(
  siteIds: string[],
  startDate: string,
  durationDays: number,
  config: AnalysisConfiguration
): Record<string, SiteMissionAnalysis> {
  const result: Record<string, SiteMissionAnalysis> = {};
  for (const id of siteIds) {
    const site = SITES.find((s) => s.id === id);
    if (site) {
      result[id] = missionAnalysisService.analyzeSiteMission(site, {
        startDate,
        durationDays,
        config,
      });
    }
  }
  return result;
}

export const useMissionStore = create<MissionStoreState>((set, get) => {
  const initialAnalyses = computeAnalysesForSites(
    DEFAULT_CANDIDATE_IDS,
    DEFAULT_START_DATE,
    DEFAULT_DURATION_DAYS,
    DEFAULT_CONFIG
  );

  const initialSelectedSite = SITES.find((s) => s.id === 'malapert-massif') || SITES[0];

  return {
    missionName: 'CLPS Mission Nova-C / Artemis Polar Recon',
    startDate: DEFAULT_START_DATE,
    durationDays: DEFAULT_DURATION_DAYS,
    activeHour: 0,
    candidateSiteIds: DEFAULT_CANDIDATE_IDS,
    selectedSite: initialSelectedSite,
    analysisConfig: DEFAULT_CONFIG,
    missionPriority: 'balanced',
    siteAnalyses: initialAnalyses,

    activeWorkspaceLevel: 1,
    theme: 'light',
    dataMode: 'nasa-dem',
    isSidebarCollapsed: false,

    // Legacy aliases
    selectedDate: DEFAULT_START_DATE,
    simulationDurationHours: DEFAULT_DURATION_DAYS * 24,
    comparisonSiteIds: DEFAULT_CANDIDATE_IDS,

    setMissionName: (name) => set({ missionName: name }),

    setStartDate: (date) => {
      const { candidateSiteIds, durationDays, analysisConfig } = get();
      const updatedAnalyses = computeAnalysesForSites(
        candidateSiteIds,
        date,
        durationDays,
        analysisConfig
      );
      set({
        startDate: date,
        selectedDate: date,
        activeHour: 0,
        siteAnalyses: updatedAnalyses,
      });
    },

    setSelectedDate: (date) => get().setStartDate(date),

    setDurationDays: (days) => {
      const clampedDays = Math.max(1, Math.min(60, days));
      const { candidateSiteIds, startDate, analysisConfig } = get();
      const updatedAnalyses = computeAnalysesForSites(
        candidateSiteIds,
        startDate,
        clampedDays,
        analysisConfig
      );
      set({
        durationDays: clampedDays,
        simulationDurationHours: clampedDays * 24,
        siteAnalyses: updatedAnalyses,
      });
    },

    setSimulationDurationHours: (hours) => {
      get().setDurationDays(Math.max(1, Math.round(hours / 24)));
    },

    setActiveHour: (hour) => {
      const maxHour = get().durationDays * 24;
      set({ activeHour: Math.max(0, Math.min(maxHour, hour)) });
    },

    setSelectedSite: (site) => {
      set((state) => {
        // If the selected site is not in candidate list, add it
        const exists = state.candidateSiteIds.includes(site.id);
        const newCandidateIds = exists ? state.candidateSiteIds : [...state.candidateSiteIds, site.id];
        
        let newAnalyses = state.siteAnalyses;
        if (!state.siteAnalyses[site.id]) {
          newAnalyses = {
            ...state.siteAnalyses,
            [site.id]: missionAnalysisService.analyzeSiteMission(site, {
              startDate: state.startDate,
              durationDays: state.durationDays,
              config: state.analysisConfig,
            }),
          };
        }

        return {
          selectedSite: site,
          candidateSiteIds: newCandidateIds,
          comparisonSiteIds: newCandidateIds,
          siteAnalyses: newAnalyses,
        };
      });
    },

    toggleCandidateSite: (siteId) => {
      const { candidateSiteIds, startDate, durationDays, analysisConfig, siteAnalyses } = get();
      const exists = candidateSiteIds.includes(siteId);

      if (exists) {
        if (candidateSiteIds.length <= 1) return; // Keep at least one site
        const updated = candidateSiteIds.filter((id) => id !== siteId);
        set({
          candidateSiteIds: updated,
          comparisonSiteIds: updated,
        });
      } else {
        if (candidateSiteIds.length >= 6) return; // Limit max 6 candidates
        const updated = [...candidateSiteIds, siteId];
        const site = SITES.find((s) => s.id === siteId);
        let updatedAnalyses = siteAnalyses;
        if (site && !siteAnalyses[siteId]) {
          updatedAnalyses = {
            ...siteAnalyses,
            [siteId]: missionAnalysisService.analyzeSiteMission(site, {
              startDate,
              durationDays,
              config: analysisConfig,
            }),
          };
        }
        set({
          candidateSiteIds: updated,
          comparisonSiteIds: updated,
          siteAnalyses: updatedAnalyses,
        });
      }
    },

    setCandidateSiteIds: (siteIds) => {
      const { startDate, durationDays, analysisConfig } = get();
      const updatedAnalyses = computeAnalysesForSites(siteIds, startDate, durationDays, analysisConfig);
      set({
        candidateSiteIds: siteIds,
        comparisonSiteIds: siteIds,
        siteAnalyses: updatedAnalyses,
      });
    },

    toggleComparisonSite: (siteId) => get().toggleCandidateSite(siteId),
    setComparisonSiteIds: (siteIds) => get().setCandidateSiteIds(siteIds),

    setMissionPriority: (priority) => {
      set((state) => ({
        missionPriority: priority,
        analysisConfig: { ...state.analysisConfig, priority },
      }));
    },

    setAnalysisConfig: (partial) => {
      const { candidateSiteIds, startDate, durationDays, analysisConfig } = get();
      const mergedConfig = { ...analysisConfig, ...partial };
      const updatedAnalyses = computeAnalysesForSites(candidateSiteIds, startDate, durationDays, mergedConfig);
      set({
        analysisConfig: mergedConfig,
        siteAnalyses: updatedAnalyses,
      });
    },

    setActiveWorkspaceLevel: (level) => set({ activeWorkspaceLevel: level }),

    recomputeAnalyses: () => {
      const { candidateSiteIds, startDate, durationDays, analysisConfig } = get();
      const updatedAnalyses = computeAnalysesForSites(candidateSiteIds, startDate, durationDays, analysisConfig);
      set({ siteAnalyses: updatedAnalyses });
    },

    getSiteAnalysis: (siteId) => {
      const { siteAnalyses, startDate, durationDays, analysisConfig } = get();
      if (siteAnalyses[siteId]) {
        return siteAnalyses[siteId];
      }
      const site = SITES.find((s) => s.id === siteId);
      if (!site) {
        throw new Error(`Site ${siteId} not found in catalog`);
      }
      const computed = missionAnalysisService.analyzeSiteMission(site, {
        startDate,
        durationDays,
        config: analysisConfig,
      });
      set((state) => ({
        siteAnalyses: { ...state.siteAnalyses, [siteId]: computed },
      }));
      return computed;
    },

    setDataMode: (mode) => set({ dataMode: mode }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  };
});
