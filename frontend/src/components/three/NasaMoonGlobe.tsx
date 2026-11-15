// ============================================================================
// Lunar Horizon — NASA Moon Globe & Surface Explorer
// High-Fidelity 8K Lunar Representation with Real LOLA DEM Topographic Relief
// Dual-frequency displacement + bump mapping, realistic space illumination,
// and Apollo-grade regolith photometric response.
// ============================================================================

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LunarSite } from '../../types';
import { SITES, CATEGORIES, formatCoordinates } from '../../data/sites';
import { lunarTerrainService, LocalTerrainData } from '../../services/lunarTerrainService';
import { formatElevation } from '../../utils/formatters';
import { subsolarPoint, loadTerrainTile, TerrainTile } from '../../services/engineData';

// Convert lat/lon into 3D Cartesian coordinates on sphere
export function latLonToSphere(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

// ----------------------------------------------------------------------------
// 1. Orbital Mode: 8K/4K Displaced Sphere with Topographic Bump Relief
// ----------------------------------------------------------------------------
interface OrbitalMoonProps {
  colorTexture: THREE.Texture;
  dispTexture: THREE.Texture;
  displacementScale: number;
  displacementBias: number;
  autoRotate: boolean;
  isDragging?: boolean;
  selectedSite?: LunarSite | null;
  onSelectSite: (s: LunarSite) => void;
  onHoverSite?: (s: LunarSite | null) => void;
  moonGroupRef?: React.RefObject<THREE.Group | null>;
}

function OrbitalMoon({
  colorTexture,
  dispTexture,
  displacementScale,
  displacementBias,
  autoRotate,
  isDragging = false,
  selectedSite,
  onSelectSite,
  onHoverSite,
  moonGroupRef,
}: OrbitalMoonProps) {
  const localRef = useRef<THREE.Group>(null);
  const meshRef = moonGroupRef || localRef;
  const glowRef = useRef<THREE.Mesh>(null);

  // Tracks whether user's cursor is actively over the Moon globe or any site pin
  const isHoveredRef = useRef<boolean>(false);
  const hoverGraceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerEnterMoon = () => {
    if (hoverGraceTimeoutRef.current) {
      clearTimeout(hoverGraceTimeoutRef.current);
      hoverGraceTimeoutRef.current = null;
    }
    isHoveredRef.current = true;
  };

  const handlePointerLeaveMoon = () => {
    if (hoverGraceTimeoutRef.current) {
      clearTimeout(hoverGraceTimeoutRef.current);
    }
    hoverGraceTimeoutRef.current = setTimeout(() => {
      isHoveredRef.current = false;
    }, 120);
  };

  useFrame((_, delta) => {
    // Only auto-rotate when autoRotate is enabled, user is not hovering over the Moon, and not dragging
    const shouldRotate = autoRotate && !isHoveredRef.current && !isDragging;
    if (shouldRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.02;
      if (glowRef.current) {
        glowRef.current.rotation.y += delta * 0.02;
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* High-Resolution Displaced & Bumped NASA Lunar Sphere (256x256 segments) */}
      <mesh
        receiveShadow
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          handlePointerEnterMoon();
        }}
        onPointerOut={() => {
          handlePointerLeaveMoon();
        }}
      >
        <sphereGeometry args={[2, 256, 256]} />
        <meshStandardMaterial
          map={colorTexture}
          displacementMap={dispTexture}
          displacementScale={displacementScale}
          displacementBias={displacementBias}
          bumpMap={dispTexture}
          bumpScale={0.06}
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>

      {/* Subtle Lunar Limb / Horizon Fresnel Silhouette Glow */}
      <mesh scale={[1.008, 1.008, 1.008]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial
          color="#38BDF8"
          side={THREE.BackSide}
          transparent
          opacity={0.07}
        />
      </mesh>

      {/* 3D Landing Site Pins positioned on true lunar coordinates */}
      {SITES.map((site) => {
        const isSel = Boolean(selectedSite && site.id === selectedSite.id);
        const color = isSel ? '#000000' : (CATEGORIES[site.category]?.color || '#0F172A');
        const pos = latLonToSphere(site.lat, site.lon, 2.035 + displacementScale * 0.5);

        return (
          <SiteMarker3D
            key={site.id}
            site={site}
            position={pos}
            isSelected={isSel}
            color={color}
            onClick={() => onSelectSite(site)}
            onHover={(s) => onHoverSite?.(s)}
            onPointerEnterPin={handlePointerEnterMoon}
            onPointerLeavePin={handlePointerLeaveMoon}
          />
        );
      })}

      {/* Render custom site pin if selectedSite is not in SITES */}
      {selectedSite && !SITES.some((s) => s.id === selectedSite.id) && (
        <SiteMarker3D
          key={selectedSite.id}
          site={selectedSite}
          position={latLonToSphere(selectedSite.lat, selectedSite.lon, 2.035 + displacementScale * 0.5)}
          isSelected={true}
          color="#38BDF8"
          onClick={() => onSelectSite(selectedSite)}
          onHover={(s) => onHoverSite?.(s)}
          onPointerEnterPin={handlePointerEnterMoon}
          onPointerLeavePin={handlePointerLeaveMoon}
        />
      )}
    </group>
  );
}

// Individual 3D pin marker on the lunar surface
function SiteMarker3D({
  site,
  position,
  isSelected,
  color,
  onClick,
  onHover,
  onPointerEnterPin,
  onPointerLeavePin,
}: {
  site: LunarSite;
  position: [number, number, number];
  isSelected: boolean;
  color: string;
  onClick: () => void;
  onHover: (s: LunarSite | null) => void;
  onPointerEnterPin?: () => void;
  onPointerLeavePin?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Central Marker Pin */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onPointerEnterPin?.();
          onHover(site);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onPointerLeavePin?.();
          onHover(null);
        }}
      >
        <sphereGeometry args={[isSelected ? 0.055 : 0.038, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#FFFFFF' : color} />
      </mesh>

      {/* Selected Target Concentric Rings */}
      {isSelected && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.075, 0.095, 32]} />
            <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.115, 0.125, 32]} />
            <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} transparent opacity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Real-time 3D-to-2D Screen Projector for Active Site HUD & Connecting Line
