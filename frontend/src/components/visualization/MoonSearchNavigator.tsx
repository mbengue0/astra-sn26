// ============================================================================
// Lunar Horizon — Moon Search & Coordinate Navigator
// Minimal, collapsible top-right search control:
// 1. Discreet candidate site search & access (Artemis, CLPS, Apollo, Intl)
// 2. Lunar coordinate navigator (Lat / Lon input with real LOLA DEM elevation)
// Follows ASTRA-SN design tokens: Pure White (#FFFFFF), Slate Borders (#E2E8F0)
// ============================================================================

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  Compass,
  X,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { LunarSite } from '../../types';
import { SITES, CATEGORIES, formatCoordinates } from '../../data/sites';
import { lunarTerrainService } from '../../services/lunarTerrainService';
import { computeCustomSite } from '../../services/engineData';
import { formatElevation } from '../../utils/formatters';

export interface MoonSearchNavigatorProps {
  onHighlightSite: (site: LunarSite) => void;
  onExploreSite: (site: LunarSite) => void;
  onClearHighlight?: () => void;
  highlightedSite?: LunarSite | null;
}

export default function MoonSearchNavigator({
  onHighlightSite,
  onExploreSite,
  onClearHighlight,
  highlightedSite,
}: MoonSearchNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'sites' | 'coordinates'>('sites');

  // Custom coordinate input states
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter predefined candidate sites based on query
  const filteredSites = useMemo(() => {
    if (!query.trim()) return SITES;
    const q = query.toLowerCase().trim();
    return SITES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.primaryMission && s.primaryMission.toLowerCase().includes(q))
    );
  }, [query]);

  // Check if current search query looks like comma-separated coordinates (e.g. "-89.9, 128.5")
  const parsedCoordsFromQuery = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed.includes(',') && !trimmed.includes(' ')) return null;
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
    return null;
  }, [query]);

  // Navigate to explicit coordinates
  const handleNavigateCoordinates = async (latVal?: number, lonVal?: number) => {
    const lat = latVal !== undefined ? latVal : parseFloat(customLat);
    const lon = lonVal !== undefined ? lonVal : parseFloat(customLon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCoordError('Latitude must be between -90° and +90°');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setCoordError('Longitude must be between -180° and +180°');
      return;
    }

    setCoordError(null);
    const elevation = lunarTerrainService.getElevation(lat, lon);

    const customSite: LunarSite = {
      id: `custom-${lat.toFixed(3)}_${lon.toFixed(3)}`,
      name: `Target (${lat >= 0 ? lat.toFixed(2) + '°N' : Math.abs(lat).toFixed(2) + '°S'}, ${
        lon >= 0 ? lon.toFixed(2) + '°E' : Math.abs(lon).toFixed(2) + '°W'
      })`,
      subtitle: 'Custom Lunar Coordinates',
      lat,
      lon,
      elevation,
      category: 'scientific',
      status: 'candidate',
      description: `Custom target coordinates sampled at ${formatCoordinates(lat, lon, 2)}. Real NASA LOLA DEM elevation: ${formatElevation(
        elevation
      )}.`,
    };

    // Validated engine results for this point (whole precomputed year) when the engine API is available
    setCoordError('Computing with the ASTRA-SN engine…');
    const res = await computeCustomSite(customSite);
    setCoordError(null);
    if (!res.ok) customSite.description += ' (Engine API not used: ' + res.reason.replace(/\.$/, '') + '. Values are a browser estimate, not validated.)';
    onHighlightSite(customSite);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-30 select-none">
      {/* 1. Minimal Top-Right Search Bar */}
      <div
        className={`flex items-center gap-2 bg-[#FFFFFF]/95 backdrop-blur-xl border border-[#E2E8F0] shadow-xl rounded-2xl transition-all duration-200 ${
          isOpen ? 'ring-2 ring-[#000000]/15 w-80 sm:w-96 px-3 py-2' : 'w-52 sm:w-64 px-3 py-1.5 hover:border-[#CBD5E1]'
        }`}
      >
        <Search size={14} className="text-[#64748B] shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (parsedCoordsFromQuery) {
                handleNavigateCoordinates(parsedCoordsFromQuery.lat, parsedCoordsFromQuery.lon);
              } else if (filteredSites.length > 0) {
                onHighlightSite(filteredSites[0]);
                setIsOpen(false);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={highlightedSite ? highlightedSite.name : "Search site or lat, lon..."}
          className="bg-transparent border-none outline-none text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] w-full min-w-0"
        />

        {/* Clear / Close Button */}
        {query || highlightedSite ? (
          <button
            onClick={() => {
              setQuery('');
              onClearHighlight?.();
              inputRef.current?.focus();
            }}
            className="text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded cursor-pointer"
            title="Clear search & selection"
          >
            <X size={13} />
          </button>
        ) : (
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setActiveTab(activeTab === 'coordinates' ? 'sites' : 'coordinates');
            }}
            className={`p-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'coordinates' && isOpen
                ? 'bg-[#000000] text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
            title="Custom coordinates input"
          >
            <SlidersHorizontal size={12} />
          </button>
        )}
      </div>

      {/* 2. Expandable Dropdown Drawer */}
      {isOpen && (
        <div className="mt-2 w-80 sm:w-96 rounded-2xl bg-[#FFFFFF]/98 backdrop-blur-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-[#0F172A]">
          {/* Featured Highlight Card when a site is focused on the Moon */}
          {highlightedSite && (
            <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-[#0F172A] uppercase">
                    Target Focused On Moon
                  </span>
                </div>
                <span className="bg-[#000000] text-white px-1.5 py-0.2 rounded font-mono text-[9px] font-bold">
                  {formatCoordinates(highlightedSite.lat, highlightedSite.lon, 1)}
                </span>
              </div>

              <div className="mt-1.5 text-xs font-extrabold text-[#0F172A] flex items-center justify-between">
                <span className="truncate">{highlightedSite.name}</span>
                <span className="text-[10px] font-mono text-[#64748B] ml-2 shrink-0">
                  LOLA {formatElevation(highlightedSite.elevation)}
                </span>
              </div>

              {/* Primary Action Button directly inside the search bar */}
              <div className="mt-2.5">
                <button
                  onClick={() => {
                    onExploreSite(highlightedSite);
                    setIsOpen(false);
                  }}
                  className="w-full bg-[#000000] text-white hover:bg-[#1E293B] py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer group"
                >
                  <span>Explore 3D Terrain</span>
                  <ArrowRight size={13} className="text-[#38BDF8] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="mt-1.5 text-[10px] text-[#64748B] text-center font-mono">
                or click directly on the marker pin on the Moon
              </div>
            </div>
          )}

          {/* Sub-Tabs: Sites List vs Explicit Coordinates */}
          <div className="flex items-center border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold">
            <button
              onClick={() => setActiveTab('sites')}
              className={`flex-1 py-2 text-center transition-all cursor-pointer ${
                activeTab === 'sites'
                  ? 'bg-white text-[#0F172A] border-b-2 border-[#000000]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Candidate Sites ({filteredSites.length})
            </button>
            <button
              onClick={() => setActiveTab('coordinates')}
              className={`flex-1 py-2 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'coordinates'
                  ? 'bg-white text-[#0F172A] border-b-2 border-[#000000]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Compass size={12} />
              <span>Custom Coordinates</span>
            </button>
          </div>

          {/* Quick coordinate recognition prompt if user typed coords in search input */}
          {parsedCoordsFromQuery && (
            <div
              onClick={() => handleNavigateCoordinates(parsedCoordsFromQuery.lat, parsedCoordsFromQuery.lon)}
              className="p-2.5 bg-[#F0FDF4] border-b border-[#DCFCE7] flex items-center justify-between cursor-pointer hover:bg-[#DCFCE7] transition-all text-xs"
            >
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-[#15803D]" />
                <span className="font-bold text-[#15803D]">
                  Navigate to {formatCoordinates(parsedCoordsFromQuery.lat, parsedCoordsFromQuery.lon, 2)}
                </span>
              </div>
              <ArrowRight size={13} className="text-[#15803D]" />
            </div>
          )}

          {/* TAB 1: PREDEFINED CANDIDATE SITES */}
          {activeTab === 'sites' && (
            <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9] p-1">
              {filteredSites.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#94A3B8]">
                  No candidate sites found matching "{query}"
                </div>
              ) : (
                filteredSites.map((site) => {
                  const category = CATEGORIES[site.category] || { label: site.category, color: '#000000' };
                  const isHighlighted = highlightedSite?.id === site.id;

                  return (
                    <div
                      key={site.id}
                      onClick={() => {
                        onHighlightSite(site);
                        setIsOpen(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                        isHighlighted
                          ? 'bg-[#F1F5F9] border-l-3 border-[#000000]'
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: category.color || '#000000' }}
                          />
                          <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#000000] truncate">
                            {site.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#64748B] mt-0.5 flex items-center gap-1.5">
                          <span>{formatCoordinates(site.lat, site.lon, 1)}</span>
                          <span className="text-[#CBD5E1]">·</span>
                          <span className="bg-[#F1F5F9] px-1 py-0.2 rounded text-[9px] font-semibold text-[#0F172A]">
                            LOLA {formatElevation(site.elevation)}
                          </span>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#000000] group-hover:text-white transition-all uppercase shrink-0">
                        {category.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: EXPLICIT CUSTOM COORDINATES INPUT */}
          {activeTab === 'coordinates' && (
            <div className="p-3.5 space-y-3">
              <div className="text-[11px] text-[#64748B] leading-relaxed">
                Enter lunar surface coordinates to sample the NASA LOLA DEM altimetry grid and inspect the 3D terrain:
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[#64748B] block mb-1">
                    Latitude (-90° to +90°)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="-90"
                    max="90"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="-89.78"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-mono font-bold text-[#0F172A] outline-none focus:border-[#000000] bg-[#F8FAFC]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-[#64748B] block mb-1">
                    Longitude (-180° to +180°)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="-180"
                    max="180"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    placeholder="128.50"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-mono font-bold text-[#0F172A] outline-none focus:border-[#000000] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              {coordError && (
                <div className="text-[10px] text-red-600 font-mono font-bold bg-red-50 p-1.5 rounded-lg border border-red-200">
                  {coordError}
                </div>
              )}

              <button
                onClick={() => handleNavigateCoordinates()}
                className="w-full bg-[#000000] text-white hover:bg-[#1E293B] py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Navigate & Highlight on Moon</span>
                <ArrowRight size={13} className="text-[#38BDF8]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
