// ============================================================================
// Lunar Horizon — 3D Site Explorer (100% Immersive NASA Topography & Educational Dossier)
// Real LROC 8K/4K Texture & NASA LOLA 16-bit DEM Surface Displacements
// Pure White Primary Interface (#FFFFFF) with solid Black Buttons (#000000)
// High-pedagogy interactive dossier on site selection
// ============================================================================

import React, { useState, useMemo, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  Compass,
  RotateCcw,
  Eye,
  Mountain,
  Globe2,
  Sliders,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X,
  Layers,
  ChevronRight,
  Info,
  Sun,
  Globe,
  Radio,
  BatteryCharging,
  Thermometer,
  Droplets,
  Rocket,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useMissionStore } from '../stores/useMissionStore';
import { SITES, CATEGORIES, getSitesByCategory, formatCoordinates } from '../data/sites';
import type { LunarSite, SiteCategory } from '../types';
import { getMissionMetrics } from '../data/solar-data';
import { formatDegrees, formatElevation, formatPercent } from '../utils/formatters';
import NasaMoonGlobe from '../components/three/NasaMoonGlobe';
import { lunarTerrainService } from '../services/lunarTerrainService';
import { computeCustomSite } from '../services/engineData';

type EduTab = 'overview' | 'sun' | 'earth' | 'ice' | 'missions';