// ----------------------------------------------------------------------------
export interface SiteScreenProjectorData {
  x: number;
  y: number;
  isVisible: boolean;
  site: LunarSite;
}

function SiteProjector({
  activeSite,
  moonGroupRef,
  displacementScale,
  onProject,
}: {
  activeSite: LunarSite | null;
  moonGroupRef?: React.RefObject<THREE.Group | null>;
  displacementScale: number;
  onProject?: (data: SiteScreenProjectorData | null) => void;
}) {
  const { camera, size } = useThree();
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const lastState = useRef<{ x: number; y: number; siteId: string } | null>(null);

  useFrame(() => {
    if (!activeSite || !onProject) {
      if (lastState.current !== null) {
        lastState.current = null;
        onProject?.(null);
      }
      return;
    }

    const pos = latLonToSphere(activeSite.lat, activeSite.lon, 2.035 + displacementScale * 0.5);
    const rotY = moonGroupRef?.current ? moonGroupRef.current.rotation.y : 0;
    tempVec.set(pos[0], pos[1], pos[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);

    // Front-facing occlusion test against lunar horizon:
    const dot = tempVec.dot(camera.position);
    const isVisible = dot > 0.12;

    if (!isVisible) {
      if (lastState.current !== null) {
        lastState.current = null;
        onProject(null);
      }
      return;
    }

    // Project world coordinates to NDC:
    tempVec.project(camera);

    // Convert NDC (-1..1) to screen pixels:
    const x = (tempVec.x * 0.5 + 0.5) * size.width;
    const y = (-tempVec.y * 0.5 + 0.5) * size.height;

    if (
      !lastState.current ||
      lastState.current.siteId !== activeSite.id ||
      Math.abs(lastState.current.x - x) > 0.25 ||
      Math.abs(lastState.current.y - y) > 0.25
    ) {
      lastState.current = { x, y, siteId: activeSite.id };
      onProject({ x, y, isVisible: true, site: activeSite });
    }
  });

  return null;
}

// ----------------------------------------------------------------------------
// 2. Surface Mode: Ground-Level Local 3D Terrain from NASA LOLA DEM
// Real 16 px/° LOLA Topography, analytical slope normals, 1:1 physical scale,
// and high-resolution regolith micro-texture (zero artificial craters).
// ----------------------------------------------------------------------------
interface SurfaceTerrainMeshProps {
  terrainData: LocalTerrainData;
  colorTexture?: THREE.Texture | null;
  selectedSite: LunarSite;
}

function SurfaceTerrainMesh({ terrainData, selectedSite }: SurfaceTerrainMeshProps) {
  const [normalMap, setNormalMap] = useState<THREE.Texture | null>(null);
  const [roughMap, setRoughMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/assets/moon/lunar_regolith_normal.webp', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(16, 16);
      setNormalMap(tex);
    });
    loader.load('/assets/moon/lunar_regolith_roughness.webp', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(16, 16);
      setRoughMap(tex);
    });
  }, []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(terrainData.positions, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(terrainData.uvs, 2));
    if (terrainData.normals) {
      g.setAttribute('normal', new THREE.BufferAttribute(terrainData.normals, 3));
    } else {
      g.computeVertexNormals();
    }
    g.setIndex(new THREE.BufferAttribute(terrainData.indices, 1));
    return g;
  }, [terrainData]);

  // Albedo variation: mare basalt sites are darker, highland sites are lighter anorthosite
  const isHighland = selectedSite.elevation > -1500;
  const regolithColor = isHighland ? '#848A94' : '#5C626C';

  return (
    <group position={[0, 0, 0]}>
      {/* Local Topographic Surface with authentic LOLA DEM relief & analytical slope normals */}
      <mesh geometry={geom} receiveShadow castShadow>
        <meshStandardMaterial
          color={regolithColor}
          normalMap={normalMap}
          normalScale={normalMap ? new THREE.Vector2(0.75, 0.75) : undefined}
          roughnessMap={roughMap}
          roughness={0.96}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lander / Surface Asset Marker resting precisely at Touchdown Datum (0, 0, 0) */}
      <group position={[0, 0, 0]}>
        {/* Lander Base (Gold MLI Thermal Foil) */}
        <mesh castShadow position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.45, 0.65, 0.35, 8]} />
          <meshStandardMaterial color="#EAB308" metalness={0.88} roughness={0.18} />
        </mesh>

        {/* Lander Legs touching ground precisely at surface Y=0 */}
        {[-0.5, 0.5].map((x) =>
          [-0.5, 0.5].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.08, z]} rotation={[x * 0.4, 0, z * 0.4]}>
              <cylinderGeometry args={[0.03, 0.05, 0.28, 8]} />
              <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.2} />
            </mesh>
          ))
        )}

        {/* Antenna Mast */}
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
          <meshStandardMaterial color="#F1F5F9" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* High-Gain Dish pointing Earthward */}
        <mesh position={[0.2, 0.9, 0]} rotation={[0.4, 0.5, 0]}>
          <coneGeometry args={[0.25, 0.15, 16, 1, true]} />
          <meshStandardMaterial color="#FFFFFF" side={THREE.DoubleSide} roughness={0.3} />
        </mesh>

        {/* Surface Touchdown HUD Beacon */}
        <Html position={[0, 1.4, 0]} center pointerEvents="none">
          <div className="bg-[#000000]/90 text-white px-3 py-1 rounded-full text-[10px] font-mono font-bold shadow-2xl flex items-center gap-2 whitespace-nowrap border border-white/20 select-none">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
            <span>
              {selectedSite.name} — Touchdown (0.0 km Datum)
            </span>
          </div>
        </Html>
      </group>
    </group>
  );
}

