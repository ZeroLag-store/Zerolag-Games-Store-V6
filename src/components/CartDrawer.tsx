import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ShoppingBag, ArrowRight, Plus, Minus, Truck } from 'lucide-react';
import { useAuth } from '../App';
import { formatPrice } from '../lib/utils';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, clearCart, updateQuantity } = useAuth();

  // Scroll lock on open state
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC key listener to dismiss drawer on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const total = cart.reduce((acc, item) => {
    const finalPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
    return acc + (finalPrice * (item.quantity || 1));
  }, 0);

  const subtotalBeforeDiscount = cart.reduce((acc, item) => {
    return acc + (item.price * (item.quantity || 1));
  }, 0);

  const totalDiscount = subtotalBeforeDiscount - total;
  const itemCount = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const hasHardware = cart.some(item => item.category === 'Hardware');

  // Helper to format slot versions
  const getVersionLabel = (slotType: string) => {
    if (slotType === 'PS4_PRIMARY') return 'PS4 Primary';
    if (slotType === 'PS5_PRIMARY') return 'PS5 Primary';
    if (slotType === 'PRIMARY' || slotType === 'PRIMARY_AUTOLOGIN') return 'Primary Slot';
    if (slotType === 'SECONDARY') return 'Secondary Slot';
    return slotType.replace('_', ' ');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0B0B0F] sm:bg-[#0B0B0F]/90 sm:backdrop-blur-sm z-[200]"
          />

          {/* Unified Premium Side Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 480 }}
            dragElastic={{ left: 0.05, right: 0.5 }}
            onDragEnd={(e, info) => {
              if (info.offset.x > 110 || info.velocity.x > 350) {
                onClose();
              }
            }}
            className="fixed top-0 right-0 h-full w-full sm:max-w-[460px] md:max-w-[480px] bg-[#121316] sm:border-l border-white/10 z-[201] shadow-2xl flex flex-col overflow-hidden touch-pan-y"
          >
            {/* Header Row: Always visible, sticky at the top, identical in empty & filled state */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0A0B0E] sticky top-0 z-[10] select-none">
              <div className="flex items-center gap-3.5">
                {/* Close Button: Fully compliant 44x44px touch target on Mobile and Desktop */}
                <button 
                  onClick={onClose}
                  className="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-[#00F0FF] text-white hover:text-[#00F0FF] rounded-xl active:scale-95 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-label="Close cart drawer"
                >
                  <X size={20} className="stroke-[2.5px]" />
                </button>
                
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white leading-tight">
                    Shopping Cart
                  </h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'} loaded
                  </p>
                </div>
              </div>

              {/* Decorative Header Block */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-lg">
                <ShoppingBag size={12} className="text-[#00F0FF]" />
                <span className="text-[8px] font-black text-white font-mono tracking-wider uppercase">
                  CART_SECURE
                </span>
              </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {cart.length === 0 ? (
                /* Empty State Illustration */
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#00F0FF]/5 blur-2xl rounded-full scale-110" />
                    <div className="w-16 h-16 bg-white/[0.02] border border-white/10 rounded-full flex items-center justify-center text-gray-500 relative z-10">
                      <ShoppingBag size={30} className="text-[#00F0FF]" />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-xs relative z-10 px-4">
                    <h3 className="font-extrabold uppercase tracking-tight text-white text-base">Your Cart is Empty</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                      Secure licenses and physical computing elements to unlock complete features.
                    </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="px-8 py-3 bg-[#00F0FF] hover:bg-[#33F3FF] text-black rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-[1.02] transition-all relative z-10 shadow-[0_0_15px_rgba(0,240,255,0.15)] cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                /* Filled State Content */
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Cart Items List */}
                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {cart.map(item => {
                        const finalPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
                        return (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                            className="p-3.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl flex flex-col gap-3.5 transition-all group relative overflow-hidden"
                          >
                            {/* Product Info Block */}
                            <div className="flex gap-3.5">
                              {/* Product Thumbnail */}
                              <div className="w-14 h-18 rounded-xl overflow-hidden border border-white/15 bg-[#08090C] shrink-0">
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              {/* Titles & Specs */}
                              <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                <div>
                                  <h3 className="font-black uppercase tracking-wide text-white text-xs leading-snug line-clamp-2">
                                    {item.name}
                                  </h3>
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-white/5 rounded text-gray-400">
                                      🎮 {item.platform || 'Cross-Platform'}
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-[#00F0FF]/10 text-[#00F0FF] rounded border border-[#00F0FF]/15">
                                      ⚙️ {getVersionLabel(item.selectedSlotType || 'SECONDARY')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Control Bar: Quantitative Handles & Price */}
                            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                              {/* 44px Interactive Quantity Changer */}
                              <div className="flex items-center bg-[#08090C] border border-white/10 rounded-xl h-11 px-0.5 select-none">
                                <button 
                                  onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-lg active:scale-90 transition-all cursor-pointer"
                                  style={{ minWidth: '40px', minHeight: '40px' }}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={11} className="stroke-[2.5px]" />
                                </button>
                                <span className="w-7 text-center text-xs font-black text-white font-mono">
                                  {item.quantity || 1}
                                </span>
                                <button 
                                  onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-lg active:scale-90 transition-all cursor-pointer"
                                  style={{ minWidth: '40px', minHeight: '40px' }}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={11} className="stroke-[2.5px]" />
                                </button>
                              </div>

                              {/* Price tags & Delete Button */}
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xs font-black text-white font-mono">
                                    {formatPrice(finalPrice * (item.quantity || 1))}
                                  </div>
                                  {item.discount > 0 && (
                                    <div className="text-[9px] font-mono text-gray-500 line-through">
                                      {formatPrice(item.price * (item.quantity || 1))}
                                    </div>
                                  )}
                                </div>
                                <button 
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-11 h-11 flex items-center justify-center bg-red-500/5 hover:bg-red-500 active:bg-amber-500 border border-white/5 text-red-400 hover:text-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                                  style={{ minWidth: '44px', minHeight: '44px' }}
                                  title="De-authorize and remove"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Physical shipping status card if hardware items exist */}
                  {hasHardware && (
                    <div className="p-3.5 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
                        <Truck size={14} className="shrink-0" />
                        <span>Physical hardware shipping required</span>
                      </div>
                      <p className="text-gray-400 text-[9px] leading-normal font-medium tracking-wide">
                        Physical assets require delivery. Global standard shipping is calculated as free. Courier will fulfill routing in 2 - 5 business days.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Panel Summary Row (Always visible & fixed when cart is populated) */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0B0E] space-y-4 shrink-0 shadow-2xl select-none z-20">
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-gray-400 text-[10px]">
                    <span className="uppercase font-semibold tracking-wider">Base Value</span>
                    <span className="font-bold font-mono text-white">{formatPrice(subtotalBeforeDiscount)}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-red-400 text-[10px]">
                      <span className="uppercase font-semibold tracking-wider text-red-412">Coupons & Sale Rebates</span>
                      <span className="font-bold font-mono">-{formatPrice(totalDiscount)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.15em]">Grand Total</span>
                    <span className="text-lg font-black text-[#00F0FF] font-mono tracking-tight drop-shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2.5">
                  <Link 
                    to="/checkout"
                    onClick={onClose}
                    className="w-full h-12 bg-[#00F0FF] hover:bg-[#33F3FF] text-black rounded-xl font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all hover:scale-[1.012] shadow-lg shadow-[#00F0FF]/15 cursor-pointer active:scale-95"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} />
                  </Link>
                  
                  <button 
                    onClick={clearCart}
                    className="w-full py-2.5 text-red-400 bg-red-500/5 hover:bg-red-511 hover:text-black border border-white/5 active:border-red-500 hover:border-red-555 rounded-xl font-black uppercase tracking-wider text-[9px] transition-all cursor-pointer active:scale-[0.98]"
                  >
                    Empty Cart Vault
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
