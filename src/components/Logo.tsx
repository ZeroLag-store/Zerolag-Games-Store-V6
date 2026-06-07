import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../App';

interface LogoProps {
  className?: string;
  invertColor?: boolean;
  config?: any;
  storeSettings?: any;
}

export default function Logo({ className = "", invertColor = false, config: propsConfig, storeSettings: propsStoreSettings }: LogoProps) {
  let authContext: any = null;
  try {
    authContext = useAuth();
  } catch (e) {
    // Graceful fallback outside AuthProvider
  }

  const resolvedConfig = propsStoreSettings || propsConfig || authContext?.storeSettings || authContext?.config;
  const storeName = resolvedConfig?.storeName?.toUpperCase() || "ZEROLAG GAMES STORE";
  const logoUrl = resolvedConfig?.logoUrl;
  const [imgFailed, setImgFailed] = useState(false);
  const [cacheBustVal, setCacheBustVal] = useState(() => Date.now());

  useEffect(() => {
    setImgFailed(false);
    setCacheBustVal(Date.now());
  }, [logoUrl, resolvedConfig?.updatedAt]);

  const finalLogoUrl = logoUrl 
    ? (logoUrl.includes('?') ? `${logoUrl}&v=${cacheBustVal}` : `${logoUrl}?v=${cacheBustVal}`)
    : '';

  const logoStyles = {
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitUserDrag: 'none' as const,
    MozUserSelect: 'none' as const,
    msUserSelect: 'none' as const,
  };

  return (
    <div 
      className={`flex items-center gap-2 sm:gap-3 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      style={logoStyles}
    >
      {logoUrl && !imgFailed ? (
        <img 
          src={finalLogoUrl} 
          alt="Zerolag Games Store Logo" 
          className="h-10 sm:h-12 w-auto shrink-0"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <motion.div 
          whileHover={{ rotate: 0, scale: 1.05 }}
          className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden rounded-xl bg-white/5 border border-white/10 group shrink-0"
          draggable={false}
        >
          {/* Glow effect */}
          {!invertColor && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/25 to-[#6C5CE7]/25 blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
          )}

          {/* Inline SVG - Secure design with embed metadata */}
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 40 40" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10 select-none pointer-events-none"
          >
            <metadata>
              Copyright © 2026 Zerolag Games Store.
              All Rights Reserved.
            </metadata>
            <defs>
              {/* Box background gradient */}
              <linearGradient id="zlBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={invertColor ? "#F3F4F6" : "#151619"} />
                <stop offset="100%" stopColor={invertColor ? "#E5E7EB" : "#0B0B0F"} />
              </linearGradient>
              
              {/* Cyberpunk accent text gradient */}
              <linearGradient id="zlTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={invertColor ? "#1F2937" : "#FFFFFF"} />
                <stop offset="50%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#6C5CE7" />
              </linearGradient>
              
              {/* Outer border gradient */}
              <linearGradient id="zlBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(0, 240, 255, 0.5)" />
                <stop offset="50%" stopColor="rgba(108, 92, 231, 0.3)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
              
              {/* Neon bloom filter */}
              {!invertColor && (
                <filter id="zlNeonGlow" x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              )}
            </defs>

            {/* Core box wrapper with double border */}
            <rect 
              x="1.5" 
              y="1.5" 
              width="37" 
              height="37" 
              rx="10" 
              fill="url(#zlBgGrad)" 
              stroke={invertColor ? "#D1D5DB" : "url(#zlBorderGrad)"} 
              strokeWidth="1.5" 
            />

            {/* Inner tech details */}
            <rect 
              x="4" 
              y="4" 
              width="32" 
              height="32" 
              rx="7" 
              stroke={invertColor ? "rgba(0,0,0,0.05)" : "rgba(0, 240, 255, 0.15)"} 
              strokeWidth="1" 
              fill="none" 
            />

            {/* Monogram label text layer */}
            <text 
              x="50%" 
              y="56%" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fill="url(#zlTextGrad)" 
              fontFamily="'Inter', system-ui, sans-serif" 
              fontWeight="900" 
              fontSize="14" 
              letterSpacing="-0.5"
              filter={invertColor ? undefined : "url(#zlNeonGlow)"}
            >
              ZL
            </text>
          </svg>
        </motion.div>
      )}

      <div className="flex flex-col leading-none">
        <span className={`text-xs sm:text-xl font-black tracking-tighter uppercase transition-colors duration-200 ${
          invertColor ? 'text-gray-900' : 'text-white hover:text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.2)]'
        }`}>
          {storeName}
        </span>
        <span className={`text-[7px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.3em] uppercase ${
          invertColor ? 'text-gray-500' : 'text-gray-400'
        }`}>
          GAMES STORE
        </span>
      </div>
    </div>
  );
}