// Camera transition helper
interface CameraRigProps {
  mode: 'orbital' | 'surface';
  isFocused?: boolean;
  selectedSite?: LunarSite | null;
  controlsRef: React.RefObject<any>;
  resetTrigger?: number;
  moonGroupRef?: React.RefObject<THREE.Group | null>;
}

// Default camera orientation framing the rich Near Side & South Pole cluster where 13+ sites are prominently visible
const DEFAULT_CAMERA_POS = new THREE.Vector3(5.48, -3.90, -0.97);

function CameraRig({
  mode,
  isFocused = false,
  selectedSite,
  controlsRef,
  resetTrigger,
  moonGroupRef,
}: CameraRigProps) {
  const { camera } = useThree();

  const transitionRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startDist: number;
    endDist: number;
  }>({
    active: false,
    startTime: 0,
    duration: 850,
    startPos: DEFAULT_CAMERA_POS.clone(),
    endPos: DEFAULT_CAMERA_POS.clone(),
    startTarget: new THREE.Vector3(0, 0, 0),
    endTarget: new THREE.Vector3(0, 0, 0),
    startDist: DEFAULT_CAMERA_POS.length(),
    endDist: DEFAULT_CAMERA_POS.length(),
  });

  const isInitialMount = useRef(true);
  const prevFocused = useRef(isFocused);
  const prevSiteId = useRef(selectedSite?.id);
  const prevMode = useRef(mode);
  const prevResetTrigger = useRef(resetTrigger);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (mode === 'surface') {
        camera.position.set(0, 8, 22);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      } else {
        if (isFocused && selectedSite) {
          const normal = latLonToSphere(selectedSite.lat, selectedSite.lon, 1);
          const rotY = moonGroupRef?.current ? moonGroupRef.current.rotation.y : 0;
          const rotatedNormal = new THREE.Vector3(...normal).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
          camera.position.set(rotatedNormal.x * 6.2, rotatedNormal.y * 6.2, rotatedNormal.z * 6.2);
          camera.lookAt(0, 0, 0);
        } else {
          camera.position.copy(DEFAULT_CAMERA_POS);
          camera.lookAt(0, 0, 0);
        }
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      }
      prevFocused.current = isFocused;
      prevSiteId.current = selectedSite?.id;
      prevMode.current = mode;
      prevResetTrigger.current = resetTrigger;
      return;
    }

    // Trigger smooth camera reset when resetTrigger changes
    if (resetTrigger !== undefined && resetTrigger !== prevResetTrigger.current) {
      prevResetTrigger.current = resetTrigger;
      const currentPos = camera.position.clone();
      const currentTarget = controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0, 0);
      const targetPos = mode === 'surface' ? new THREE.Vector3(0, 8, 22) : DEFAULT_CAMERA_POS.clone();

      transitionRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 800,
        startPos: currentPos,
        endPos: targetPos,
        startTarget: currentTarget,
        endTarget: new THREE.Vector3(0, 0, 0),
        startDist: currentPos.length(),
        endDist: targetPos.length(),
      };
      return;
    }

    if (mode === 'surface') {
      if (prevMode.current !== 'surface') {
        camera.position.set(0, 8, 22);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      }
      prevMode.current = mode;
      return;
    }

    // mode === 'orbital'
    if (prevMode.current !== 'orbital') {
      prevMode.current = 'orbital';
      if (!isFocused || !selectedSite) {
        camera.position.copy(DEFAULT_CAMERA_POS);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      } else {
        const normal = latLonToSphere(selectedSite.lat, selectedSite.lon, 1);
        const rotY = moonGroupRef?.current ? moonGroupRef.current.rotation.y : 0;
        const rotatedNormal = new THREE.Vector3(...normal).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        camera.position.set(rotatedNormal.x * 6.2, rotatedNormal.y * 6.2, rotatedNormal.z * 6.2);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      }
      prevFocused.current = isFocused;
      prevSiteId.current = selectedSite?.id;
      return;
    }

    // Trigger smooth transition when isFocused changes or selectedSite changes while focused
    const focusedChanged = prevFocused.current !== isFocused;
    const siteChanged = prevSiteId.current !== selectedSite?.id;

    if (focusedChanged || (isFocused && siteChanged)) {
      prevFocused.current = isFocused;
      prevSiteId.current = selectedSite?.id;

      const currentPos = camera.position.clone();
      const currentTarget = controlsRef.current?.target?.clone() || new THREE.Vector3(0, 0, 0);

      let targetPos: THREE.Vector3;
      if (isFocused && selectedSite) {
        const normal = latLonToSphere(selectedSite.lat, selectedSite.lon, 1);
        const rotY = moonGroupRef?.current ? moonGroupRef.current.rotation.y : 0;
        const rotatedNormal = new THREE.Vector3(...normal).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        targetPos = rotatedNormal.multiplyScalar(6.2);
      } else {
        targetPos = DEFAULT_CAMERA_POS.clone();
      }

      transitionRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 850,
        startPos: currentPos,
        endPos: targetPos,
        startTarget: currentTarget,
        endTarget: new THREE.Vector3(0, 0, 0),
        startDist: currentPos.length(),
        endDist: targetPos.length(),
      };
    }
  }, [mode, isFocused, selectedSite, camera, controlsRef, moonGroupRef]);

  useFrame(() => {
    if (transitionRef.current.active) {
      const elapsed = performance.now() - transitionRef.current.startTime;
      const progress = Math.min(1, elapsed / transitionRef.current.duration);
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      const pos = new THREE.Vector3().lerpVectors(
        transitionRef.current.startPos,
        transitionRef.current.endPos,
        ease
      );

      // Spherical radius arc interpolation so camera stays at appropriate altitude above Moon
      const curLen = pos.length();
      const targetLen = THREE.MathUtils.lerp(
        transitionRef.current.startDist,
        transitionRef.current.endDist,
        ease
      );
      if (curLen > 0.001) {
        pos.multiplyScalar(targetLen / curLen);
      }
      camera.position.copy(pos);

      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(
          transitionRef.current.startTarget,
          transitionRef.current.endTarget,
          ease
        );
        controlsRef.current.update();
      } else {
        camera.lookAt(transitionRef.current.endTarget);
      }

      if (progress >= 1) {
        transitionRef.current.active = false;
      }
    }
  });

  return null;
}

