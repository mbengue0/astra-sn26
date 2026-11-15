// ============================================================================
// Lunar Horizon — Apple "Hello"-Style Left-to-Right ASTRA Logo Writing Intro
// Gradually writes/draws the official ASTRA metallic logo from left to right
// using a synchronized SVG stroke-reveal mask and glowing light-pen trace,
// then smoothly dissolves into the interactive 3D Moon workspace.
// ============================================================================

import React, { useEffect, useState } from 'react';

export interface AstraWelcomeIntroProps {
  onComplete?: () => void;
}

/**
 * Continuous left-to-right writing path across the 748x221 ASTRA logo geometry:
 * Traces:
 *   1. 'A' (left leg -> apex -> right leg -> crossbar)
 *   2. 'S' (top-right -> upper curve -> spine -> lower curve -> bottom-left)
 *   3. 'T' (left-to-right top bar -> vertical stem)
 *   4. 'R' (vertical stem -> upper loop -> diagonal leg)
 *   5. 'A' (left leg -> apex -> right leg -> crossbar)
 */
const ASTRA_WRITE_PATH = [
  // Letter 1: A
  'M 18 168 L 114 34 L 166 168',
  'M 52 132 L 152 132',
  // Letter 2: S
  'M 284 40 C 215 32, 162 46, 166 74 C 170 100, 308 92, 308 134 C 308 166, 225 170, 174 150',
  // Letter 3: T
  'M 292 34 L 510 34',
  'M 357 34 L 357 168',
  // Letter 4: R
  'M 428 74 L 428 168',
  'M 428 36 L 525 36 C 575 36, 575 96, 515 98 L 434 98 L 554 168',
  // Letter 5: A
  'M 564 168 L 652 34 L 734 168',
  'M 596 132 L 704 132',
].join(' ');

const PATH_TOTAL_LENGTH = 2650;

export default function AstraWelcomeIntro({ onComplete }: AstraWelcomeIntroProps) {
  const [drawStarted, setDrawStarted] = useState(false);
  const [shimmerPhase, setShimmerPhase] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  useEffect(() => {
    // Trigger CSS stroke transition on next frame after mount
    const startTimer = requestAnimationFrame(() => {
      setDrawStarted(true);
    });

    // Trigger final metallic sheen once writing completes (~2.4s)
    const shimmerTimer = setTimeout(() => {
      setShimmerPhase(true);
    }, 2350);

    // Begin smooth dissolve out to reveal the 3D Moon (~3.1s)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3100);

    // Unmount after fade-out transition completes
    const unmountTimer = setTimeout(() => {
      setIsUnmounted(true);
      onComplete?.();
    }, 3800);

    return () => {
      cancelAnimationFrame(startTimer);
      clearTimeout(shimmerTimer);
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setIsUnmounted(true);
      onComplete?.();
    }, 450);
  };

  if (isUnmounted) return null;

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#04060B] select-none cursor-pointer transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle ambient deep-space radial glow behind the logo */}
      <div
        className="absolute w-[560px] h-[260px] rounded-full pointer-events-none blur-[110px] transition-opacity duration-1000"
        style={{
          opacity: drawStarted ? 0.32 : 0,
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.42) 0%, rgba(255, 255, 255, 0.12) 45%, transparent 75%)',
        }}
      />

      {/* Apple-Style Left-to-Right Written ASTRA Logo */}
      <div className="relative w-[320px] sm:w-[480px] md:w-[580px] aspect-[748/221] flex items-center justify-center">
        <svg
          viewBox="0 0 748 221"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Key out the dark rectangular background of astra-logo-clean.webp so only the metallic letters remain */}
            <filter id="astraCleanAlpha" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="
                  1.15 0    0    0 -0.05
                  0    1.15 0    0 -0.05
                  0    0    1.15 0 -0.05
                  1.8  1.8  1.4  0 -0.62
                "
              />
            </filter>

            {/* Soft glow filter for the leading Apple-style light pen */}
            <filter id="astraPenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradient for the luminous stroke trace */}
            <linearGradient id="astraStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#E0F2FE" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
            </linearGradient>

            {/* Mask that progressively reveals the metallic logo along the exact letter strokes from left to right */}
            <mask id="astraWriteRevealMask">
              <path
                d={ASTRA_WRITE_PATH}
                fill="none"
                stroke="white"
                strokeWidth="74"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={PATH_TOTAL_LENGTH}
                strokeDashoffset={drawStarted ? 0 : PATH_TOTAL_LENGTH}
                style={{
                  transition: 'stroke-dashoffset 2.35s cubic-bezier(0.37, 0, 0.22, 1)',
                }}
              />
            </mask>
          </defs>

          {/* 1. Official Metallic ASTRA Logo revealed progressively from left to right */}
          <image
            href="/assets/brand/astra-logo-clean.webp"
            width="748"
            height="221"
            filter="url(#astraCleanAlpha)"
            mask="url(#astraWriteRevealMask)"
          />

          {/* 2. Luminous Apple "Hello"-style calligraphic trace writing the letters */}
          <path
            d={ASTRA_WRITE_PATH}
            fill="none"
            stroke="url(#astraStrokeGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#astraPenGlow)"
            strokeDasharray={PATH_TOTAL_LENGTH}
            strokeDashoffset={drawStarted ? 0 : PATH_TOTAL_LENGTH}
            style={{
              transition:
                'stroke-dashoffset 2.3s cubic-bezier(0.37, 0, 0.22, 1), opacity 0.6s ease-out',
              opacity: shimmerPhase ? 0 : 0.9,
            }}
          />
        </svg>

        {/* Final subtle specular light sweep across the completed logo */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
          style={{
            opacity: shimmerPhase ? 1 : 0,
            transition: 'opacity 300ms ease-out',
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)',
              transform: shimmerPhase ? 'translateX(120%)' : 'translateX(-120%)',
              transition: 'transform 850ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
