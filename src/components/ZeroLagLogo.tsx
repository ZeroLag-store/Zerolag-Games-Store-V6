import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';

interface ZeroLagLogoProps {
  size?: number;
  variant?: "full" | "icon";
  className?: string;
  invertColor?: boolean;
}

export default function ZeroLagLogo({ 
  size = 40, 
  variant = "full", 
  className = "", 
  invertColor = false 
}: ZeroLagLogoProps) {
  let authContext: any = null;
  try {
    authContext = useAuth();
  } catch (e) {
    // Graceful fallback outside AuthProvider
  }

  const resolvedConfig = authContext?.storeSettings || authContext?.config;
  const storeName = resolvedConfig?.storeName?.toUpperCase() || "ZEROLAG GAMES STORE";

  // Prevent browser context menu and dragging
  const logoStyles = {
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitUserDrag: 'none' as const,
    MozUserSelect: 'none' as const,
    msUserSelect: 'none' as const,
  };

  // 1. Unified premium custom SVG controller path (rebuilt block-by-block with exact curves, triggers and details)
  const renderControllerIcon = (iconSize: number) => {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="relative flex items-center justify-center shrink-0"
        style={{ width: iconSize, height: iconSize }}
        draggable={false}
      >
        <svg
          viewBox="0 0 100 65"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full select-none pointer-events-none drop-shadow-[0_0_8px_rgba(0,240,255,0.25)]"
        >
          <metadata>
            Copyright © 2026 ZeroLag Games Store. All Rights Reserved.
          </metadata>
          <defs>
            {/* Color/Gradient definitions */}
            <linearGradient id="controllerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={invertColor ? "#0B0B0F" : "#FFFFFF"} />
              <stop offset="100%" stopColor={invertColor ? "#1F2937" : "#E2E8F0"} />
            </linearGradient>

            {/* Inner cutout mask for clean alpha overlay under glows */}
            <mask id="controllerHoles">
              {/* White is visible */}
              <rect x="0" y="0" width="100" height="65" fill="#FFFFFF" />
              
              {/* Black is punched-out transparent holes */}
              {/* D-Pad (Left side) */}
              <rect x="17" y="27" width="14" height="4" rx="1" fill="#000000" />
              <rect x="22" y="22" width="4" height="14" rx="1" fill="#000000" />
              {/* Center small dot */}
              <circle cx="24" cy="29" r="1" fill="#FFFFFF" />

              {/* Three Micro Indicator Lights (Center top row) */}
              <rect x="41" y="20" width="3" height="3" rx="0.5" fill="#000000" />
              <rect x="48.5" y="20" width="3" height="3" rx="0.5" fill="#000000" />
              <rect x="56" y="20" width="3" height="3" rx="0.5" fill="#000000" />

              {/* Select and Start buttons (Center) */}
              <rect x="40" y="32" width="7" height="3.5" rx="1.5" transform="rotate(-15 40 32)" fill="#000000" />
              <rect x="53" y="30" width="7" height="3.5" rx="1.5" transform="rotate(-15 53 30)" fill="#000000" />

              {/* Jumbo Action Button / Thumbstick Group (Right side) */}
              {/* Large circular ring cutout */}
              <circle cx="74" cy="29" r="9" fill="#000000" />
              {/* Inner button silhouette back */}
              <circle cx="74" cy="29" r="6.2" fill="#FFFFFF" />
              {/* Inner button's center dot cutout */}
              <circle cx="74" cy="29" r="2.8" fill="#000000" />
            </mask>
          </defs>

          {/* Top Cartridge bar/slot connector */}
          <rect
            x="36"
            y="2"
            width="28"
            height="5"
            rx="1.5"
            fill="url(#controllerGrad)"
          />
          {/* Vertical connectors standard stems */}
          <rect x="42" y="6" width="3" height="4" fill="url(#controllerGrad)" />
          <rect x="55" y="6" width="3" height="4" fill="url(#controllerGrad)" />

          {/* Main Controller Body with masking applied for perfect background/neon-transparency pass-through */}
          <path
            d="M 22,10 
               C 22,10 32,9 50,9 
               C 68,9 78,10 78,10 
               C 88,10 97,18 97,30 
               C 97,43 83,55 75,55 
               C 69,55 62,44 50,44 
               C 38,44 31,55 25,55 
               C 17,55 3,43 3,30 
               C 3,18 12,10 22,10 Z"
            fill="url(#controllerGrad)"
            mask="url(#controllerHoles)"
          />
        </svg>
      </motion.div>
    );
  };

  if (variant === "icon") {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={logoStyles}
        onContextMenu={(e) => e.preventDefault()}
      >
        {renderControllerIcon(size)}
      </div>
    );
  }

  // Pure SVG stylized 'ØLAG' glitched heading for the horizontal brand block
  const renderOlagGlitchedText = () => {
    return (
      <svg
        viewBox="0 0 160 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-auto h-8 sm:h-9 select-none pointer-events-none drop-shadow-[0_0_12px_rgba(0,240,255,0.3)] shrink-0"
      >
        <defs>
          <linearGradient id="glitchTextColor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={invertColor ? "#0F172A" : "#FFFFFF"} />
            <stop offset="60%" stopColor={invertColor ? "#1E293B" : "#F8FAFC"} />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>
        </defs>

        {/* ØLAG text with slashed O and cyber-glitch lines */}
        <g fill="url(#glitchTextColor)">
          {/* Main letters drawn vectorially for pixel-perfection */}
          {/* 'Ø' letter paths with custom slash */}
          <path d="M 5,6 A 15,15 0 0,1 35,6 A 15,15 0 0,1 5,6 Z M 11,11 A 10,10 0 0,0 29,11 A 10,10 0 0,0 11,11 Z" fillRule="evenodd" />
          <rect x="2" y="32" width="36" height="3" transform="rotate(-45 2 32)" />

          {/* 'L' letter paths */}
          <path d="M 46,6 H 51 V 31 H 68 V 36 H 46 Z" />

          {/* 'A' letter paths */}
          <path d="M 83,6 H 89 L 102,36 H 96 L 93,28 H 79 L 76,36 H 70 Z M 86,12 L 80,24 H 92 Z" />

          {/* 'G' letter paths */}
          <path d="M 128,6 A 15,15 0 0,1 138,36 A 15,15 0 0,1 113,32 L 118,27 A 10,10 0 0,0 133,26 A 10,10 0 0,0 125,12 C 117,12 113,20 113,26 H 125 V 31 H 108 L 108,6 Z" />
        </g>

        {/* Slices / Glitch Cuts - Overlaying horizontal slits aligned beautifully */}
        <g fill={invertColor ? "#E2E8F0" : "#0B0B0F"}>
          {/* Top slice cutout line */}
          <rect x="0" y="14" width="145" height="1.8" />
          {/* Lower shift cutout line */}
          <rect x="15" y="25" width="130" height="1.5" />
          {/* Dynamic glitch ticks */}
          <rect x="8" y="12" width="4" height="4" />
          <rect x="52" y="23" width="6" height="3" />
          <rect x="110" y="13" width="5" height="3" />
        </g>
      </svg>
    );
  };

  return (
    <div 
      className={`flex items-center gap-2.5 sm:gap-3.5 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      style={logoStyles}
    >
      {/* 1. White Gamepad Controller Symbol */}
      {renderControllerIcon(size)}

      {/* 2. Coexisting responsive text section with ZeroLag branding */}
      <div className="flex flex-col justify-center leading-none">
        {/* Dynamic primary store headline */}
        <div className="flex items-center">
          {storeName === "ZEROLAG GAMES STORE" ? (
            // Render high-fidelity handcrafted vector logo text for ZeroLag
            renderOlagGlitchedText()
          ) : (
            // Fallback editable text block if store name customizes via admin
            <span className={`text-xs sm:text-xl font-black tracking-tighter uppercase transition-colors duration-200 ${
              invertColor ? 'text-gray-900' : 'text-white hover:text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.25)]'
            }`}>
              {storeName}
            </span>
          )}
        </div>

        {/* Dynamic secondary games store subtitle (hidden on micro-screens, always visible on mobile/desktop) */}
        {storeName === "ZEROLAG GAMES STORE" && (
          <span className={`text-[7px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase mt-0.5 select-none ${
            invertColor ? 'text-gray-500' : 'text-gray-400'
          }`}>
            GAMES STORE
          </span>
        )}
      </div>
    </div>
  );
}