// ----------------------------------------------------------------------------
// 3. Main Export Component
// ----------------------------------------------------------------------------
/**
 * Sunlight from the real Sun direction (orbital view): the light points from the sub-solar point given by
 * the ASTRA-SN engine for `date`, and follows the Moon's rotation in the scene.
 * Falls back to the previous fixed light when the date is outside the precomputed year.
 */
function RealSunLight({ date, moonGroupRef }: { date?: string; moonGroupRef: React.RefObject<THREE.Group | null> }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const sunLocal = useMemo(() => {
    const p = date ? subsolarPoint(date) : null;
    return p ? new THREE.Vector3(...latLonToSphere(p.latDeg, p.lonDeg, 1)) : null;
  }, [date]);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    if (!lightRef.current || !sunLocal) return;
    if (moonGroupRef.current) moonGroupRef.current.getWorldQuaternion(q);
    else q.identity();
    lightRef.current.position.copy(sunLocal).applyQuaternion(q).multiplyScalar(20);
  });
  return (
    <directionalLight
      ref={lightRef}
      position={sunLocal ? (sunLocal.clone().multiplyScalar(20).toArray() as [number, number, number]) : [8, 3.5, 7]}
      intensity={3.2}
      color="#FFFFFF"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0001}
    />
  );
}

