import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { formatPrice } from '../lib/utils';
import { Phone, ShieldCheck, Zap, Info, ChevronLeft, ShoppingCart, MessageSquare, Heart, Check, Plus, Minus, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import ReviewSection from '../components/ReviewSection';

export default function ProductDetails() {
  const { id } = useParams();
  const { wishlist, toggleWishlist, addToCart, cart, storeSettings } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSlotType, setSelectedSlotType] = useState<'PS4_PRIMARY' | 'PS5_PRIMARY' | 'SECONDARY'>('PS5_PRIMARY');
  const [stockCounts, setStockCounts] = useState({
    PS4_PRIMARY: 0,
    PS5_PRIMARY: 0,
    SECONDARY: 0
  });

  const getSlotPrice = (type: string) => {
    if (product?.category === 'Hardware') {
      return product?.price || 0;
    }
    switch (type) {
      case 'PS4_PRIMARY': return product?.pricePS4Primary || 0;
      case 'PS5_PRIMARY': return product?.pricePS5Primary || 0;
      case 'SECONDARY': return product?.priceSecondary || 0;
      default: return 0;
    }
  };

  const currentPrice = getSlotPrice(selectedSlotType);
  const currentDiscount = product?.discount || 0;
  const finalPrice = currentDiscount > 0 ? currentPrice * (1 - currentDiscount / 100) : currentPrice;

  const isInCart = cart.some(item => 
    product?.category === 'Hardware' 
      ? item.baseProductId === id
      : item.id === `${id}-${selectedSlotType}`
  );
  const isWishlisted = wishlist.includes(id || '');

  const isHardware = product?.category === 'Hardware';
  const availableStock = product
    ? (product.stockStatus === 'Out of Stock'
        ? 0
        : (isHardware
            ? Math.max(0, product.ps4PrimaryStock ?? 0)
            : Math.max(0, stockCounts[selectedSlotType] ?? 0)))
    : 0;

  useEffect(() => {
    if (availableStock === 0) {
      setQuantity(0);
    } else if (quantity > availableStock) {
      setQuantity(availableStock);
    } else if (quantity === 0 && availableStock > 0) {
      setQuantity(1);
    }
  }, [availableStock]);

  const handleAddToCart = () => {
    if (product) {
      const isHardware = product.category === 'Hardware';
      const itemToCart = {
        ...product,
        id: isHardware ? product.id : `${product.id}-${selectedSlotType}`,
        baseProductId: product.id,
        selectedSlotType: isHardware ? 'STANDARD' : selectedSlotType,
        price: isHardware ? product.price : currentPrice,
        discount: currentDiscount
      };
      addToCart(itemToCart, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setProduct(data);

          // Fetch accounts associated with this product to calculate stocks
          const counts = {
            PS4_PRIMARY: 0,
            PS5_PRIMARY: 0,
            SECONDARY: 0
          };

          const hasPS4Field = typeof data.ps4PrimaryStock === 'number';
          const hasPS5Field = typeof data.ps5PrimaryStock === 'number';
          const hasSecField = typeof data.secondaryStock === 'number';

          if (data.stockStatus === 'Out of Stock') {
            counts.PS4_PRIMARY = 0;
            counts.PS5_PRIMARY = 0;
            counts.SECONDARY = 0;
          } else {
            counts.PS4_PRIMARY = hasPS4Field ? Math.max(0, data.ps4PrimaryStock) : 0;
            counts.PS5_PRIMARY = hasPS5Field ? Math.max(0, data.ps5PrimaryStock) : 0;
            counts.SECONDARY = hasSecField ? Math.max(0, data.secondaryStock) : 0;
          }
          setStockCounts(counts);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#00F0FF] uppercase text-xs font-black tracking-widest">Loading Game Data...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-6">
        <h2 className="text-4xl font-black uppercase">Product Not Found</h2>
        <Link to="/shop" className="text-[#00F0FF] font-black uppercase tracking-widest hover:underline">Back to Shop</Link>
      </div>
    );
  }

  const waVal = storeSettings?.whatsApp || "01114763125";
  const cleanWaVal = waVal.startsWith('0') ? '2' + waVal : (waVal.startsWith('+') ? waVal.slice(1) : '2' + waVal);
  const whatsappMsg = encodeURIComponent(`Hello Zerolag! I want to buy ${product.name} (${product.platform}) for ${formatPrice(finalPrice)}.`);
  const whatsappUrl = `https://wa.me/${cleanWaVal}?text=${whatsappMsg}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-12 pb-24">
      {/* Breadcrumbs */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/shop" className="group flex items-center gap-2 text-gray-500 hover:text-[#00F0FF] transition-colors uppercase text-[10px] font-black tracking-widest">
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
              Back to Store
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gray-700 select-none">/</span>
            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest truncate max-w-[200px]">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        {/* Gallery */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-6 xl:col-span-7"
        >
          <div className="relative aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] group bg-[#151619] flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-110 opacity-30 pointer-events-none" 
              style={{ backgroundImage: `url(${product.imageUrl})` }}
            ></div>
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0B0B0F]/90 to-transparent z-20 pointer-events-none"></div>
            {product.discount > 0 && (
              <div className="absolute top-8 left-8 bg-[#00F0FF] text-[#0B0B0F] px-5 py-2 rounded-2xl font-black uppercase tracking-tighter shadow-[0_0_30px_rgba(0,240,255,0.4)] text-sm">
                -{product.discount}% OFF
              </div>
            )}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center space-y-10"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">
                {product.category}
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-[#6C5CE7]">
                {product.platform}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-tight break-words">
              {product.name}
            </h1>

            <div className="flex items-center gap-1 leading-none py-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={14} 
                  className="fill-[#00F0FF] text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" 
                />
              ))}
              <span className="ml-2 text-[10px] font-black tracking-widest text-[#00F0FF] opacity-60">5.0 RATING</span>
            </div>

            <div className="flex items-end gap-4 font-black">
              <span className="text-4xl text-[#00F0FF] drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">{formatPrice(finalPrice)}</span>
              {currentDiscount > 0 && (
                <span className="text-xl text-gray-500 line-through mb-1">{formatPrice(currentPrice)}</span>
              )}
            </div>
          </div>

           {/* Available Versions Selector */}
          {product.category === 'Hardware' ? (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#00F0FF]">Hardware Spec & Availability</h4>
              <div className="flex flex-wrap gap-3">
                {product.subcategory && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-center min-w-[150px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#80848E]">Category Spec</span>
                    <span className="text-sm font-black text-white mt-1 uppercase">{product.subcategory}</span>
                  </div>
                )}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-center min-w-[150px]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#80848E]">Stock Availability</span>
                  <span className={`text-sm font-black mt-1 uppercase ${((product.ps4PrimaryStock ?? 0) > 0 && product.stockStatus !== 'Out of Stock') ? 'text-green-400' : 'text-red-400'}`}>
                    {((product.ps4PrimaryStock ?? 0) > 0 && product.stockStatus !== 'Out of Stock') ? '✅ In Stock' : '❌ Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Available Versions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { type: 'PS4_PRIMARY', label: 'PS4 Primary', price: product.pricePS4Primary || 0, stock: stockCounts.PS4_PRIMARY },
                  { type: 'PS5_PRIMARY', label: 'PS5 Primary', price: product.pricePS5Primary || 0, stock: stockCounts.PS5_PRIMARY },
                  { type: 'SECONDARY', label: 'Secondary', price: product.priceSecondary || 0, stock: stockCounts.SECONDARY },
                ].map((v: any) => {
                  const isSelected = selectedSlotType === v.type;
                  const finalOptionPrice = product.discount > 0 ? v.price * (1 - product.discount / 100) : v.price;
                  return (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => setSelectedSlotType(v.type)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-28 ${
                        isSelected
                          ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.1)] pr-3'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-full">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-[#00F0FF]' : 'text-[#80848E]'}`}>
                            {v.label}
                          </span>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-[#00F0FF]' : 'border-white/20'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>}
                          </div>
                        </div>
                        <div className="text-sm font-black tracking-tight text-white mt-1">
                          {formatPrice(finalOptionPrice)}
                        </div>
                      </div>
                      <div className="text-[9px] font-mono font-black uppercase mt-2">
                        <span className={v.stock > 0 ? "text-green-400 font-bold" : "text-red-400"}>
                          {v.stock > 0 ? '✅ IN STOCK' : '❌ OUT OF STOCK'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="py-8 border-y border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
              <Info size={14} /> Description
            </h4>
            <p className="text-gray-400 leading-relaxed max-w-xl break-words whitespace-pre-wrap">
              {product.description || "Unlock the full potential of your gaming experience. This product includes full access to premium features and instant digital delivery."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center bg-[#151619] border border-white/10 rounded-2xl h-[60px] px-2 w-full sm:w-40 shrink-0">
                <button 
                  onClick={() => setQuantity(q => Math.max(availableStock > 0 ? 1 : 0, q - 1))}
                  disabled={availableStock === 0}
                  className="flex-1 h-full flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white mt-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={18} />
                </button>
                <span className="w-12 text-center text-lg font-black">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => availableStock > 0 ? Math.min(availableStock, q + 1) : 0)}
                  disabled={availableStock === 0 || quantity >= availableStock}
                  className="flex-1 h-full flex items-center justify-center hover:bg-white/5 rounded-xl transition-colors text-gray-500 hover:text-white mt-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                </button>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={isInCart || availableStock === 0}
                className={`w-full flex-1 px-8 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${
                  availableStock === 0
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-60'
                    : isInCart || isAdded
                      ? 'bg-green-500/20 text-green-500 border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
                      : 'bg-[#00F0FF] text-[#0B0B0F] shadow-[0_0_30px_rgba(0,240,255,0.2)] hover:bg-[#33F3FF] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,240,255,0.4)] active:scale-95'
                }`}
              >
                <AnimatePresence mode="wait">
                  {availableStock === 0 ? (
                    <motion.div
                      key="outofstock"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <span>Out Of Stock</span>
                    </motion.div>
                  ) : isAdded || isInCart ? (
                    <motion.div
                      key="added"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Check size={24} />
                      <span>Added</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="add"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart size={24} />
                      <span>Add to Cart</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => toggleWishlist(product.id)}
                className={`flex-1 px-8 py-4 border rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                  isWishlisted 
                    ? 'bg-[#FF005C] text-white border-[#FF005C] shadow-[0_0_30px_rgba(255,0,92,0.3)]' 
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }`}
              >
                <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                {isWishlisted ? 'Saved to Vault' : 'Add to Wishlist'}
              </button>

              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-8 py-4 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#25D366] hover:text-white transition-all group"
              >
                <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Trust Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 pb-12 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Zap className="text-[#00F0FF]" size={20} />
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">Instant Delivery</div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#00F0FF]" size={20} />
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">Lifetime Warranty</div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-[#00F0FF]" size={20} />
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">24/7 Support</div>
            </div>
          </div>

          <div className="pt-16">
            <ReviewSection productId={id!} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
