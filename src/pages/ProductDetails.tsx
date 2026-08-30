import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { formatPrice } from '../lib/utils';
import { 
  Phone, ShieldCheck, Zap, Info, ChevronLeft, ShoppingCart, MessageSquare, 
  Heart, Check, Plus, Minus, Star, Monitor, Gamepad2, Layers, Tag, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import ReviewSection from '../components/ReviewSection';
import { normalizeProductConfig, NormalizedProductStructure } from '../lib/productNormalizer';

export default function ProductDetails() {
  const { id } = useParams();
  const { wishlist, toggleWishlist, addToCart, cart, storeSettings } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Digital accounts live slot counts for real-time verification
  const [dbSlotStock, setDbSlotStock] = useState<{
    PS5_PRIMARY?: number;
    PS5_SECONDARY?: number;
    PS4_PRIMARY?: number;
    PS4_SECONDARY?: number;
  }>({});

  // Normalized product representation
  const normalized: NormalizedProductStructure = useMemo(() => {
    return normalizeProductConfig(product);
  }, [product]);

  // Selected Platform (for Game Category: 'PlayStation' | 'PC' | 'Xbox')
  const [selectedPlatform, setSelectedPlatform] = useState<'PlayStation' | 'PC' | 'Xbox'>('PlayStation');

  // Selected Variant / Edition / Slot
  // For PlayStation: { generation: 'PS5' | 'PS4', purchaseType: 'Primary' | 'Secondary' }
  const [selectedPSGen, setSelectedPSGen] = useState<'PS5' | 'PS4'>('PS5');
  const [selectedPSType, setSelectedPSType] = useState<'Primary' | 'Secondary'>('Primary');

  // For PC Editions
  const [selectedPCEditionId, setSelectedPCEditionId] = useState<string>('');

  // For Xbox Editions
  const [selectedXboxEditionId, setSelectedXboxEditionId] = useState<string>('');

  // For Top-Up & Gift Card Denominations
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  // For Subscription Plans
  const [selectedSubPlanId, setSelectedSubPlanId] = useState<string>('');

  // Synchronize initial selections when product changes
  useEffect(() => {
    if (!product) return;

    // Platform init
    if (normalized.activePlatforms.length > 0) {
      if (!normalized.activePlatforms.includes(selectedPlatform)) {
        setSelectedPlatform(normalized.activePlatforms[0]);
      }
    }

    // PlayStation Gen & Type init
    const ps = normalized.gameConfig.playstation;
    if (ps.enabled) {
      if (ps.ps5.enabled) {
        setSelectedPSGen('PS5');
        if (ps.ps5.primary.enabled) {
          setSelectedPSType('Primary');
        } else if (ps.ps5.secondary.enabled) {
          setSelectedPSType('Secondary');
        }
      } else if (ps.ps4.enabled) {
        setSelectedPSGen('PS4');
        if (ps.ps4.primary.enabled) {
          setSelectedPSType('Primary');
        } else if (ps.ps4.secondary.enabled) {
          setSelectedPSType('Secondary');
        }
      }
    }

    // PC Edition init
    if (normalized.gameConfig.pc.enabled && normalized.gameConfig.pc.editions.length > 0) {
      setSelectedPCEditionId(normalized.gameConfig.pc.editions[0].id);
    }

    // Xbox Edition init
    if (normalized.gameConfig.xbox.enabled && normalized.gameConfig.xbox.editions.length > 0) {
      setSelectedXboxEditionId(normalized.gameConfig.xbox.editions[0].id);
    }

    // Top Up / Gift Card Package init
    if (normalized.topUpPackages.length > 0) {
      setSelectedPackageId(normalized.topUpPackages[0].id);
    }

    // Subscription Plan init
    if (normalized.subscriptionPlans.length > 0) {
      setSelectedSubPlanId(normalized.subscriptionPlans[0].id);
    }
  }, [product, normalized]);

  // Fetch product and real-time accounts from Firestore
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() };
          setProduct(prodData);

          // Fetch accounts slot stock in background if available
          try {
            const accountsQuery = query(collection(db, 'accounts'), where('productId', '==', id));
            const accountsSnap = await getDocs(accountsQuery);
            let ps4p = 0;
            let ps5p = 0;
            let sec = 0;

            accountsSnap.forEach(accDoc => {
              const acc = accDoc.data();
              if (Array.isArray(acc.slots)) {
                acc.slots.forEach((s: any) => {
                  if (s.status === 'AVAILABLE') {
                    if (s.slotType === 'PS4_PRIMARY') ps4p++;
                    else if (s.slotType === 'PS5_PRIMARY') ps5p++;
                    else if (s.slotType === 'SECONDARY') sec++;
                  }
                });
              }
            });

            if (accountsSnap.docs.length > 0) {
              setDbSlotStock({
                PS4_PRIMARY: ps4p,
                PS5_PRIMARY: ps5p,
                PS5_SECONDARY: sec,
                PS4_SECONDARY: sec
              });
            }
          } catch (e) {
            // Accounts query is optional / admin protected
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // -------------------------------------------------------------
  // CURRENT ACTIVE VARIANT RESOLUTION (Price, Stock, Label, Key)
  // -------------------------------------------------------------
  const activeVariant = useMemo(() => {
    const isGlobalOutOfStock = product?.stockStatus === 'Out of Stock';

    if (normalized.categoryType === 'Hardware') {
      const stock = isGlobalOutOfStock ? 0 : Math.max(0, normalized.hardwareConfig.stock);
      return {
        key: 'HARDWARE',
        label: 'Hardware Unit',
        platform: 'Hardware',
        price: normalized.hardwareConfig.price,
        stock,
        inStock: stock > 0
      };
    }

    if (normalized.categoryType === 'Top Up' || normalized.categoryType === 'Gift Cards') {
      const pkg = normalized.topUpPackages.find(p => p.id === selectedPackageId) || normalized.topUpPackages[0];
      const stock = isGlobalOutOfStock ? 0 : (pkg ? Math.max(0, pkg.stock) : 0);
      return {
        key: `PKG-${pkg?.id || 'default'}`,
        label: pkg?.name || 'Denomination Package',
        platform: normalized.categoryType,
        price: pkg?.price || product?.price || 0,
        stock,
        inStock: stock > 0
      };
    }

    if (normalized.categoryType === 'Subscription') {
      const plan = normalized.subscriptionPlans.find(s => s.id === selectedSubPlanId) || normalized.subscriptionPlans[0];
      const stock = isGlobalOutOfStock ? 0 : (plan ? Math.max(0, plan.stock) : 0);
      return {
        key: `SUB-${plan?.id || 'default'}`,
        label: plan?.name || `${plan?.duration || '12 Months'} Plan`,
        platform: 'Subscription',
        price: plan?.price || product?.price || 0,
        stock,
        inStock: stock > 0
      };
    }

    // GAME CATEGORY: Check selected platform
    if (selectedPlatform === 'PC') {
      const edition = normalized.gameConfig.pc.editions.find(e => e.id === selectedPCEditionId) || normalized.gameConfig.pc.editions[0];
      const stock = isGlobalOutOfStock ? 0 : (edition ? Math.max(0, edition.stock) : 0);
      return {
        key: `PC-${edition?.id || 'std'}`,
        label: `PC ${edition?.name || 'Standard Edition'}`,
        platform: 'PC',
        price: edition?.price || product?.price || 0,
        stock,
        inStock: stock > 0
      };
    }

    if (selectedPlatform === 'Xbox') {
      const edition = normalized.gameConfig.xbox.editions.find(e => e.id === selectedXboxEditionId) || normalized.gameConfig.xbox.editions[0];
      const stock = isGlobalOutOfStock ? 0 : (edition ? Math.max(0, edition.stock) : 0);
      return {
        key: `XBOX-${edition?.id || 'std'}`,
        label: `Xbox ${edition?.name || 'Standard Edition'}`,
        platform: 'Xbox',
        price: edition?.price || product?.price || 0,
        stock,
        inStock: stock > 0
      };
    }

    // Default: PLAYSTATION
    const ps = normalized.gameConfig.playstation;
    const genConfig = selectedPSGen === 'PS5' ? ps.ps5 : ps.ps4;
    const typeConfig = selectedPSType === 'Primary' ? genConfig.primary : genConfig.secondary;

    // Check if slot db stock overrides or use configured stock
    let slotStock = typeConfig.stock;
    const dbKey = `${selectedPSGen}_${selectedPSType.toUpperCase()}` as keyof typeof dbSlotStock;
    if (dbSlotStock[dbKey] !== undefined) {
      slotStock = dbSlotStock[dbKey]!;
    }
    const finalStock = isGlobalOutOfStock ? 0 : Math.max(0, slotStock);

    return {
      key: `PS-${selectedPSGen}-${selectedPSType.toUpperCase()}`,
      label: `PlayStation ${selectedPSGen} ${selectedPSType} Slot`,
      platform: `PS${selectedPSGen === 'PS5' ? '5' : '4'}`,
      price: typeConfig.price,
      stock: finalStock,
      inStock: finalStock > 0
    };
  }, [normalized, selectedPlatform, selectedPSGen, selectedPSType, selectedPCEditionId, selectedXboxEditionId, selectedPackageId, selectedSubPlanId, product, dbSlotStock]);

  const currentPrice = activeVariant.price;
  const currentDiscount = product?.discount || 0;
  const finalPrice = currentDiscount > 0 ? currentPrice * (1 - currentDiscount / 100) : currentPrice;
  const availableStock = activeVariant.stock;

  // Clamped quantity
  useEffect(() => {
    if (availableStock <= 0) {
      setQuantity(0);
    } else if (quantity > availableStock) {
      setQuantity(availableStock);
    } else if (quantity === 0 && availableStock > 0) {
      setQuantity(1);
    }
  }, [availableStock]);

  const cartItemId = `${id}-${activeVariant.key}`;
  const isInCart = cart.some(item => item.id === cartItemId || (normalized.categoryType === 'Hardware' && item.baseProductId === id));
  const isWishlisted = wishlist.includes(id || '');

  const handleAddToCart = () => {
    if (!product || availableStock <= 0) return;

    const itemToCart = {
      ...product,
      id: normalized.categoryType === 'Hardware' ? product.id : cartItemId,
      baseProductId: product.id,
      selectedSlotType: activeVariant.key,
      selectedVersion: activeVariant.label,
      selectedPlatform: activeVariant.platform,
      variantStock: availableStock,
      price: currentPrice,
      discount: currentDiscount
    };

    addToCart(itemToCart, quantity || 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ZeroLag Store, I would like to inquire about ${product?.name} (${activeVariant.label}) at ${formatPrice(finalPrice)}.`
  );
  const whatsappNumber = storeSettings?.whatsApp || '01114763125';
  const whatsappUrl = `https://wa.me/20${whatsappNumber.replace(/^0/, '')}?text=${whatsappMessage}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-2xl font-black mb-4">PRODUCT NOT FOUND</h2>
        <p className="text-gray-400 mb-6">The item you are looking for does not exist in our catalog.</p>
        <Link to="/" className="px-6 py-3 bg-[#00F0FF] text-[#0B0B0F] font-black rounded-xl text-xs uppercase tracking-widest">
          Return to Storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#00F0FF] transition-colors">
          <ChevronLeft size={16} /> Back to Catalog
        </Link>

        {/* Main Product Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Media Showcase */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-6 space-y-4"
          >
            <div className="relative w-full bg-[#151619]/90 rounded-3xl border border-white/5 shadow-2xl flex items-center justify-center p-3 sm:p-5">
              <img 
                src={product.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200"} 
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-auto h-auto max-w-full max-h-[680px] object-contain object-center rounded-2xl mx-auto block"
              />
              
              {product.discount > 0 && (
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-[#00F0FF] text-[#0B0B0F] px-4 py-1.5 rounded-xl font-black uppercase tracking-tight shadow-[0_0_25px_rgba(0,240,255,0.4)] text-xs z-10">
                  -{product.discount}% OFF
                </div>
              )}

              {/* Stock Status Badge */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${
                  activeVariant.inStock 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                }`}>
                  {activeVariant.inStock ? `IN STOCK (${activeVariant.stock})` : 'OUT OF STOCK'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Configuration & Purchase Controls */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-6 flex flex-col justify-center space-y-8"
          >
            {/* Header / Badges */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">
                  {product.category || 'Digital Game'}
                </span>
                {product.genre && (
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {product.genre}
                  </span>
                )}
                {product.subcategory && (
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#6C5CE7]">
                    {product.subcategory}
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight break-words">
                {product.name}
              </h1>

              {/* Dynamic Live Price Display */}
              <div className="flex items-end gap-3 pt-2">
                <span className="text-4xl font-black text-[#00F0FF] drop-shadow-[0_0_15px_rgba(0,240,255,0.4)] font-mono">
                  {formatPrice(finalPrice)}
                </span>
                {currentDiscount > 0 && (
                  <span className="text-lg text-gray-500 line-through mb-1 font-mono">
                    {formatPrice(currentPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. GAME CATEGORY CONFIGURABLE PLATFORM & VARIANT SELECTOR */}
            {/* ========================================================================= */}
            {normalized.categoryType === 'Game' && (
              <div className="space-y-6 bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl">
                
                {/* Platform Selector Bar (Breakers Store style: [ PlayStation ] [ PC ] [ Xbox ]) */}
                {normalized.activePlatforms.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF] flex items-center gap-1.5">
                        <Gamepad2 size={13} /> Select Gaming Platform
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 uppercase">
                        {normalized.activePlatforms.length} Platform{normalized.activePlatforms.length > 1 ? 's' : ''} Available
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {normalized.activePlatforms.map(plat => {
                        const isPlatSelected = selectedPlatform === plat;
                        return (
                          <button
                            key={plat}
                            type="button"
                            onClick={() => setSelectedPlatform(plat)}
                            className={`py-3 px-2 rounded-2xl border text-center font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                              isPlatSelected
                                ? 'bg-[#00F0FF] text-black border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.3)] scale-[1.02]'
                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {plat === 'PlayStation' && <Gamepad2 size={14} />}
                            {plat === 'PC' && <Monitor size={14} />}
                            {plat === 'Xbox' && <Gamepad2 size={14} />}
                            <span>{plat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* PLAYSTATION CONFIGURATION & GENERATION SWITCH */}
                {/* ------------------------------------------------------------- */}
                {selectedPlatform === 'PlayStation' && normalized.gameConfig.playstation.enabled && (
                  <div className="space-y-5 pt-2 border-t border-white/5">
                    
                    {/* PS5 Generation Section (ONLY renders if PS5 is enabled) */}
                    {normalized.gameConfig.playstation.ps5.enabled && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-1.5">
                            PlayStation 5 (PS5)
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">Fast SSD & 4K Ready</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* PS5 Primary */}
                          {normalized.gameConfig.playstation.ps5.primary.enabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPSGen('PS5');
                                setSelectedPSType('Primary');
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                selectedPSGen === 'PS5' && selectedPSType === 'Primary'
                                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between w-full mb-1">
                                <div>
                                  <div className="text-xs font-black uppercase text-white tracking-wider">PS5 Primary</div>
                                  <div className="text-[9px] text-gray-400">Play on your personal profile</div>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPSGen === 'PS5' && selectedPSType === 'Primary' ? 'border-[#00F0FF]' : 'border-white/20'}`}>
                                  {selectedPSGen === 'PS5' && selectedPSType === 'Primary' && <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <span className="text-sm font-black font-mono text-[#00F0FF]">
                                  {formatPrice(normalized.gameConfig.playstation.ps5.primary.price)}
                                </span>
                                <span className={`text-[9px] font-mono font-bold uppercase ${normalized.gameConfig.playstation.ps5.primary.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {normalized.gameConfig.playstation.ps5.primary.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </button>
                          )}

                          {/* PS5 Secondary */}
                          {normalized.gameConfig.playstation.ps5.secondary.enabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPSGen('PS5');
                                setSelectedPSType('Secondary');
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                selectedPSGen === 'PS5' && selectedPSType === 'Secondary'
                                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between w-full mb-1">
                                <div>
                                  <div className="text-xs font-black uppercase text-white tracking-wider">PS5 Secondary</div>
                                  <div className="text-[9px] text-gray-400">Play directly on game account</div>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPSGen === 'PS5' && selectedPSType === 'Secondary' ? 'border-[#00F0FF]' : 'border-white/20'}`}>
                                  {selectedPSGen === 'PS5' && selectedPSType === 'Secondary' && <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <span className="text-sm font-black font-mono text-[#00F0FF]">
                                  {formatPrice(normalized.gameConfig.playstation.ps5.secondary.price)}
                                </span>
                                <span className={`text-[9px] font-mono font-bold uppercase ${normalized.gameConfig.playstation.ps5.secondary.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {normalized.gameConfig.playstation.ps5.secondary.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PS4 Generation Section (ONLY renders if PS4 is enabled! If disabled, completely disappears) */}
                    {normalized.gameConfig.playstation.ps4.enabled && (
                      <div className="space-y-2.5 pt-3 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-1.5">
                            PlayStation 4 (PS4)
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">PS4 & PS4 Pro Compatible</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* PS4 Primary */}
                          {normalized.gameConfig.playstation.ps4.primary.enabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPSGen('PS4');
                                setSelectedPSType('Primary');
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                selectedPSGen === 'PS4' && selectedPSType === 'Primary'
                                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between w-full mb-1">
                                <div>
                                  <div className="text-xs font-black uppercase text-white tracking-wider">PS4 Primary</div>
                                  <div className="text-[9px] text-gray-400">Play on your personal PS4 profile</div>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPSGen === 'PS4' && selectedPSType === 'Primary' ? 'border-[#00F0FF]' : 'border-white/20'}`}>
                                  {selectedPSGen === 'PS4' && selectedPSType === 'Primary' && <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <span className="text-sm font-black font-mono text-[#00F0FF]">
                                  {formatPrice(normalized.gameConfig.playstation.ps4.primary.price)}
                                </span>
                                <span className={`text-[9px] font-mono font-bold uppercase ${normalized.gameConfig.playstation.ps4.primary.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {normalized.gameConfig.playstation.ps4.primary.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </button>
                          )}

                          {/* PS4 Secondary */}
                          {normalized.gameConfig.playstation.ps4.secondary.enabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPSGen('PS4');
                                setSelectedPSType('Secondary');
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                selectedPSGen === 'PS4' && selectedPSType === 'Secondary'
                                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between w-full mb-1">
                                <div>
                                  <div className="text-xs font-black uppercase text-white tracking-wider">PS4 Secondary</div>
                                  <div className="text-[9px] text-gray-400">Play directly on account profile</div>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPSGen === 'PS4' && selectedPSType === 'Secondary' ? 'border-[#00F0FF]' : 'border-white/20'}`}>
                                  {selectedPSGen === 'PS4' && selectedPSType === 'Secondary' && <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                <span className="text-sm font-black font-mono text-[#00F0FF]">
                                  {formatPrice(normalized.gameConfig.playstation.ps4.secondary.price)}
                                </span>
                                <span className={`text-[9px] font-mono font-bold uppercase ${normalized.gameConfig.playstation.ps4.secondary.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {normalized.gameConfig.playstation.ps4.secondary.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* PC CONFIGURATION & EDITIONS (NO PS4/PS5 OR PRIMARY/SECONDARY) */}
                {/* ------------------------------------------------------------- */}
                {selectedPlatform === 'PC' && normalized.gameConfig.pc.enabled && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-1.5">
                        <Monitor size={13} /> Available PC Editions & Keys
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 uppercase">Steam / Epic / Digital Key</span>
                    </div>

                    <div className="space-y-2">
                      {normalized.gameConfig.pc.editions.map(edition => {
                        const isEdSelected = selectedPCEditionId === edition.id;
                        const edPrice = edition.price || product.price || 0;
                        const edFinal = product.discount > 0 ? edPrice * (1 - product.discount / 100) : edPrice;
                        const inStock = edition.stock > 0;

                        return (
                          <button
                            key={edition.id}
                            type="button"
                            onClick={() => setSelectedPCEditionId(edition.id)}
                            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                              isEdSelected
                                ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-white tracking-wider">
                                  {edition.name}
                                </span>
                                {edition.type && (
                                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[8px] font-black rounded-md uppercase">
                                    {edition.type}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                Region: {edition.region || 'Global'} • Instant Delivery
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <div className="text-sm font-black font-mono text-[#00F0FF]">
                                {formatPrice(edFinal)}
                              </div>
                              <span className={`text-[9px] font-mono font-bold uppercase block ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
                                {inStock ? `In Stock (${edition.stock})` : 'Out of Stock'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* XBOX CONFIGURATION & EDITIONS (NO PS4/PS5) */}
                {/* ------------------------------------------------------------- */}
                {selectedPlatform === 'Xbox' && normalized.gameConfig.xbox.enabled && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-1.5">
                        <Gamepad2 size={13} /> Available Xbox Editions & Generations
                      </span>
                      <span className="text-[9px] font-mono text-gray-500 uppercase">Xbox Series X/S & Xbox One</span>
                    </div>

                    <div className="space-y-2">
                      {normalized.gameConfig.xbox.editions.map(edition => {
                        const isEdSelected = selectedXboxEditionId === edition.id;
                        const edPrice = edition.price || product.price || 0;
                        const edFinal = product.discount > 0 ? edPrice * (1 - product.discount / 100) : edPrice;
                        const inStock = edition.stock > 0;

                        return (
                          <button
                            key={edition.id}
                            type="button"
                            onClick={() => setSelectedXboxEditionId(edition.id)}
                            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                              isEdSelected
                                ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-white tracking-wider">
                                  {edition.name}
                                </span>
                                {edition.generation && (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-md uppercase">
                                    {edition.generation}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                Xbox Live / Digital License
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <div className="text-sm font-black font-mono text-[#00F0FF]">
                                {formatPrice(edFinal)}
                              </div>
                              <span className={`text-[9px] font-mono font-bold uppercase block ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
                                {inStock ? `In Stock (${edition.stock})` : 'Out of Stock'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. TOP UP & GIFT CARDS DENOMINATIONS / PACKAGES */}
            {/* ========================================================================= */}
            {(normalized.categoryType === 'Top Up' || normalized.categoryType === 'Gift Cards') && (
              <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF] flex items-center gap-1.5">
                    <Zap size={13} /> Select Card Denomination / Amount
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 uppercase">Instant Key / Digital Pin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {normalized.topUpPackages.map(pkg => {
                    const isSelected = selectedPackageId === pkg.id;
                    const pkgPrice = pkg.price || product.price || 0;
                    const finalPkgPrice = product.discount > 0 ? pkgPrice * (1 - product.discount / 100) : pkgPrice;
                    const inStock = pkg.stock > 0;

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-black uppercase text-white tracking-wider">
                              {pkg.name}
                            </span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#00F0FF]' : 'border-white/20'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>}
                            </div>
                          </div>
                          {pkg.bonus && (
                            <span className="inline-block text-[9px] font-mono text-emerald-400 font-bold uppercase mb-1">
                              +{pkg.bonus}
                            </span>
                          )}
                          <div className="text-sm font-black font-mono text-[#00F0FF] mt-1">
                            {formatPrice(finalPkgPrice)}
                          </div>
                        </div>

                        <div className="text-[9px] font-mono font-bold uppercase mt-2 pt-2 border-t border-white/5">
                          <span className={inStock ? "text-emerald-400" : "text-red-400"}>
                            {inStock ? `In Stock (${pkg.stock})` : 'Out of Stock'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. SUBSCRIPTIONS PLANS (1M, 3M, 12M) */}
            {/* ========================================================================= */}
            {normalized.categoryType === 'Subscription' && (
              <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF] flex items-center gap-1.5">
                    <Layers size={13} /> Select Subscription Duration & Plan
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 uppercase">Instant Activation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {normalized.subscriptionPlans.map(plan => {
                    const isSelected = selectedSubPlanId === plan.id;
                    const planPrice = plan.price || product.price || 0;
                    const finalPlanPrice = product.discount > 0 ? planPrice * (1 - product.discount / 100) : planPrice;
                    const inStock = plan.stock > 0;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedSubPlanId(plan.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.15)] ring-1 ring-[#00F0FF]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black uppercase text-white tracking-wider mb-1">
                            {plan.duration}
                          </div>
                          <div className="text-[9px] text-gray-400 truncate">{plan.name}</div>
                          <div className="text-sm font-black font-mono text-[#00F0FF] mt-2">
                            {formatPrice(finalPlanPrice)}
                          </div>
                        </div>

                        <div className="text-[9px] font-mono font-bold uppercase mt-2 pt-2 border-t border-white/5">
                          <span className={inStock ? "text-emerald-400" : "text-red-400"}>
                            {inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. HARDWARE SPEC & AVAILABILITY */}
            {/* ========================================================================= */}
            {normalized.categoryType === 'Hardware' && (
              <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF] block">
                  Hardware Specifications & Warranty
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[9px] font-black uppercase text-gray-400 block">Condition</span>
                    <span className="text-xs font-black text-white">{normalized.hardwareConfig.condition || 'Brand New Official'}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-[9px] font-black uppercase text-gray-400 block">Agency Warranty</span>
                    <span className="text-xs font-black text-emerald-400">{normalized.hardwareConfig.warranty || '1 Year Official'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="py-6 border-y border-white/5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                <Info size={14} /> Product Details & Synopsis
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xl break-words whitespace-pre-wrap">
                {product.description || product.shortDescription || "Unlock premium gaming content with instant verified digital fulfillment, full warranty backing, and 24/7 gamer support from ZeroLag."}
              </p>
            </div>

            {/* Action Buttons & Strict Stock Validation */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Quantity Stepper */}
                <div className="flex items-center bg-[#151619] border border-white/10 rounded-2xl h-[60px] px-2 w-full sm:w-40 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setQuantity(q => Math.max(availableStock > 0 ? 1 : 0, q - 1))}
                    disabled={availableStock <= 0}
                    className="flex-1 h-full flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center text-lg font-black font-mono">{availableStock > 0 ? quantity : 0}</span>
                  <button 
                    type="button"
                    onClick={() => setQuantity(q => availableStock > 0 ? Math.min(availableStock, q + 1) : 0)}
                    disabled={availableStock <= 0 || quantity >= availableStock}
                    className="flex-1 h-full flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Add to Cart Button (Strictly Disabled when availableStock is 0) */}
                <button 
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isInCart || availableStock <= 0}
                  className={`w-full flex-1 px-8 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${
                    availableStock <= 0
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed opacity-60'
                      : isInCart || isAdded
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                        : 'bg-[#00F0FF] text-[#0B0B0F] shadow-[0_0_30px_rgba(0,240,255,0.25)] hover:bg-[#33F3FF] hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {availableStock <= 0 ? (
                      <motion.div
                        key="outofstock"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <AlertTriangle size={20} />
                        <span>Out Of Stock</span>
                      </motion.div>
                    ) : isAdded || isInCart ? (
                      <motion.div
                        key="added"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Check size={20} />
                        <span>Added to Cart</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="add"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart size={20} />
                        <span>Add to Cart ({formatPrice(finalPrice)})</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Auxiliary Buttons */}
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={`flex-1 px-6 py-3.5 border rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 transition-all ${
                    isWishlisted 
                      ? 'bg-[#FF005C] text-white border-[#FF005C] shadow-[0_0_30px_rgba(255,0,92,0.3)]' 
                      : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
                  {isWishlisted ? 'Saved in Vault' : 'Add to Wishlist'}
                </button>

                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3.5 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 hover:bg-[#25D366] hover:text-white transition-all group"
                >
                  <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                  Order on WhatsApp
                </a>
              </div>
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2.5">
                <Zap className="text-[#00F0FF]" size={18} />
                <div className="text-[9px] uppercase font-black tracking-widest text-gray-400">Instant Delivery</div>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="text-[#00F0FF]" size={18} />
                <div className="text-[9px] uppercase font-black tracking-widest text-gray-400">Full Warranty</div>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="text-[#00F0FF]" size={18} />
                <div className="text-[9px] uppercase font-black tracking-widest text-gray-400">24/7 Gamer Support</div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="pt-10">
              <ReviewSection productId={id!} />
            </div>

          </motion.div>

        </div>
      </div>
    </div>
  );
}