/**
 * Engine LOLA tile -> the same mesh data the view already uses (only the heights change):
 * x = east (km), y = up (km, true scale), z = south (km), 251 x 251 points every 80 m.
 */
function tileToTerrainData(t: TerrainTile): LocalTerrainData {
  const n = t.size, c = (n - 1) / 2, stepKm = t.stepM / 1000;
  const positions = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const indices = new Uint16Array((n - 1) * (n - 1) * 6);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      positions[3 * k] = (i - c) * stepKm;           // east
      positions[3 * k + 1] = t.heights[k] / 1000;    // up, true scale
      positions[3 * k + 2] = (j - c) * stepKm;       // south (row 0 = north edge)
      uvs[2 * k] = i / (n - 1);
      uvs[2 * k + 1] = 1 - j / (n - 1);
    }
  }
  let q = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
      indices.set([a, d, b, b, d, e], q);
      q += 6;
    }
  }
  return {
    positions, uvs, indices, normals: undefined,
    elevations: t.heights, minElevation: t.groundElevationM + t.minM, maxElevation: t.groundElevationM + t.maxM,
    elevationRange: t.maxM - t.minM, centerElevation: t.groundElevationM,
    widthKm: (n - 1) * stepKm, resolution: n - 1, isHighResLOLA: true,
    datasetName: 'NASA LOLA LDEM 80 m (ASTRA-SN engine tile)',
  };
}