export default function SiteExplorer() {
  const navigate = useNavigate();
  const { selectedSite, setSelectedSite, selectedDate } = useMissionStore();

  const [categoryFilter, setCategoryFilter] = useState<SiteCategory | 'all'>('all');
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [search, setSearch] = useState('');
  const [explorationMode, setExplorationMode] = useState<'orbital' | 'surface'>('orbital');
  const [autoRotate, setAutoRotate] = useState(false);
  const [dispScale, setDispScale] = useState(0.1); // default visible relief
  const [siteElevation, setSiteElevation] = useState<number | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [activeEduTab, setActiveEduTab] = useState<EduTab>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const metrics = useMemo(
    () => getMissionMetrics(selectedDate, selectedSite),
    [selectedDate, selectedSite]
  );

  const handleElevationChange = useCallback((elevMeters: number) => {
    setSiteElevation(elevMeters);
  }, []);

  // When a site is selected, open educational dossier and center
  const handleSelectSite = useCallback(
    (site: LunarSite) => {
      setSelectedSite(site);
      setIsDossierOpen(true);
    },
    [setSelectedSite]
  );

  const filteredSites = useMemo(() => {
    let sites = categoryFilter === 'all' ? SITES : getSitesByCategory(categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      sites = sites.filter(
        (s) => s.name.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)
      );
    }
    return sites;
  }, [categoryFilter, search]);

  const handleCustomCoords = async () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      const realElev = lunarTerrainService.getElevation(lat, lon);
      const customSite: LunarSite = {
        id: `custom-${Date.now()}`,
        name: 'Custom Target Coordinate',
        subtitle: formatCoordinates(lat, lon),
        lat,
        lon,
        elevation: realElev,
        category: 'scientific',
        status: 'poi',
        significance: 'Coordonnée échantillonnée par l’utilisateur',
        simpleSummary:
          'Emplacement mesuré à l’altimètre laser de la NASA (LOLA DEM) avec calcul automatique d’altitude et de courbure.',
        description: `Custom landing coordinate. Real NASA LOLA elevation: ${realElev.toFixed(0)} meters (${(
          realElev / 1000
        ).toFixed(2)} km above lunar datum).`,
      };
      // Validated engine results for this point (whole precomputed year) when the engine API is available
      const res = await computeCustomSite(customSite);
      if (!res.ok) customSite.description += ' (Engine API not used: ' + res.reason.replace(/\.$/, '') + '. Values are a browser estimate, not validated.)';
      handleSelectSite(customSite);
      setCustomLat('');
      setCustomLon('');
    }
  };

  return (
    <div
      className={`w-full h-full relative overflow-hidden bg-[#04060B] text-white flex flex-col select-none ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
      }`}
    >
      {/* ================================================================== */}
      {/* 1. FLOATING TOP HUD BAR (Blanc Principal & Boutons Noirs)           */}
      {/* ================================================================== */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Active Site Info Badge (Fond Blanc) */}
        <div
          onClick={() => setIsDossierOpen(!isDossierOpen)}
          className="flex items-center gap-2.5 bg-[#FFFFFF]/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-[#E2E8F0] shadow-xl pointer-events-auto text-[#0F172A] cursor-pointer hover:bg-white transition-all"
          title="Click to toggle educational dossier"
        >
          <div className="w-7 h-7 rounded-xl bg-[#000000] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Compass size={14} className="text-[#38BDF8]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-extrabold text-[#0F172A] leading-none">
                {selectedSite.name}
              </span>
              <span className="bg-[#000000] text-white px-1.5 py-0.2 rounded font-mono text-[9px] font-bold">
                {siteElevation !== null
                  ? `LOLA ${siteElevation > 0 ? '+' : ''}${siteElevation.toFixed(0)} m`
                  : 'LOLA'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#64748B] block mt-0.5">
              {formatCoordinates(selectedSite.lat, selectedSite.lon, 1)} · {selectedSite.category.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher (Orbital Globe vs Ground Surface) */}
        <div className="flex items-center gap-1 bg-[#FFFFFF]/95 backdrop-blur-md p-1 rounded-2xl border border-[#E2E8F0] shadow-xl pointer-events-auto">
          <button
            onClick={() => setExplorationMode('orbital')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              explorationMode === 'orbital'
                ? 'bg-[#000000] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <Globe2 size={13} />
            <span>Orbital Globe</span>
          </button>
          <button
            onClick={() => setExplorationMode('surface')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              explorationMode === 'surface'
                ? 'bg-[#000000] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <Mountain size={13} />
            <span>Surface Mesh</span>
          </button>
        </div>

        {/* Right: Controls, Educational Toggle & Catalog */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#FFFFFF]/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-[#E2E8F0] shadow-xl text-[#0F172A]">
          {explorationMode === 'orbital' && (
            <>
              {/* Auto-rotate button */}
              <button
                className={`px-2.5 py-1 rounded-xl text-[10.5px] font-bold transition-all flex items-center gap-1 ${
                  autoRotate
                    ? 'bg-[#000000] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
                }`}
                onClick={() => setAutoRotate(!autoRotate)}
                title="Toggle continuous planetary spin"
              >
                {autoRotate ? <Pause size={11} /> : <Play size={11} />}
                <span className="hidden sm:inline">Spin</span>
              </button>

              <div className="hidden sm:block w-px h-5 bg-[#E2E8F0]" />

              {/* Relief Multipliers */}
              <span className="hidden sm:inline text-[9.5px] text-[#64748B] font-bold">Relief:</span>
              {[
                { label: '1×', val: 0.05 },
                { label: '2×', val: 0.1 },
                { label: '4×', val: 0.2 },
              ].map((r) => (
                <button
                  key={r.label}
                  className={`px-1.5 py-0.5 rounded-lg text-[9.5px] font-mono font-bold transition-all ${
                    dispScale === r.val
                      ? 'bg-[#000000] text-white shadow-sm'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
                  }`}
                  onClick={() => setDispScale(r.val)}
                  title={`Surface elevation displacement: ${r.label}`}
                >
                  {r.label}
                </button>
              ))}

              <div className="w-px h-5 bg-[#E2E8F0]" />
            </>
          )}

          {/* Educational Dossier Button (Bouton Noir) */}
          <button
            onClick={() => setIsDossierOpen(!isDossierOpen)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              isDossierOpen
                ? 'bg-[#000000] text-white shadow-sm ring-2 ring-[#000000]/20'
                : 'bg-[#000000] text-white hover:bg-[#1E293B]'
            }`}
          >
            <BookOpen size={12} className="text-[#38BDF8]" />
            <span>Fiche Éducative</span>
          </button>

          {/* Toggle Target Catalog Drawer */}
          <button
            onClick={() => setIsCatalogOpen(!isCatalogOpen)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              isCatalogOpen
                ? 'bg-[#000000] text-white shadow-sm ring-2 ring-[#000000]/20'
                : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] border border-[#CBD5E1]'
            }`}
          >
            <Sliders size={12} />
            <span>Sites ({SITES.length})</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-7 h-7 rounded-xl bg-[#000000] text-white flex items-center justify-center hover:bg-[#1E293B] shadow-sm transition-all hidden sm:flex shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* 2. 3D CANVAS — 100% FULL BLEED VIEWPORT (Lune 8K & Ciel Étoilé)     */}
      {/* ================================================================== */}
      <div className="flex-1 w-full h-full relative">
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono font-bold">STREAMING NASA MOON 8K & LOLA RELIEF…</span>
            </div>
          }
        >
          <Canvas camera={{ position: [0, 0, 4.6], fov: 42 }} style={{ background: '#04060B' }} shadows>
            {/* Deep space starfield */}
            <Stars radius={80} depth={50} count={3500} factor={4} saturation={0} fade speed={0.2} />

            <NasaMoonGlobe
              mode={explorationMode}
              selectedSite={selectedSite}
              onSelectSite={handleSelectSite}
              autoRotate={autoRotate}
              displacementScale={dispScale}
              onElevationChange={handleElevationChange}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* ================================================================== */}
      {/* 3. IMMERSIVE & HIGHLY EDUCATIONAL SITE DOSSIER (Overlay Cockpit)    */}
      {/* ================================================================== */}
      {isDossierOpen && (
        <div className="fixed sm:absolute top-16 right-3 bottom-16 w-[calc(100vw-24px)] sm:w-[480px] max-w-lg z-30 flex flex-col bg-[#FFFFFF]/98 backdrop-blur-xl border border-[#CBD5E1] rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transition-all animate-in fade-in slide-in-from-right duration-300 text-[#0F172A]">
          {/* Dossier Header */}
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#000000] text-white uppercase">
                  {selectedSite.category.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#64748B]">
                  LOLA Elevation: {formatElevation(selectedSite.elevation)}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] leading-tight">
                {selectedSite.name}
              </h2>
              <p className="text-[11px] font-mono text-[#475569] mt-0.5">
                {formatCoordinates(selectedSite.lat, selectedSite.lon, 2)} • {selectedSite.subtitle}
              </p>
            </div>

            <button
              onClick={() => setIsDossierOpen(false)}
              className="w-7 h-7 rounded-xl bg-[#000000] text-white flex items-center justify-center hover:bg-[#EF4444] shadow-sm transition-colors shrink-0"
              title="Fermer la fiche"
            >
              <X size={14} />
            </button>
          </div>

          {/* Educational Quick Highlight Banner */}
          <div className="px-5 py-3 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-2.5 shrink-0 text-[#92400E]">
            <Lightbulb size={16} className="text-[#D97706] shrink-0" />
            <div className="text-[11px] leading-snug">
              <span className="font-bold block">Pourquoi ce site est-il stratégique ?</span>
              <span>{selectedSite.significance || 'Zone d’intérêt géologique et opérationnel majeur pour l’exploration lunaire.'}</span>
            </div>
          </div>

          {/* Interactive Educational Tabs */}
          <div className="flex border-b border-[#E2E8F0] bg-[#FFFFFF] shrink-0 overflow-x-auto text-[11px] font-bold">
            <button
              onClick={() => setActiveEduTab('overview')}
              className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeEduTab === 'overview'
                  ? 'border-[#000000] text-[#000000] bg-[#F8FAFC]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <BookOpen size={13} />
              <span>Général</span>
            </button>
            <button
              onClick={() => setActiveEduTab('sun')}
              className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeEduTab === 'sun'
                  ? 'border-[#000000] text-[#000000] bg-[#F8FAFC]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Sun size={13} className="text-[#E8A838]" />
              <span>Soleil & Énergie</span>
            </button>
            <button
              onClick={() => setActiveEduTab('earth')}
              className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeEduTab === 'earth'
                  ? 'border-[#000000] text-[#000000] bg-[#F8FAFC]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Globe size={13} className="text-[#2563EB]" />
              <span>Liaison Terre</span>
            </button>
            <button
              onClick={() => setActiveEduTab('ice')}
              className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeEduTab === 'ice'
                  ? 'border-[#000000] text-[#000000] bg-[#F8FAFC]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Droplets size={13} className="text-[#0284C7]" />
              <span>Glace & Froid</span>
            </button>
            <button
              onClick={() => setActiveEduTab('missions')}
              className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeEduTab === 'missions'
                  ? 'border-[#000000] text-[#000000] bg-[#F8FAFC]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Rocket size={13} className="text-[#D97706]" />
              <span>Missions</span>
            </button>
          </div>

          {/* Educational Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[12px] leading-relaxed bg-[#FFFFFF]">
            {/* TAB 1: OVERVIEW */}
            {activeEduTab === 'overview' && (
              <div className="space-y-4">
                {/* Comprendre en toute simplicité */}
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Comprendre en toute simplicité (Pour tous)
                  </span>
                  <p className="text-[12.5px] font-medium text-[#0F172A] leading-relaxed">
                    {selectedSite.simpleSummary || selectedSite.description}
                  </p>
                </div>

                {/* Description scientifique NASA */}
                <div className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Contexte Scientifique & Topographie LOLA
                  </span>
                  <p className="text-[#475569] leading-relaxed">
                    {selectedSite.description}
                  </p>
                </div>

                {/* Key Metrics Quick Pill Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[#64748B] text-[10px] font-bold block">Ensoleillement Moyen</span>
                    <span className="text-base font-black font-mono text-[#E8A838]">
                      {selectedSite.sunVisibilityPct ?? 80}%
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[#64748B] text-[10px] font-bold block">Contact Direct Terre</span>
                    <span className="text-base font-black font-mono text-[#2563EB]">
                      {selectedSite.earthVisibilityPct ?? 65}%
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[#64748B] text-[10px] font-bold block">Potentiel Glace d'Eau</span>
                    <span className="text-base font-black text-[#0284C7]">
                      {selectedSite.waterIcePotential ?? 'High'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <span className="text-[#64748B] text-[10px] font-bold block">Altitude LOLA</span>
                    <span className="text-base font-black font-mono text-[#0F172A]">
                      {formatElevation(selectedSite.elevation)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SUN & ENERGY */}
            {activeEduTab === 'sun' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#B45309]">
                    <Sun size={15} />
                    <span>Le phénomène du Soleil rasant polaire</span>
                  </div>
                  <p className="text-[12px] text-[#78350F] leading-relaxed">
                    Au pôle Sud de la Lune, le Soleil ne monte jamais haut dans le ciel. En été polaire, son élévation maximale ne dépasse pas <strong>{selectedSite.maxSolarElevation ?? 2.0}°</strong> au-dessus de l’horizon !
                  </p>
                  <p className="text-[11.5px] text-[#92400E]">
                    Le Soleil semble effectuer un tour complet d’horizon en 29.5 jours (le mois lunaire) au ras des crêtes de montagnes.
                  </p>
                </div>

                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2">
                  <h4 className="font-bold text-[#0F172A]">Pourquoi ce site est-il un « Pic de Lumière » ?</h4>
                  <p className="text-[#475569]">
                    Grâce à son altitude élevée ({formatElevation(selectedSite.elevation)}), ce site émerge au-dessus des remparts voisins et capte le soleil pendant <strong>{selectedSite.sunVisibilityPct ?? 85}% du temps</strong>.
                  </p>
                </div>

                <div className="p-4 bg-[#FFFFFF] border-l-4 border-[#000000] border-y border-r border-[#E2E8F0] rounded-r-2xl space-y-1">
                  <span className="font-bold text-[#0F172A] block">Défi d'ingénierie spatiale :</span>
                  <p className="text-[#475569]">
                    Sur Terre, les panneaux solaires sont inclinés vers le ciel. Ici, les rayons arrivent à l’horizontale : les atterrisseurs doivent déployer des <strong>panneaux solaires verticaux</strong> pour capter l’énergie !
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: EARTH & COMMUNICATIONS */}
            {activeEduTab === 'earth' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E40AF]">
                    <Globe size={15} />
                    <span>La Terre vue depuis la surface lunaire</span>
                  </div>
                  <p className="text-[12px] text-[#1E3A8A] leading-relaxed">
                    Depuis {selectedSite.name}, la Terre est visible <strong>{selectedSite.earthVisibilityPct ?? 70}% du temps</strong> à une élévation d’environ <strong>{selectedSite.maxEarthElevation ?? 6.0}°</strong>.
                  </p>
                </div>

                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2">
                  <h4 className="font-bold text-[#0F172A]">Le phénomène fascinant de la Libration</h4>
                  <p className="text-[#475569]">
                    La Lune montre toujours la même face à la Terre en raison de son verrouillage gravitationnel. Mais son orbite légèrement elliptique la fait « osciller » de <strong>±7.9° en longitude</strong> et <strong>±6.7° en latitude</strong>.
                  </p>
                  <p className="text-[#475569]">
                    Pour un observateur sur ce site polaire, la Terre semble effectuer une lente danse en forme de boucle, montant et descendant juste au-dessus des montagnes !
                  </p>
                </div>

                <div className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl space-y-1">
                  <span className="font-bold text-[#0F172A] block">Avantage pour les communications :</span>
                  <p className="text-[#475569]">
                    Tant que la ligne de vue vers la Terre est dégagée, les astronautes peuvent communiquer <strong>directement avec le Deep Space Network (DSN)</strong> de la NASA sans avoir besoin d'attendre un satellite relais.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: WATER ICE & COLD TRAPS */}
            {activeEduTab === 'ice' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F0F9FF] border border-[#BAE6FD] rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#0369A1]">
                    <Droplets size={15} />
                    <span>L'eau glacée : Le trésor du pôle Sud</span>
                  </div>
                  <p className="text-[12px] text-[#0C4A6E] leading-relaxed">
                    Potentiel en glace d’eau estimé : <strong>{selectedSite.waterIcePotential ?? 'High'}</strong>.
                  </p>
                  <p className="text-[11.5px] text-[#075985]">
                    Dans les cratères profonds bordant ce site, le fond est plongé dans une nuit éternelle (Permanently Shadowed Regions ou PSR). Les températures y descendent jusqu'à <strong>40 Kelvin (-233°C)</strong>, plus froid que la surface de Pluton !
                  </p>
                </div>

                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2">
                  <h4 className="font-bold text-[#0F172A]">Pourquoi cette glace est-elle cruciale pour l'Humanité ?</h4>
                  <ul className="space-y-1.5 list-disc list-inside text-[#475569]">
                    <li><strong>Eau potable et oxygène :</strong> pour abriter les futures bases de vie des astronautes.</li>
                    <li><strong>Carburant pour fusées (Hydrogène liquide / Oxygène liquide) :</strong> en cassant la molécule d'eau par électrolyse solaire, la Lune devient la station-service de l'espace pour voyager vers Mars !</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 5: MISSIONS & EXPLORATION */}
            {activeEduTab === 'missions' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                    <Rocket size={15} />
                    <span>Mission de référence</span>
                  </div>
                  <p className="text-sm font-extrabold text-[#0F172A]">
                    {selectedSite.primaryMission || 'Programme NASA Artemis / CLPS'}
                  </p>
                  <p className="text-[#64748B]">
                    Date prévisionnelle ou historique : <strong>{selectedSite.targetDate || '2026+'}</strong>
                  </p>
                </div>

                <div className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl space-y-2">
                  <h4 className="font-bold text-[#0F172A]">Critères d'atterrissage sécurisé</h4>
                  <p className="text-[#475569]">
                    Pour poser un module lunaire sans risque de basculement, la NASA exige des pentes de terrain inférieures à <strong>8° à 10°</strong> et une absence de rochers massifs dans la zone d'élution du moteur.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dossier Footer Action Bar */}
          <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center gap-2 shrink-0">
            {/* Action 1: Jump to 3D Simulator */}
            <button
              onClick={() => navigate('/simulator')}
              className="flex-1 bg-[#000000] text-white hover:bg-[#1E293B] text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Compass size={13} className="text-[#38BDF8]" />
              <span>Simulateur 360° du Ciel</span>
            </button>

            {/* Action 2: Jump to Mission Workspace */}
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-[#FFFFFF] border border-[#CBD5E1] text-[#0F172A] hover:bg-[#000000] hover:text-white text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Layers size={13} />
              <span>Analyse 14 Jours</span>
            </button>

            {/* Action 3: Surface Mode */}
            {explorationMode === 'orbital' && (
              <button
                onClick={() => setExplorationMode('surface')}
                className="bg-[#000000] text-white hover:bg-[#1E293B] text-[11px] font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                title="Descendre sur le relief 3D"
              >
                <Mountain size={13} className="text-[#38BDF8]" />
                <span className="hidden sm:inline">Terrain 3D</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. FLOATING SLIDE-OUT TARGET CATALOG DRAWER (Fond Blanc)           */}
      {/* ================================================================== */}
      {isCatalogOpen && (
        <div className="fixed sm:absolute top-16 left-3 bottom-20 w-[calc(100vw-24px)] sm:w-[380px] max-w-sm z-30 flex flex-col bg-[#FFFFFF]/98 backdrop-blur-md border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto transition-all animate-in fade-in slide-in-from-left duration-200 text-[#0F172A]">
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#000000] text-white flex items-center justify-center shadow-sm">
                <MapPin size={13} className="text-[#38BDF8]" />
              </div>
              <h3 className="text-xs font-extrabold text-[#0F172A]">Target Catalog & Sampler</h3>
            </div>
            <button
              onClick={() => setIsCatalogOpen(false)}
              className="w-7 h-7 rounded-xl bg-[#000000] text-white flex items-center justify-center hover:bg-[#1E293B] shadow-sm transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-[#E2E8F0] space-y-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-8 pr-3 py-1.5 text-[11.5px] text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#000000] transition-colors"
                placeholder="Search crater, massif, mission…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Badges */}
            <div className="flex flex-wrap gap-1">
              <button
                className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-[#000000] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                }`}
                onClick={() => setCategoryFilter('all')}
              >
                All ({SITES.length})
              </button>
              {(Object.entries(CATEGORIES) as [SiteCategory, (typeof CATEGORIES)['apollo']][]).map(
                ([key, cat]) => (
                  <button
                    key={key}
                    className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold transition-all flex items-center gap-1 ${
                      categoryFilter === key
                        ? 'bg-[#000000] text-white shadow-sm'
                        : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                    }`}
                    onClick={() => setCategoryFilter(key)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                    {cat.name.split(' ')[0]}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Site List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0 bg-[#FFFFFF]">
            {filteredSites.map((site) => {
              const isSel = site.id === selectedSite.id;
              const catColor = CATEGORIES[site.category]?.color || '#000000';
              return (
                <div
                  key={site.id}
                  onClick={() => handleSelectSite(site)}
                  className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSel
                      ? 'bg-[#000000] text-white border-[#000000] shadow-md'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: catColor }} />
                      <h4 className="text-[12px] font-extrabold">{site.name}</h4>
                    </div>
                    <span className={`font-mono text-[9px] ${isSel ? 'text-[#38BDF8]' : 'text-[#64748B]'}`}>
                      {formatCoordinates(site.lat, site.lon, 1)}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 line-clamp-1 ml-4 ${isSel ? 'text-slate-300' : 'text-[#64748B]'}`}>
                    {site.subtitle}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Custom Coordinates Sampler */}
          <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] block">
              Sample Custom Coordinate (NASA LOLA)
            </span>
            <div className="flex gap-1.5">
              <input
                className="w-1/2 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-2.5 py-1 text-[11px] text-[#0F172A] outline-none focus:border-[#000000]"
                placeholder="Lat (-90 to +90)"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
              />
              <input
                className="w-1/2 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-2.5 py-1 text-[11px] text-[#0F172A] outline-none focus:border-[#000000]"
                placeholder="Lon (-180 to +180)"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
              />
            </div>
            {/* Bouton Noir: Sample LOLA Elevation */}
            <button
              onClick={handleCustomCoords}
              className="w-full bg-[#000000] text-white hover:bg-[#1E293B] text-[11px] font-bold py-2 rounded-xl transition-all shadow-sm"
            >
              Sample LOLA Elevation
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 5. FLOATING BOTTOM TELEMETRY DOCK (Fond Blanc & Bouton Noir)        */}
      {/* ================================================================== */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF]/95 backdrop-blur-md px-4 sm:px-5 py-2.5 rounded-2xl border border-[#E2E8F0] shadow-xl pointer-events-auto text-[#0F172A]">
        {/* Left Telemetry Group */}
        <div className="flex items-center gap-3 sm:gap-5 text-[11px] sm:text-[11.5px] overflow-x-auto py-0.5">
          <div
            onClick={() => setIsDossierOpen(!isDossierOpen)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to view full educational dossier"
          >
            <span className="text-[8.5px] uppercase tracking-wider text-[#64748B] block font-bold flex items-center gap-1">
              <span>Target</span>
              <BookOpen size={10} className="text-[#38BDF8]" />
            </span>
            <span className="text-[#0F172A] font-extrabold whitespace-nowrap">{selectedSite.name}</span>
          </div>

          <div className="w-px h-6 bg-[#E2E8F0] shrink-0" />

          <div className="hidden sm:block">
            <span className="text-[8.5px] uppercase tracking-wider text-[#64748B] block font-bold">
              Coordinates
            </span>
            <span className="font-mono text-[#0F172A] font-bold whitespace-nowrap">
              {formatCoordinates(selectedSite.lat, selectedSite.lon)}
            </span>
          </div>

          <div className="hidden sm:block w-px h-6 bg-[#E2E8F0] shrink-0" />

          <div>
            <span className="text-[8.5px] uppercase tracking-wider text-[#64748B] block font-bold">
              LOLA Altitude
            </span>
            <span className="font-mono text-[#0F172A] font-extrabold whitespace-nowrap">
              {siteElevation !== null
                ? `${siteElevation > 0 ? '+' : ''}${siteElevation.toFixed(0)} m (${(
                    siteElevation / 1000
                  ).toFixed(2)} km)`
                : 'Sampling…'}
            </span>
          </div>

          <div className="w-px h-6 bg-[#E2E8F0] shrink-0" />

          <div>
            <span className="text-[8.5px] uppercase tracking-wider text-[#64748B] block font-bold">
              Solar Angle
            </span>
            <span className="font-mono text-[#0F172A] font-bold whitespace-nowrap">
              {formatDegrees(metrics.solarElevation)}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsDossierOpen(!isDossierOpen)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
              isDossierOpen
                ? 'bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1]'
                : 'bg-[#000000] text-white hover:bg-[#1E293B]'
            }`}
          >
            <BookOpen size={12} className={isDossierOpen ? 'text-[#0F172A]' : 'text-[#38BDF8]'} />
            <span>{isDossierOpen ? 'Masquer Fiche' : 'Fiche Éducative'}</span>
          </button>

          {explorationMode === 'orbital' ? (
            <button
              onClick={() => setExplorationMode('surface')}
              className="bg-[#000000] text-white hover:bg-[#1E293B] text-[11px] font-bold px-3.5 py-1.5 shadow-md flex items-center gap-1.5 rounded-xl transition-all"
            >
              <Eye size={13} className="text-[#38BDF8]" />
              <span>Descend to Surface</span>
            </button>
          ) : (
            <button
              onClick={() => setExplorationMode('orbital')}
              className="bg-[#000000] text-white hover:bg-[#1E293B] text-[11px] font-bold px-3.5 py-1.5 shadow-md flex items-center gap-1.5 rounded-xl transition-all"
            >
              <RotateCcw size={13} className="text-[#38BDF8]" />
              <span>Return to Orbit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
