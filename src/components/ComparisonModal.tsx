
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../App';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export default function ComparisonModal({ isOpen, onClose, products }: ComparisonModalProps) {
  const { addToCart } = useAuth();

  if (!isOpen) return null;

  const specs = [
    { label: 'Category', key: 'category' },
    { label: 'Platform', key: 'platform' },
    { label: 'Initial Price', key: 'price', format: (v: number) => formatPrice(v) },
    { label: 'Current Price', key: 'finalPrice' },
    { label: 'Discount', key: 'discount', format: (v: number) => v > 0 ? `${v}% OFF` : 'No Discount' },
    { label: 'Status', key: 'stockStatus' },
  ];

  const getFinalPrice = (p: Product) => p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0B0B0F]/90 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-6xl bg-[#151619] border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#00F0FF]/5 to-transparent">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Product Comparison</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00F0FF] mt-1">Side-by-side performance analysis</p>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-colors border border-white/10 group"
            >
              <X className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px] p-8">
              <table className="w-full text-left border-separate border-spacing-x-4">
                <thead>
                  <tr>
                    <th className="w-48"></th>
                    {products.map(product => (
                      <th key={product.id} className="pb-8">
                        <div className="space-y-4">
                          <div className="aspect-square rounded-3xl overflow-hidden border border-white/10">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                            <button
                              onClick={() => {
                                addToCart(product);
                                onClose();
                              }}
                              className="w-full py-2.5 bg-[#00F0FF] text-[#0B0B0F] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-2"
                            >
                              <ShoppingCart size={12} />
                              Add to cart
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {specs.map((spec, idx) => (
                    <tr key={spec.key} className={idx % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                      <td className="py-4 px-4 rounded-l-2xl">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{spec.label}</span>
                      </td>
                      {products.map(product => {
                        let value = (product as any)[spec.key];
                        if (spec.key === 'finalPrice') value = formatPrice(getFinalPrice(product));
                        if (spec.format) value = spec.format(value);

                        return (
                          <td key={product.id} className="py-4 px-4 text-xs font-bold uppercase tracking-wide">
                            {spec.key === 'stockStatus' ? (
                              <span className={`flex items-center gap-2 ${value === 'In Stock' ? 'text-green-500' : 'text-red-500'}`}>
                                {value === 'In Stock' ? <Plus size={12} className="rotate-45" /> : <Minus size={12} />}
                                {value}
                              </span>
                            ) : (
                              <span className={spec.key === 'finalPrice' ? 'text-[#00F0FF] text-lg font-black' : ''}>
                                {value}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-8 px-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Overview</span>
                    </td>
                    {products.map(product => (
                      <td key={product.id} className="py-8 px-4 align-top">
                        <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px]">
                          {product.description}
                        </p>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-[#0B0B0F]/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors border border-white/10"
            >
              Close Analyzer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