/** Direction of the local Sun from the engine azimuth / elevation (x = east, y = up, z = south). */
function sunLightPosition(sun: { azimuthDeg: number; elevationDeg: number }, r = 23): [number, number, number] {
  const az = (sun.azimuthDeg * Math.PI) / 180, el = (sun.elevationDeg * Math.PI) / 180;
  return [r * Math.cos(el) * Math.sin(az), r * Math.sin(el), -r * Math.cos(el) * Math.cos(az)];
}

export interface NasaMoonGlobeProps {
  mode: 'orbital' | 'surface';
  /** UTC date of the Sun position used for the lighting (orbital view). */
  sunDate?: string;
  /** Engine Sun azimuth / elevation at the site (direction of the local terrain light). */
  localSun?: { azimuthDeg: number; elevationDeg: number } | null;
  selectedSite?: LunarSite | null;
  activeSite?: LunarSite | null;
  onActiveSiteScreenPos?: (data: SiteScreenProjectorData | null) => void;
  onSelectSite: (s: LunarSite) => void;
  onHoverSite?: (s: LunarSite | null) => void;
  autoRotate: boolean;
  displacementScale: number;
  onElevationChange?: (elevMeters: number) => void;
  isFocused?: boolean;
  resetTrigger?: number;
}

export default function NasaMoonGlobe({
  mode,
  sunDate,
  localSun,
  selectedSite,
  activeSite,
  onActiveSiteScreenPos,
  onSelectSite,
  onHoverSite,
  autoRotate,
  displacementScale,
  onElevationChange,
  isFocused = false,
  resetTrigger,
}: NasaMoonGlobeProps) {
  const controlsRef = useRef<any>(null);
  const moonGroupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null);
  const [dispTexture, setDispTexture] = useState<THREE.Texture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [terrainData, setTerrainData] = useState<LocalTerrainData | null>(null);

  // Progressive loading of NASA Textures (2K -> 4K -> 8K ultra-definition)
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let isMounted = true;

    async function loadAssets() {
      setIsLoading(true);
      await lunarTerrainService.init();

      const configureTexture = (tex: THREE.Texture, isSRGB: boolean = false) => {
        if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = 16;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
      };

      // 1. Instant 2K Texture
      loader.load('/assets/moon/lroc_color_2k.webp', (tex2k) => {
        if (!isMounted) return;
        configureTexture(tex2k, true);
        setColorTexture(tex2k);

        // 2. Upgrade to 4K Color
        loader.load('/assets/moon/lroc_color_4k.webp', (tex4k) => {
          if (!isMounted) return;
          configureTexture(tex4k, true);
          setColorTexture(tex4k);

          // 3. Upgrade to true 8K authentic NASA lunar surface
          loader.load('/assets/moon/moon_8k.jpg', (tex8k) => {
            if (!isMounted) return;
            configureTexture(tex8k, true);
            setColorTexture(tex8k);
          });
        });
      });

      // 4. Load LOLA Topographic Displacement Maps
      loader.load('/assets/moon/ldem_displacement_2k.webp', (disp2k) => {
        if (!isMounted) return;
        configureTexture(disp2k, false);
        setDispTexture(disp2k);
        setIsLoading(false);

        loader.load('/assets/moon/ldem_displacement_4k.webp', (disp4k) => {
          if (!isMounted) return;
          configureTexture(disp4k, false);
          setDispTexture(disp4k);
        });
      });
    }

    loadAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update elevation and generate local terrain when site changes
  useEffect(() => {
    if (!selectedSite) return;
    const elev = lunarTerrainService.getElevation(selectedSite.lat, selectedSite.lon);
    onElevationChange?.(elev);

    // Local 3D terrain: real LOLA 80 m heights from the engine tile when the site has one,
    // else the previous grid (~40 km span, 128x128 from the global LOLA map)
    let cancelled = false;
    loadTerrainTile(selectedSite.id).then((tile) => {
      if (cancelled) return;
      setTerrainData(tile ? tileToTerrainData(tile) : lunarTerrainService.generateLocalTerrain(selectedSite, 40, 40, 128));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSite, onElevationChange]);

  // Compute displacement bias based on dataset range
  const dispBias = -0.4566 * displacementScale;

  return (
    <>
      <CameraRig
        mode={mode}
        isFocused={isFocused}
        selectedSite={selectedSite}
        controlsRef={controlsRef}
        resetTrigger={resetTrigger}
        moonGroupRef={moonGroupRef}
      />

      {/* Cinematic Deep Space Solar Illumination (grazing angle in surface mode for authentic crater shadow relief) */}
      {mode === 'surface' ? (
        <directionalLight
          position={localSun ? sunLightPosition(localSun) : [18, 5, 14]}
          intensity={localSun && localSun.elevationDeg < 0 ? 0 : 3.8}
          color="#FFFFFF"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
      ) : (
        <RealSunLight date={sunDate} moonGroupRef={moonGroupRef} />
      )}

      {/* Soft Earthshine fill light illuminating the night side subtly */}
      <directionalLight
        position={mode === 'surface' ? [-16, 2, -12] : [-7, -2.5, -6]}
        intensity={mode === 'surface' ? 0.2 : 0.16}
        color="#93C5FD"
      />

      {/* Minimal space vacuum ambient light */}
      <ambientLight intensity={mode === 'surface' ? 0.04 : 0.06} />

      {/* Loading HUD overlay (kept mounted to prevent React 19 root unmount race) */}
      <Html center pointerEvents="none">
        <div
          style={{ display: isLoading ? 'flex' : 'none' }}
          className="bg-[#04060B]/90 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl shadow-2xl flex-col items-center gap-2 ring-1 ring-white/10"
        >
          <img
            src="/assets/brand/astra-logo-clean.webp"
            alt="ASTRA"
            className="h-6 w-24 object-contain animate-pulse"
          />
          <span className="text-[10px] font-bold text-white/80 font-mono tracking-widest whitespace-nowrap">
            STREAMING NASA 8K LROC & LOLA RELIEF…
          </span>
        </div>
      </Html>

      {mode === 'orbital' && (
        <SiteProjector
          activeSite={activeSite || null}
          moonGroupRef={moonGroupRef}
          displacementScale={displacementScale}
          onProject={onActiveSiteScreenPos}
        />
      )}

      {/* Orbital Mode vs Surface Mode */}
      {mode === 'orbital' && colorTexture && dispTexture && (
        <OrbitalMoon
          colorTexture={colorTexture}
          dispTexture={dispTexture}
          displacementScale={displacementScale}
          displacementBias={dispBias}
          autoRotate={autoRotate}
          isDragging={isDragging}
          selectedSite={selectedSite}
          onSelectSite={onSelectSite}
          onHoverSite={onHoverSite}
          moonGroupRef={moonGroupRef}
        />
      )}

      {mode === 'surface' && terrainData && colorTexture && selectedSite && (
        <SurfaceTerrainMesh
          terrainData={terrainData}
          colorTexture={colorTexture}
          selectedSite={selectedSite}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan={mode === 'surface'}
        enableDamping={true}
        dampingFactor={0.06}
        rotateSpeed={mode === 'surface' ? 0.75 : 0.65}
        minDistance={mode === 'surface' ? 2 : 2.8}
        maxDistance={mode === 'surface' ? 50 : 15}
        maxPolarAngle={mode === 'surface' ? Math.PI / 2 - 0.08 : Math.PI * 0.92}
        minPolarAngle={mode === 'surface' ? 0.05 : Math.PI * 0.08}
        onStart={() => setIsDragging(true)}
        onEnd={() => setIsDragging(false)}
      />
    </>
  );
}
