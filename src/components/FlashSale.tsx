import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Timer, Zap, ChevronRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/utils';

interface FlashSaleProps {
  productId: string;
  name: string;
  price: number;
  discount: number;
  imageUrl: string;
  endTime: Date;
}

export default function FlashSale({ productId, name, price, discount, imageUrl, endTime }: FlashSaleProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const finalPrice = price * (1 - discount / 100);

  return (
    <div className="bg-[#FF005C] rounded-[2.5rem] overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF005C] via-[#FF005C] to-[#8000FF] opacity-90"></div>
      
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 text-[200px] font-black leading-none -rotate-12 translate-x-20 -translate-y-20 select-none">SALE</div>
      </div>

      <div className="relative p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12 items-center">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="px-4 py-2 bg-white text-[#FF005C] rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl animate-pulse">
              <Zap size={14} fill="currentColor" />
              Neural Flash Drop
            </div>
            <div className="flex gap-2">
              {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-12 h-14 bg-black/20 backdrop-blur-md rounded-xl flex items-center justify-center text-xl font-black border border-white/10">
                    {t.toString().padStart(2, '0')}
                  </div>
                  {i < 2 && <span className="font-black text-white/50 text-xl">:</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-none italic">
              {name}
            </h2>
            <p className="text-white/70 text-sm max-w-lg font-medium leading-relaxed uppercase tracking-wider">
              Limited inventory remaining in the vault. Sync now before the neural link expires.
            </p>
          </div>

          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <div className="text-white/40 text-xs font-bold line-through tracking-widest">{formatPrice(price)}</div>
              <div className="text-4xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">{formatPrice(finalPrice)}</div>
            </div>
            <Link 
              to={`/product/${productId}`}
              className="px-10 py-5 bg-white text-[#FF005C] rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
            >
              Secure Drop <ShoppingCart size={18} />
            </Link>
          </div>
        </div>

        <div className="relative h-[300px] lg:h-[400px] flex items-center justify-center">
           <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent rounded-[50%] blur-3xl"></div>
           <motion.img 
            initial={{ y: 20 }}
            animate={{ y: -20 }}
            transition={{ repeat: Infinity, repeatType: 'mirror', duration: 3, ease: 'easeInOut' }}
            src={imageUrl} 
            alt={name} 
            className="relative z-10 w-full h-full object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.5)]"
           />
        </div>
      </div>
    </div>
  );
}
