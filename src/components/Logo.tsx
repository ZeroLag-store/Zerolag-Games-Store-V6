import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import ZeroLagLogo from './ZeroLagLogo';

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
      className={`flex items-center gap-2.5 sm:gap-3.5 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      style={logoStyles}
    >
      {/* 1. Logo symbol on the left: Uploaded Image or Premium Vector Controller Fallback */}
      {logoUrl && !imgFailed ? (
        <img 
          src={finalLogoUrl} 
          alt="Zerolag Games Store" 
          className="h-10 sm:h-12 w-auto shrink-0 object-contain rounded-lg"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <ZeroLagLogo variant="icon" size={38} invertColor={invertColor} className="shrink-0" />
      )}

      {/* 2. Coexisting brand headline and subtitle on the right */}
      <div className="flex flex-col leading-none justify-center">
        <span className={`text-xs sm:text-lg lg:text-xl font-black tracking-tighter uppercase transition-colors duration-200 ${
          invertColor ? 'text-gray-900' : 'text-white hover:text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.25)]'
        }`}>
          {storeName}
        </span>
        <span className={`text-[7px] sm:text-[9.5px] font-bold tracking-[0.2em] sm:tracking-[0.28em] uppercase mt-0.5 ${
          invertColor ? 'text-gray-500' : 'text-gray-400'
        }`}>
          GAMES STORE
        </span>
      </div>
    </div>
  );
}
