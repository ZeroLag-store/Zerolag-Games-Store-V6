import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, User, Menu, X, LogIn, Settings, Search, PhoneCall,
  Home, ShoppingBag, Cpu, Coins, Info, HelpCircle, Package, Heart, ChevronRight 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import SmartSearch from './SmartSearch';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, isAdmin, config, storeSettings, cart, showToast, isCartOpen, setIsCartOpen } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync body scroll lock on mobile menu open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Logged out successfully');
      setIsMobileMenuOpen(false);
      navigate('/');
    } catch (e) {
      showToast('Logout failed');
    }
  };

  const desktopLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.shop'), path: '/shop' },
    { name: t('nav.track'), path: '/lookup' },
    { name: t('nav.about'), path: '/about' },
    { name: t('nav.contact'), path: '/contact' },
  ];

  const mobileLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.shop'), path: '/shop' },
    { name: t('nav.hardware'), path: '/shop?category=Hardware' },
    { name: t('nav.top_up'), path: '/shop?category=Top%2520Up' }, // percent encoded or plain
    { name: t('nav.about'), path: '/about' },
    { name: t('nav.contact'), path: '/contact' },
    { name: t('nav.track_orders'), path: '/lookup' },
    { name: t('nav.support'), path: '#', isSupport: true },
  ];

  const handleMobileLinkClick = (link: any) => {
    setIsMobileMenuOpen(false);
    if (link.isSupport) {
      if ((window as any).openSupportHub) {
        (window as any).openSupportHub();
      } else {
        window.dispatchEvent(new CustomEvent('toggle-support-hub'));
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-[#00F0FF]/20 py-3 sm:py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo Container */}
        <Link to="/" className="group shrink-0">
          <Logo storeSettings={storeSettings} />
        </Link>

        {/* Desktop Nav Links (Hidden below 1024px) */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {desktopLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className="text-xs xl:text-sm font-black hover:text-[#00F0FF] transition-colors uppercase tracking-widest relative group/link"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-[#00F0FF] group-hover/link:w-full transition-all duration-300"></span>
            </Link>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Language Switch: Always visible, extremely compact on mobile */}
          <button 
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="px-2 sm:px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest text-[#00F0FF] border border-[#00F0FF]/25 flex items-center gap-1 shrink-0 h-9 sm:h-10 select-none"
          >
            <span>{language === 'en' ? 'EN' : 'AR'}</span>
          </button>

          {/* Search trigger: Desktop only in top bar, drawer on mobile */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex p-2 hover:bg-white/5 rounded-full transition-colors text-white hover:text-[#00F0FF] shrink-0 h-10 w-10 items-center justify-center"
          >
            <Search size={18} />
          </button>
          
          {/* Cart Trigger: Always visible */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white hover:text-[#00F0FF] relative shrink-0 h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center"
          >
            <ShoppingCart size={18} />
            {cart.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00F0FF] text-[#0B0B0F] text-[9px] font-black rounded-full flex items-center justify-center border border-[#0B0B0F]">
                {cart.reduce((total, item) => total + (item.quantity || 1), 0)}
              </span>
            )}
          </button>

          {/* Admin shortcut: Desktop only */}
          {isAdmin && (
            <Link to="/admin" className="hidden lg:flex p-2 hover:bg-white/5 rounded-full transition-colors text-[#00F0FF] shrink-0 h-10 w-10 items-center justify-center">
              <Settings size={18} />
            </Link>
          )}
          
          {/* Account Profile Shortcut: Desktop only */}
          <Link to={user ? "/profile" : "/login"} className="hidden lg:flex items-center gap-2 p-1.5 xl:p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-[#00F0FF]/30 shrink-0 h-10">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#6C5CE7] flex items-center justify-center text-[10px] font-bold ring-2 ring-[#00F0FF]/20 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                  {((user.email || 'G').charAt(0)).toUpperCase()}
                </div>
                <span className="text-xs max-w-[100px] truncate text-gray-300 font-bold uppercase tracking-widest font-mono">{(user.email || 'Gamer').split('@')[0]}</span>
              </div>
            ) : (
              <>
                <LogIn size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Login</span>
              </>
            )}
          </Link>

          {/* Collapsible Hamburger Menu Open Trigger */}
          <button 
            className="lg:hidden p-1.5 sm:p-2 text-white hover:text-[#00F0FF] shrink-0 h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center select-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Smart Search */}
      <SmartSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Full Screen Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 w-screen h-[100dvh] bg-[#0B0B0F] flex flex-col justify-between z-[200] lg:hidden overflow-hidden shadow-2xl"
          >
            {/* Premium Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <Logo storeSettings={storeSettings} />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-white hover:text-[#00F0FF] rounded-xl transition-all font-black text-[10px] tracking-widest uppercase"
              >
                <X size={14} className="shrink-0" />
                <span>CLOSE</span>
              </button>
            </div>

            {/* Scrollable Content (Links Area) */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              
              {/* Premium Search Trigger */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSearchOpen(true);
                }}
                className="w-full text-xs font-black uppercase tracking-widest text-[#00F0FF] hover:text-white transition-all h-14 sm:h-16 px-5 border border-[#00F0FF]/20 hover:border-[#00F0FF] bg-[#00F0FF]/5 active:bg-[#00F0FF]/15 text-left flex items-center justify-between rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <Search size={16} />
                  <span>Search Catalog...</span>
                </div>
                <div className="border border-white/10 rounded-lg px-2 py-0.5 bg-black/40 text-[9px] text-gray-500 font-mono">
                  TAP
                </div>
              </button>

              {/* Large, Touch-Friendly Navigation Items */}
              <div className="space-y-3">
                {mobileLinks.map((link) => {
                  const isSupport = link.isSupport;
                  let icon = <Info size={18} className="text-gray-400 shrink-0" />;
                  let activeStyles = "border-white/5 active:bg-white/5 text-white active:text-[#00F0FF] active:border-[#00F0FF]/20";
                  
                  if (isSupport) {
                    icon = <HelpCircle size={18} className="text-red-400 shrink-0" />;
                    activeStyles = "border-red-500/10 active:border-red-500/30 active:bg-red-500/10 text-red-400";
                  } else if (link.path === '/') {
                    icon = <Home size={18} className="text-[#00F0FF] shrink-0" />;
                    activeStyles = "border-[#00F0FF]/15 active:border-[#00F0FF]/35 active:bg-[#00F0FF]/5 text-white";
                  } else if (link.path.includes('Hardware')) {
                    icon = <Cpu size={18} className="text-pink-400 shrink-0" />;
                    activeStyles = "border-pink-500/10 active:border-pink-500/30 active:bg-pink-500/10 text-white";
                  } else if (link.path.includes('Top')) {
                    icon = <Coins size={18} className="text-amber-400 shrink-0" />;
                    activeStyles = "border-amber-500/10 active:border-amber-500/30 active:bg-amber-500/10 text-white";
                  } else if (link.path === '/shop') {
                    icon = <ShoppingBag size={18} className="text-purple-400 shrink-0" />;
                    activeStyles = "border-purple-500/10 active:border-purple-500/30 active:bg-purple-500/10 text-white";
                  } else if (link.path === '/about') {
                    icon = <Info size={18} className="text-blue-400 shrink-0" />;
                    activeStyles = "border-blue-500/10 active:border-blue-500/30 active:bg-blue-500/10 text-white";
                  } else if (link.path === '/contact') {
                    icon = <PhoneCall size={18} className="text-emerald-400 shrink-0" />;
                    activeStyles = "border-emerald-500/10 active:border-emerald-500/30 active:bg-emerald-500/10 text-white";
                  } else if (link.path === '/lookup') {
                    icon = <Search size={18} className="text-indigo-400 shrink-0" />;
                    activeStyles = "border-indigo-500/10 active:border-indigo-500/30 active:bg-indigo-500/10 text-white";
                  }

                  return isSupport ? (
                    <button
                      key={link.name}
                      onClick={() => handleMobileLinkClick(link)}
                      className={`w-full flex items-center justify-between h-14 sm:h-16 px-5 bg-white/[0.01] hover:bg-white/[0.02] border rounded-2xl transition-all cursor-pointer select-none text-left font-black tracking-widest text-xs uppercase ${activeStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <span>{link.name}</span>
                      </div>
                      <ChevronRight size={16} className="opacity-40" />
                    </button>
                  ) : (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => handleMobileLinkClick(link)}
                      className={`w-full flex items-center justify-between h-14 sm:h-16 px-5 bg-white/[0.01] hover:bg-white/[0.02] border rounded-2xl transition-all cursor-pointer select-none font-black tracking-widest text-xs uppercase ${activeStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <span>{link.name}</span>
                      </div>
                      <ChevronRight size={16} className="opacity-40" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bottom Account & Controls Area */}
            <div className="flex-shrink-0 border-t border-white/5 bg-[#08080C] p-6 space-y-5">
              {user ? (
                <div className="space-y-4">
                  {/* User Profile Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#6C5CE7] flex items-center justify-center text-sm font-black ring-2 ring-[#00F0FF]/25 shadow-lg text-white">
                        {((user.email || 'G').charAt(0)).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-widest text-white truncate max-w-[150px]">
                          {(user.email || 'Gamer').split('@')[0]}
                        </div>
                        <div className="text-[9px] text-[#00F0FF] font-mono tracking-wider">{user.email}</div>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black rounded-lg border border-red-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      LOG OUT
                    </button>
                  </div>

                  {/* High Quality User Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link 
                      to="/profile?tab=profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-wider text-white"
                    >
                      <User size={14} className="text-[#00F0FF]" />
                      <span>Profile</span>
                    </Link>
                    
                    <Link 
                      to="/profile?tab=orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-wider text-white"
                    >
                      <Package size={14} className="text-purple-400" />
                      <span>Orders</span>
                    </Link>

                    <Link 
                      to="/profile?tab=wishlist"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-wider text-white"
                    >
                      <Heart size={14} className="text-pink-400" />
                      <span>Wishlist</span>
                    </Link>

                    <button 
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsCartOpen(true);
                      }}
                      className="flex items-center gap-2.5 px-3.5 py-3.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-wider text-white text-left"
                    >
                      <ShoppingCart size={14} className="text-amber-400" />
                      <span>Cart ({cart.reduce((total, item) => total + (item.quantity || 1), 0)})</span>
                    </button>

                    {isAdmin && (
                      <Link 
                        to="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="col-span-full flex items-center justify-center gap-2 px-3 py-3 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl hover:bg-[#00F0FF]/25 transition-all text-[10px] font-black uppercase tracking-wider text-[#00F0FF]"
                      >
                        <Settings size={14} />
                        <span>Admin Control Panel</span>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-center space-y-3">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-relaxed">
                      Sign in to view your profile dashboard, warranties, wishlist, and dynamic orders.
                    </p>
                    <Link 
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full py-3.5 bg-[#00F0FF] text-black hover:bg-[#33F3FF] rounded-xl font-black text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <LogIn size={14} />
                      <span>Login / Register</span>
                    </Link>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsCartOpen(true);
                    }}
                    className="w-full py-3.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={14} className="text-[#00F0FF]" />
                    <span>View Shopping Cart ({cart.reduce((total, item) => total + (item.quantity || 1), 0)})</span>
                  </button>
                </div>
              )}

              {/* Language Selector */}
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 px-4 py-3 rounded-xl">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Select Language</span>
                <button 
                  onClick={() => {
                    setLanguage(language === 'en' ? 'ar' : 'en');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-[#00F0FF]/10 border border-white/10 rounded-lg px-3 py-1.5 text-[#00F0FF] transition-all"
                >
                  {language === 'en' ? 'Arabic / العربية' : 'English / EN'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
