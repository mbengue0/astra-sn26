// ============================================================================
// Lunar Horizon — Miniature 3D Viewport Previews (2 Views)
// Compact miniature 3D WebGL previews for the 2 ASTRA selected-site modes:
// 1. Local Terrain (LOLA DEM surface relief mesh & lander)
// 2. Celestial Horizon (Sun & Earth positions relative to local horizon)
// ============================================================================

import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { LunarSite } from '../../types';
import { lunarTerrainService, LocalTerrainData } from '../../services/lunarTerrainService';
import { astronomicalService, CelestialBodySkyState } from '../../services/astronomicalService';

THREE.Cache.enabled = true;

// ----------------------------------------------------------------------------
// 1. Mini Local Terrain Preview
// ----------------------------------------------------------------------------
function MiniTerrainCanvas({
  site,
  colorTexture,
}: {
  site: LunarSite;
  colorTexture: THREE.Texture | null;
}) {
  const [terrain, setTerrain] = useState<LocalTerrainData | null>(null);

  useEffect(() => {
    const data = lunarTerrainService.generateLocalTerrain(site.lat, site.lon, 40, 48);
    setTerrain(data);
  }, [site.lat, site.lon]);

  const geom = useMemo(() => {
    if (!terrain) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(terrain.positions, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(terrain.uvs, 2));
    g.setIndex(new THREE.BufferAttribute(terrain.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [terrain]);

  return (
    <Canvas
      camera={{ position: [0, 8, 20], fov: 48 }}
      gl={{ antialias: false, powerPreference: 'low-power' }}
      dpr={1}
      className="w-full h-full pointer-events-none"
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 16, 10]} intensity={2.6} />

      {/* Topographic LOLA surface */}
      {geom && (
        <mesh geometry={geom}>
          <meshStandardMaterial
            map={colorTexture || undefined}
            color={colorTexture ? '#FFFFFF' : '#475569'}
            roughness={0.95}
          />
        </mesh>
      )}

      {/* Miniature Lander asset */}
      <group position={[0, 0.2, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.45, 0.65, 0.35, 8]} />
          <meshStandardMaterial color="#EAB308" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
          <meshStandardMaterial color="#F1F5F9" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </Canvas>
  );
}

// ----------------------------------------------------------------------------
// 2. Mini Celestial Horizon Preview
// ----------------------------------------------------------------------------
function MiniHorizonCanvas({
  sun,
  earth,
}: {
  sun: CelestialBodySkyState;
  earth: CelestialBodySkyState;
}) {
  const skyRadius = 20;
  const sunPos = useMemo(
    () => astronomicalService.skyAnglesToVector3(sun.azimuthDeg, Math.max(-10, sun.elevationDeg), skyRadius),
    [sun.azimuthDeg, sun.elevationDeg]
  );
  const earthPos = useMemo(
    () => astronomicalService.skyAnglesToVector3(earth.azimuthDeg, Math.max(-10, earth.elevationDeg), skyRadius),
    [earth.azimuthDeg, earth.elevationDeg]
  );

  return (
    <Canvas
      camera={{ position: [2.8, 1.6, 3.2], fov: 68 }}
      gl={{ antialias: false, powerPreference: 'low-power' }}
      dpr={1}
      className="w-full h-full pointer-events-none"
    >
      <Stars radius={50} depth={30} count={900} factor={3} saturation={0} fade speed={0.1} />
      <ambientLight intensity={0.12} />
      <directionalLight position={sunPos} intensity={2.4} color="#FFF9EB" />

      {/* Ground Horizon disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[25, 32]} />
        <meshStandardMaterial color="#1E293B" roughness={0.95} />
      </mesh>

      {/* Sun sphere */}
      <mesh position={sunPos}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#FFDE59" />
      </mesh>

      {/* Earth sphere */}
      <mesh position={earthPos}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#38BDF8" roughness={0.4} />
      </mesh>
    </Canvas>
  );
}

// ----------------------------------------------------------------------------
// Main Component: 2 Compact Miniature Previews with comfortable spacing
// ----------------------------------------------------------------------------
export interface MiniThumbnailPreviewsProps {
  selectedSite: LunarSite;
  activeMode: 'global' | 'terrain' | 'horizon';
  onSelectMode: (mode: 'global' | 'terrain' | 'horizon') => void;
  sun: CelestialBodySkyState;
  earth: CelestialBodySkyState;
}

export default function MiniThumbnailPreviews({
  selectedSite,
  activeMode,
  onSelectMode,
  sun,
  earth,
}: MiniThumbnailPreviewsProps) {
  const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/assets/moon/lroc_color_2k.webp', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setColorTexture(tex);
    });
  }, []);

  const views: Array<{
    id: 'terrain' | 'horizon';
    title: string;
    subtitle: string;
    component: React.ReactNode;
  }> = [
    {
      id: 'terrain',
      title: 'Local Terrain',
      subtitle: 'Surface Relief',
      component: <MiniTerrainCanvas site={selectedSite} colorTexture={colorTexture} />,
    },
    {
      id: 'horizon',
      title: 'Celestial Horizon',
      subtitle: 'Sun & Earth',
      component: <MiniHorizonCanvas sun={sun} earth={earth} />,
    },
  ];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3.5 select-none pointer-events-auto"
    >
      {views.map((view) => {
        const isActive = activeMode === view.id;

        return (
          <button
            key={view.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              // If already active, toggle back to global view; otherwise switch to this view
              if (isActive) {
                onSelectMode('global');
              } else {
                onSelectMode(view.id);
              }
            }}
            className={`group relative w-26 h-18 sm:w-32 sm:h-20 rounded-2xl overflow-hidden text-left transition-all duration-300 focus:outline-none cursor-pointer ${
              isActive
                ? 'border-2 border-[#38BDF8] ring-4 ring-[#38BDF8]/30 shadow-[0_0_24px_rgba(56,189,248,0.45)] scale-105'
                : 'border border-white/20 hover:border-white/50 opacity-80 hover:opacity-100 hover:scale-[1.03] shadow-2xl bg-[#04060B]'
            }`}
            title={isActive ? `Return to Moon View` : `Switch to ${view.title}`}
          >
            {/* Live 3D Miniature Viewport */}
            <div className="absolute inset-0 bg-[#04060B]">{view.component}</div>

            {/* Subtle Vignette Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/60 pointer-events-none" />

            {/* Compact Header Pill */}
            <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-md border border-white/10 pointer-events-none">
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />}
              <span className="text-[9px] font-bold text-white tracking-tight leading-tight">{view.title}</span>
            </div>

            {/* Bottom Subtitle / Active Status */}
            <div className="absolute bottom-1 left-1.5 right-1.5 z-10 flex items-center justify-between text-[8px] font-mono text-white/70 pointer-events-none">
              <span className="truncate">{view.subtitle}</span>
              {isActive && (
                <span className="text-[#38BDF8] font-bold tracking-wider">
                  ACTIVE
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
