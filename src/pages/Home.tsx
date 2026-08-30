import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, Play, Star, ShieldCheck, Zap, Truck, X, Award, 
  HelpCircle, MessageSquare, Flame, CheckCircle2, ChevronDown, Image 
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import AIRecommender from '../components/AIRecommender';
import FlashSale from '../components/FlashSale';
import { useEffect, useState } from 'react';
import { collection, query, limit, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../App';

export default function Home() {
  const { t, language } = useLanguage();
  const { storeSettings } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [homepageSections, setHomepageSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<any>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Helper parser for YouTube custom trailer URL
  const getYoutubeEmbedUrl = (url: string = '') => {
    if (!url) return '';
    let videoId = '';
    try {
      if (url.includes('youtube.com/embed/')) {
        const parts = url.split('youtube.com/embed/');
        if (parts[1]) {
          videoId = parts[1].split(/[?#]/)[0];
        }
      } else if (url.includes('youtube.com/watch')) {
        const parts = url.split('?');
        if (parts[1]) {
          const searchParams = new URLSearchParams(parts[1]);
          videoId = searchParams.get('v') || '';
        }
      } else if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        if (parts[1]) {
          videoId = parts[1].split(/[?#]/)[0];
        }
      }
    } catch (e) {
      console.error("Failed to parse YouTube URL", e);
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return url; // Fallback in case they pasted an embed link directly
  };

  const trailerEmbedUrl = storeSettings?.trailerUrl ? getYoutubeEmbedUrl(storeSettings.trailerUrl) : '';
  const showTrailerButton = !!storeSettings?.trailerUrl;

  // Animated Banners State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [dbBanners, setDbBanners] = useState<any[]>([]);

  // Subscribe to cloud banners in real-time
  useEffect(() => {
    console.log("[HOME BANNERS ENGINE] Subscribing to featured_banners...");
    const unsub = onSnapshot(collection(db, 'featured_banners'), (snap) => {
      const parsed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const now = new Date();
      // Filter active and scheduled banners
      const active = parsed.filter((b: any) => {
        if (b.isActive === false) return false;
        if (b.isArchived === true) return false;
        if (b.startDate && now < new Date(b.startDate)) return false;
        if (b.endDate && now > new Date(b.endDate)) return false;
        return true;
      });
      // Sort active banners: displayOrder rising, then priority (high first)
      active.sort((a: any, b: any) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        const priorityVal: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (priorityVal[b.priority] || 0) - (priorityVal[a.priority] || 0);
      });
      setDbBanners(active);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'featured_banners');
    });
    return () => unsub();
  }, []);

  // Subscribe to dynamic homepage sections sorted by sortOrder
  useEffect(() => {
    console.log("[HOME SECTIONS ENGINE] Subscribing to homepage_sections...");
    const unsub = onSnapshot(collection(db, 'homepage_sections'), (snap) => {
      const parsed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const active = parsed.filter((s: any) => s.isActive !== false);
      active.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setHomepageSections(active);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'homepage_sections');
    });
    return () => unsub();
  }, []);

  // Subscribe to all active products in real-time
  useEffect(() => {
    console.log("[HOME PRODUCTS ENGINE] Subscribing to products...");
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(p => !p.isDeleted && !p.isHidden && !p.isArchived);
      setProducts(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
    });
    return () => unsub();
  }, []);

  const activeBanners = dbBanners;
  const resolvedBannerIndex = currentBannerIndex >= activeBanners.length ? 0 : currentBannerIndex;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch active deal
        const dealsQ = query(collection(db, 'flash_deals'), limit(1));
        const dealSnap = await getDocs(dealsQ);
        if (!dealSnap.empty) {
          const dealData: any = dealSnap.docs[0].data();
          const endTime = dealData.endTime?.toDate ? dealData.endTime.toDate() : new Date(dealData.endTime);
          if (endTime > new Date() && dealData.isActive) {
            setActiveDeal({ id: dealSnap.docs[0].id, ...dealData, endTime });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'home_deal');
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  // Testimonies and reviews
  const mockReviews = [
    { name: "Kareem Tawfik", rank: "Plat VIP Gamer", rate: 5, comment: "ZeroLag Games Store is the premier choice for Egyptian gamers. Bought FIFA 26 last slots, got my login info within 3 minutes on email! Dynamic support handles everything.", avatar: "KT" },
    { name: "Tarek Mansour", rank: "Diamond VIP Client", rate: 5, comment: "I have over 10 accounts under warranty here. When my PS5 slot got an authorization update, support responded on WhatsApp and reset things in under 5 minutes.", avatar: "TM" },
    { name: "Mariam El-Deeb", rank: "Gold VIP Member", rate: 5, comment: "Awesome cheap prices, the currency rate in Egypt makes PlayStation games extremely expensive but the shared slots system here is a life-saver!", avatar: "ME" }
  ];

  // Frequently Asked Questions
  const faqList = [
    {
      q: "What is a Digital Shared Account Slot (Primary vs Secondary)?",
      a: "Shared slots allow multiple users to play the same digital game under official license rules. A Primary slot lets you play the game on your own personal PSN profile even offline. A Secondary slot requires playing directly on the provided library profile connected to the internet."
    },
    {
      q: "How does the Automated Warranty System work?",
      a: "Every transaction automatically spins up a 1-Year SLA Warranty Contract in our database. If Sony alters account credentials or passwords, our robot system flags it, and you can view the updated password inside your Profile area instantly."
    },
    {
      q: "Can I convert or cancel my game account reservation?",
      a: "Yes! Any reservation holds a slot for 4 hours protected by our system. You can convert it to a paid sale at checkout or cancel it anytime. Stale reservations auto-expire automatically without fee penalties."
    },
    {
      q: "Is it safe to pay through InstaPay or Egyptian cards?",
      a: "Entirely. We utilize secure checkout forms. All credentials remain encrypted and stored directly under Google's Cloud Firestore security rules with instant transaction logging."
    }
  ];

  return (
    <div className="space-y-24 overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center pt-24 sm:pt-32 lg:pt-20 pb-12">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#00F0FF]/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#6C5CE7]/20 rounded-full blur-[100px] animate-pulse delay-700 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 lg:space-y-8 flex flex-col justify-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/5 backdrop-blur-sm self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping"></span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#00F0FF]">ZEROLAG STORE ULTIMATE OPERATIONAL CAPABILITIES</span>
            </div>
            
            <h1 id="hero-heading" className="font-black uppercase tracking-tighter leading-[0.9] text-left text-white animate-fade-in" style={{ fontSize: "clamp(2.2rem, 8vw, 4.5rem)" }}>
              {t('hero.title')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#6C5CE7] drop-shadow-[0_0_30px_rgba(0,240,255,0.3)]">
                {t('hero.subtitle')}
              </span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-lg leading-relaxed">
              Egypt's premium digital gaming warehouse. Level up with automated Shared Slots, instant license dispatch, smart reservation sweeps, and 1-Year dynamic safety warranty.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link 
                id="btn-explore-collection"
                to="/shop" 
                className="group relative px-6 sm:px-8 py-3.5 sm:py-4 bg-[#00F0FF] text-[#0B0B0F] font-black uppercase tracking-widest text-xs sm:text-sm rounded-xl overflow-hidden shadow-[0_0_20px_#00F0FF55] text-center flex items-center justify-center shrink-0 w-full sm:w-auto"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  EXPLORE SHOP <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                </span>
              </Link>
              {showTrailerButton && (
                <button 
                  id="btn-watch-trailer"
                  onClick={() => setIsTrailerOpen(true)}
                  className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-xl font-black uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Play size={16} fill="currentColor" /> Watch Trailer
                </button>
              )}
            </div>

            <div className="flex items-center gap-6 sm:gap-8 pt-4">
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black flex items-center gap-1">
                  <Star fill="#FF005C" color="#FF005C" size={16} />
                  4.9<span className="text-xs font-normal text-gray-500">/5</span>
                </div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-widest">Gamer Satisfaction</div>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black">20K+</div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-widest">Active Gamers</div>
              </div>
            </div>
          </motion.div>

          {/* Interactive Sliding Promotional Banner */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative block w-full"
          >
            {activeBanners.length === 0 ? (
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-[#151619] p-8 min-h-[420px] flex flex-col justify-center items-center text-center space-y-4">
                <Image className="text-gray-600 animate-pulse" size={48} />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">
                  No Featured Banners Available
                </h3>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest max-w-xs leading-relaxed font-mono">
                  Check back later or configure active campaign slides in administrative dashboard panels.
                </p>
              </div>
            ) : (
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-[#151619] p-8 min-h-[420px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={resolvedBannerIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase text-pink-400 tracking-widest">
                      <Flame size={12} className="animate-bounce" /> HOT CAMPAIGN SPECIAL
                    </div>
                    
                    <div className="space-y-2">
                      {activeBanners[resolvedBannerIndex]?.subtitle && (
                        <span className="text-xs font-black uppercase tracking-widest text-[#00F0FF] block">
                          {activeBanners[resolvedBannerIndex].subtitle}
                        </span>
                      )}
                      <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight">
                        {activeBanners[resolvedBannerIndex]?.title}
                      </h3>
                      {(activeBanners[resolvedBannerIndex]?.description || activeBanners[resolvedBannerIndex]?.desc) && (
                        <p className="text-gray-400 text-xs leading-relaxed font-semibold">
                          {activeBanners[resolvedBannerIndex].description || activeBanners[resolvedBannerIndex].desc}
                        </p>
                      )}
                    </div>

                    <div className="h-36 sm:h-44 rounded-2xl overflow-hidden border border-white/5 relative bg-[#090A0C] flex items-center justify-center">
                      <div 
                        className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-30 scale-110 pointer-events-none" 
                        style={{ backgroundImage: `url(${activeBanners[resolvedBannerIndex]?.imageUrl})` }}
                      ></div>
                      <img 
                        src={activeBanners[resolvedBannerIndex]?.mobileImageUrl && window.innerWidth < 640 
                          ? activeBanners[resolvedBannerIndex].mobileImageUrl 
                          : activeBanners[resolvedBannerIndex]?.imageUrl} 
                        alt="promo banner"
                        className="relative z-10 max-h-full max-w-full object-contain opacity-90"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                  <div className="flex gap-1.5">
                    {activeBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBannerIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          resolvedBannerIndex === idx ? 'w-6 bg-[#00F0FF]' : 'w-2 bg-white/15'
                        }`}
                      ></button>
                    ))}
                  </div>
                  <Link 
                    to={activeBanners[resolvedBannerIndex]?.buttonUrl || "/shop"} 
                    className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] hover:translate-x-1 transition-transform flex items-center gap-1"
                  >
                    {activeBanners[resolvedBannerIndex]?.buttonText || "STAKE CLAIM"} <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Trust Badges & Why Choose Us Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: <ShieldCheck size={28} className="text-[#00F0FF]" />, title: "SECURE ACCOUNT ENCRYPTION", desc: "Anti-hijack credentials. Each buyer gets specific assigned unique credentials." },
            { icon: <Truck size={28} className="text-[#00F0FF]" />, title: "INSTANT AUTO-DISPATCH", desc: "Zero lag indeed. Checkout with InstaPay or Visa, get credentials on screen & email." },
            { icon: <Zap size={28} className="text-[#00F0FF]" />, title: "1-YEAR FULL SLA WARRANTY", desc: "Locked and loaded. Dynamic password recovery directly from your dashboard." },
            { icon: <Award size={28} className="text-[#00F0FF]" />, title: "CRM VIP CONSTELLATION", desc: "Gain VIP ranks (Bronze to Diamond) automatically based on spending EGP." }
          ].map((item, idx) => (
            <div key={idx} className="p-6 bg-[#151619] rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                {item.icon}
              </div>
              <h4 className="text-xs font-black uppercase tracking-tight text-white leading-normal">{item.title}</h4>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Flash Sale Banner */}
      {activeDeal && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <FlashSale 
            productId={activeDeal.productId}
            name={activeDeal.name}
            price={activeDeal.price}
            discount={activeDeal.discount}
            imageUrl={activeDeal.imageUrl}
            endTime={activeDeal.endTime}
          />
        </section>
      )}

      {/* Dynamic Homepage Sections */}
      <div className="space-y-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-12 py-12">
            <div className="h-10 w-48 bg-white/5 rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[4/5] bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : homepageSections.length > 0 ? (
          homepageSections.map((section, sIdx) => {
            const sectionProducts = products.filter(p => section.assignedProductIds?.includes(p.id));
            return (
              <section key={section.id || sIdx} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                      {language === 'ar' ? (section.titleAr || section.titleEn) : (section.titleEn || section.titleAr)}
                    </h2>
                    <p className="text-gray-400 uppercase text-[10px] font-bold tracking-[0.2em]">
                      {language === 'ar' ? "مجموعة منسقة ومضمونة بالكامل" : "Curated gaming compilation with total warranty coverage"}
                    </p>
                  </div>
                </div>

                {section.bannerUrl && (
                  <div className="w-full h-36 md:h-52 rounded-[2rem] overflow-hidden border border-white/5 relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <img 
                      src={section.bannerUrl} 
                      alt={language === 'ar' ? section.titleAr : section.titleEn} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {sectionProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {sectionProducts.map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <ProductCard {...p} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-[#151619]/20 border border-white/5 rounded-3xl">
                    <p className="text-gray-500 uppercase font-black text-xs tracking-widest leading-relaxed">
                      {language === 'ar' ? "لا توجد ألعاب مخصصة في هذا القسم حالياً" : "No active items allocated to this dynamic section"}
                    </p>
                  </div>
                )}
              </section>
            );
          })
        ) : (
          /* Fallback view when no homepage sections are configured yet */
          <section className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
              <div className="space-y-2">
                <h2 className="text-5xl font-black uppercase tracking-tighter">
                  ZEROLAG <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-[#00F0FF]">COLLECTIONS</span>
                </h2>
                <p className="text-gray-400 uppercase text-xs font-bold tracking-[0.2em]">
                  {language === 'ar' 
                    ? "استكشف مجموعات الألعاب المميزة جاهزة للتسليم الفوري" 
                    : "Explore direct gamer segments ready for instant high-speed allocation"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.slice(0, 8).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard {...p} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* AI Recommendation Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AIRecommender />
      </section>

      {/* Enterprise Statistics Board */}
      <section className="bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-[#0B0B0F] border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          {[
            { metric: "50+ hrs", title: "AVERAGE RESPONSE TIME", subtitle: "Support Live SLA under 15mins" },
            { metric: "99.9%", title: "SUCCESSFUL PROVISIONS", subtitle: "Official licensing authentication" },
            { metric: "24,500 EGP", title: "VIP REBATE DISBURSED", subtitle: "Total Diamond tier returns" },
            { metric: "1-Year Full", title: "ACTIVE COMPREHENSIVE WARRANTY", subtitle: "Protected against password resets" }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-2"
            >
              <div className="text-4xl md:text-5xl font-black uppercase tracking-tight text-[#00F0FF] leading-none">{stat.metric}</div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#6C5CE7]">{stat.title}</h4>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.subtitle}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Customer Reviews & Feedback Visual Board */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#107C10]/10 text-green-400 rounded-full border border-green-400/20 text-[10px] uppercase font-black tracking-widest">
            <CheckCircle2 size={12} /> VERIFIED GAMER COMMUNITY
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">WHAT GAMERS ARE SAYING</h2>
          <p className="text-xs text-gray-500 uppercase font-black tracking-widest max-w-xl mx-auto">Real reviews synced from Google and local gaming forums</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mockReviews.map((rev, idx) => (
            <div key={idx} className="bg-[#151619] p-8 rounded-[2rem] border border-white/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex gap-1">
                  {[...Array(rev.rate)].map((_, i) => (
                    <Star key={i} size={14} fill="#00F0FF" color="#00F0FF" />
                  ))}
                </div>
                <p className="text-gray-300 text-xs font-semibold leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/25 to-transparent flex items-center justify-center font-black text-[#00F0FF] text-xs">
                  {rev.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight">{rev.name}</h4>
                  <span className="text-[9px] font-bold uppercase text-gray-400 tracking-wider font-mono">{rev.rank}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#151619]/40 border-y border-white/5 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
              <HelpCircle className="text-[#00F0FF]" size={36} /> FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Everything you need to know about digital licenses and provisions</p>
          </div>

          <div className="space-y-4">
            {faqList.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-[#151619] border border-white/5 hover:border-white/10 transition-colors rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex justify-between items-center gap-4 group"
                  >
                    <span className="text-xs md:text-sm font-black uppercase tracking-tight group-hover:text-[#00F0FF] transition-colors">{faq.q}</span>
                    <ChevronDown size={18} className={`text-gray-500 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#00F0FF]' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 border-t border-white/5 text-xs text-gray-400 leading-relaxed font-semibold uppercase tracking-wider">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* IMMERSIVE CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-[3rem] bg-gradient-to-r from-[#6C5CE7] to-[#00F0FF] p-12 lg:p-20 overflow-hidden text-center space-y-8"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl text-[#00F0FF]"></div>
          
          <h2 className="text-4xl md:text-7xl font-black text-[#0B0B0F] uppercase tracking-tighter leading-none relative z-10">
            ZEROLAG ECOSYSTEM <br /> IS LIVE FOR SERVICE
          </h2>
          <p className="text-[#0B0B0F]/70 font-bold uppercase text-sm tracking-widest max-w-xl mx-auto relative z-10">
            Register your active digital gaming vault profile and automatically start acquiring EGP VIP loyalty rewards now!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
             <Link to="/login" className="px-10 py-5 bg-[#0B0B0F] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
               Register Digital Account
             </Link>
             <Link to="/contact" className="px-10 py-5 bg-white/20 text-[#0B0B0F] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/30 transition-all">
               Connect WhatsApp Support
             </Link>
          </div>
        </motion.div>
      </section>

      {/* Trailer Modal */}
      <AnimatePresence>
        {isTrailerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B0B0F]/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,240,255,0.2)] border border-white/10 bg-black"
            >
              <button 
                onClick={() => setIsTrailerOpen(false)}
                className="absolute top-6 right-6 z-10 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-[#00F0FF] hover:text-black transition-all"
              >
                <X size={24} />
              </button>
              <iframe 
                className="w-full h-full"
                src={trailerEmbedUrl} 
                title="ZeroLag Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
