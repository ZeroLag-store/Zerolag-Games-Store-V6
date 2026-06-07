import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Tag, Check, Heart, Star, Plus, Minus, Scale } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { useState, useRef, useEffect } from 'react';

interface ProductCardProps {
  id: string;
  name: string;
  price?: number;
  pricePS4Primary?: number;
  pricePS5Primary?: number;
  priceSecondary?: number;
  discount: number;
  imageUrl: string;
  category: string;
  platform: string;
  stockStatus: string;
  description?: string;
  ps4PrimaryStock?: number;
  ps5PrimaryStock?: number;
  secondaryStock?: number;
}

export default function ProductCard(props: ProductCardProps) {
  const { id, name, price, pricePS4Primary, pricePS5Primary, priceSecondary, discount, imageUrl, category, platform, stockStatus, description, ps4PrimaryStock, ps5PrimaryStock, secondaryStock } = props;
  const { addToCart, cart, wishlist, toggleWishlist, compareList, toggleCompare } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHardware = category === 'Hardware';
  const hasPS4 = (ps4PrimaryStock ?? 0) > 0;
  const hasPS5 = (ps5PrimaryStock ?? 0) > 0;
  const hasSec = (secondaryStock ?? 0) > 0;
  const isCurrentlyInStock = isHardware
    ? (ps4PrimaryStock ?? 0) > 0 && stockStatus !== 'Out of Stock'
    : (hasPS4 || hasPS5 || hasSec) && stockStatus !== 'Out of Stock';

  // Fallback to slot prices if a generic regularPrice/price is not defined or is 0
  const slotPrices = [pricePS4Primary, pricePS5Primary, priceSecondary].filter((p): p is number => typeof p === 'number' && p > 0);
  const displayPrice = slotPrices.length > 0 ? Math.min(...slotPrices) : (price || 0);
  const finalPrice = discount > 0 ? displayPrice * (1 - discount / 100) : displayPrice;

  const isWishlisted = wishlist.includes(id);
  const isComparing = compareList.some(p => p.id === id);

  // Check for overflowing text
  useEffect(() => {
    if (nameRef.current && containerRef.current) {
      setIsOverflowing(nameRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  }, [name]);

  // Mock rating based on ID for consistency
  const rating = 5;
  const reviewsCount = (id.charCodeAt(0) % 50) + 10;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(props, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(id);
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare({
      id, name, price, discount, imageUrl, category, platform, stockStatus, description: description || ''
    });
  };

  const totalAvailableStock = isHardware 
    ? Math.max(0, ps4PrimaryStock ?? 0)
    : Math.max(0, (ps4PrimaryStock ?? 0) + (ps5PrimaryStock ?? 0) + (secondaryStock ?? 0));

  useEffect(() => {
    if (!isCurrentlyInStock || totalAvailableStock === 0) {
      setQuantity(0);
    } else if (quantity > totalAvailableStock) {
      setQuantity(totalAvailableStock);
    } else if (quantity === 0 && isCurrentlyInStock && totalAvailableStock > 0) {
      setQuantity(1);
    }
  }, [totalAvailableStock, isCurrentlyInStock]);

  const adjustQuantity = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCurrentlyInStock || totalAvailableStock === 0) return;
    setQuantity(prev => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > totalAvailableStock) return totalAvailableStock;
      return next;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-[#151619] rounded-2xl overflow-hidden border border-white/5 hover:border-[#00F0FF]/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] flex flex-col h-full"
    >
      {/* Top Badges */}
      <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
        {discount > 0 ? (
          <div className="bg-[#00F0FF] text-[#0B0B0F] px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            -{discount}% OFF
          </div>
        ) : <div />}
        
        <button
          onClick={handleToggleCompare}
          className={`pointer-events-auto p-2 rounded-xl border backdrop-blur-md transition-all duration-300 ${
            isComparing 
              ? 'bg-[#00F0FF] text-[#0B0B0F] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)]' 
              : 'bg-black/60 text-white border-white/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100'
          }`}
          title={isComparing ? "Remove from comparison" : "Add to comparison"}
        >
          <Scale size={14} />
        </button>
      </div>

      {/* Image Container */}
      <div className="aspect-[4/5] overflow-hidden relative bg-[#0F1012] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-30 pointer-events-none" 
          style={{ backgroundImage: `url(${imageUrl})` }}
        ></div>
        <img 
          src={imageUrl} 
          alt={name} 
          className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/25 to-transparent opacity-80 transition-opacity group-hover:opacity-45 z-20 pointer-events-none"></div>
        
        {/* Quick View Button (Visible on Hover / Always visible on tablet or mobile) */}
        <div className="absolute inset-x-4 bottom-4 transition-all duration-500 z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0">
          <Link 
            to={`/product/${id}`}
            aria-label={`View details for ${name}`}
            className="w-full bg-white/10 backdrop-blur-md text-white border border-white/10 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#00F0FF] hover:text-[#0B0B0F] hover:border-[#00F0FF] transition-all"
          >
            <Eye size={12} />
            Quick View
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-grow flex flex-col gap-4 justify-between">
        <div className="space-y-1.5 font-black uppercase text-[10px] tracking-widest text-[#00F0FF] opacity-60">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Tag size={10} />
              {category}
            </span>
            <span className={!isCurrentlyInStock ? 'text-red-400' : 'text-green-400'}>
              {!isCurrentlyInStock ? '❌ OUT OF STOCK' : '✅ IN STOCK'}
            </span>
          </div>
        </div>
        
        <div className="space-y-2 flex-grow flex flex-col justify-start">
          <h3 
            className="text-sm md:text-base font-black tracking-tight uppercase leading-snug group-hover:text-[#00F0FF] transition-colors line-clamp-2 md:line-clamp-3 min-h-[2.5rem] md:min-h-[3.5rem] overflow-hidden text-ellipsis break-words"
            title={name}
          >
            {name}
          </h3>

          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={10} 
                className={i < rating ? "fill-[#00F0FF] text-[#00F0FF] drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]" : "text-white/5"} 
                fill={i < rating ? "currentColor" : "none"}
              />
            ))}
            <span className="text-[9px] font-bold text-gray-500 ml-1.5 tracking-widest">({reviewsCount})</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-white">{formatPrice(finalPrice)}</span>
            {discount > 0 && (
              <span className="text-[10px] font-bold text-gray-600 line-through">{formatPrice(displayPrice)}</span>
            )}
          </div>
        </div>

        {/* Quantity, Wishlist & Buy Control */}
        <div className="mt-auto pt-2 space-y-2">
          <div className="flex gap-2">
            <div className="flex items-center bg-[#0B0B0F] border border-white/5 rounded-xl h-11 px-2 w-24 overflow-hidden">
              <button 
                onClick={(e) => adjustQuantity(e, -1)}
                disabled={!isCurrentlyInStock || totalAvailableStock === 0}
                className="flex-1 h-full flex items-center justify-center hover:bg-white/5 transition-colors text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ minHeight: '44px' }}
              >
                <Minus size={10} />
              </button>
              <span className="w-8 text-center text-[10px] font-black">{quantity}</span>
              <button 
                onClick={(e) => adjustQuantity(e, 1)}
                disabled={!isCurrentlyInStock || totalAvailableStock === 0 || quantity >= totalAvailableStock}
                className="flex-1 h-full flex items-center justify-center hover:bg-white/5 transition-colors text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ minHeight: '44px' }}
              >
                <Plus size={10} />
              </button>
            </div>

            <button 
              onClick={handleToggleWishlist}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={`flex-1 h-11 flex items-center justify-center rounded-xl transition-all border ${
                isWishlisted 
                  ? 'bg-[#FF005C] text-white border-[#FF005C] shadow-[0_0_15px_rgba(255,0,92,0.3)]' 
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
              }`}
            >
              <Heart size={14} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleAddToCart}
              disabled={isAdded || !isCurrentlyInStock || totalAvailableStock === 0}
              aria-label="Add to cart"
              className={`flex-[3] h-11 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${
                !isCurrentlyInStock || totalAvailableStock === 0
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-60'
                  : isAdded 
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                    : 'bg-[#00F0FF] text-[#0B0B0F] hover:bg-[#33F3FF]'
              }`}
            >
              <AnimatePresence mode="wait">
                {!isCurrentlyInStock || totalAvailableStock === 0 ? (
                  <motion.div
                    key="outofstock"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5"
                  >
                    <span>Out of Stock</span>
                  </motion.div>
                ) : isAdded ? (
                  <motion.div
                    key="added"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Added</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5"
                  >
                    <ShoppingCart size={14} />
                    <span>Add to Cart</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isCurrentlyInStock || totalAvailableStock === 0) return;
                addToCart(props, 1);
                setIsAdded(true);
                setTimeout(() => setIsAdded(false), 2000);
              }}
              disabled={!isCurrentlyInStock || totalAvailableStock === 0}
              title="Quick Add (1 unit)"
              className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-[#00F0FF] hover:text-[#0B0B0F] hover:border-[#00F0FF] transition-all group/quick disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit disabled:hover:border-inherit"
            >
              <Plus size={16} className="group-hover/quick:scale-125 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
