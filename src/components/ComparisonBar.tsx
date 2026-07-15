
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { X, Scale, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import ComparisonModal from './ComparisonModal';

export default function ComparisonBar() {
  const { compareList, toggleCompare, clearCompare } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (compareList.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[95%] max-w-2xl"
      >
        <div className="bg-[#151619]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6">
          <div className="flex -space-x-3 overflow-hidden">
            {compareList.map((product) => (
              <motion.div
                layout
                key={product.id}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative group"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#151619] shadow-lg"
                />
                <button
                  onClick={() => toggleCompare(product)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00F0FF] mb-1">
              Compare Mode ({compareList.length}/4)
            </h4>
            <p className="text-[10px] text-gray-500 uppercase font-bold truncate">
              {compareList.length === 1 ? 'Add one more to compare' : 'Ready to compare specs'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearCompare}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              disabled={compareList.length < 2}
              onClick={() => setIsModalOpen(true)}
              className="bg-[#00F0FF] text-[#0B0B0F] px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-all active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              <Scale size={14} />
              Compare Now
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      <ComparisonModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        products={compareList} 
      />
    </>
  );
}
