import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BrainCircuit, X, Sparkles, Gamepad2, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/utils';

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'undefined') return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (err) {
    console.error("Failed to initialize Gemini AI:", err);
    return null;
  }
};

const ai = getAI();

export default function SmartSearch({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const snap = await getDocs(collection(db, 'products'));
      setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchAll();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSearching) return;

    setIsSearching(true);
    try {
      if (!ai) {
        throw new Error("Neural link unavailable (AI initialization failed).");
      }
      
      const productSummary = allProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        platform: p.platform
      }));

      const prompt = `You are an expert game curator for ZeroLag Games. 
      User Query: "${input}"
      
      Available Products (JSON): ${JSON.stringify(productSummary)}
      
      Based on the user's query, select the TOP 4 most relevant products from the list.
      If the user specifies a budget (e.g. "under 1000"), filter strictly.
      If the user specifies a platform, prioritize it.
      
      Return ONLY a JSON array of the product IDs. No markdown, no filler.
      Example: ["id1", "id2"]`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const text = result.text;
      const matchedIds = JSON.parse(text.replace(/```json|```/g, '').trim());
      
      const matchedProducts = allProducts.filter(p => matchedIds.includes(p.id));
      setResults(matchedProducts);
    } catch (err) {
      console.error(err);
      // Fallback search
      const fuse = allProducts.filter(p => 
        (p.name || '').toLowerCase().includes(input.toLowerCase()) || 
        (p.category || '').toLowerCase().includes(input.toLowerCase())
      );
      setResults(fuse.slice(0, 4));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-start justify-center pt-20 px-4 sm:px-6"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" onClick={onClose}></div>
          
          <motion.div 
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-[#0a0a0b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
          >
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
                         <BrainCircuit size={20} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black uppercase tracking-tighter italic">NEURAL <span className="text-[#00F0FF]">QUERENT</span></h3>
                         <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Advanced AI Search Protocol</p>
                      </div>
                   </div>
                   <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <X size={20} className="text-gray-500" />
                   </button>
                </div>

                <form onSubmit={handleSearch} className="relative">
                   <input 
                    autoFocus
                    placeholder="E.g. 'Best strategy games for Mac under 1000 pesos'..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-14 pr-6 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00F0FF]/50 focus:bg-white/[0.07] transition-all font-medium"
                   />
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                   <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] animate-pulse">Syncing</div>
                   </div>
                </form>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 px-2">
                       <Sparkles size={12} /> Results
                   </div>
                   
                   <div className="grid grid-cols-1 gap-2">
                      {isSearching ? (
                        <div className="py-12 flex flex-col items-center gap-4 text-gray-500">
                           <div className="w-8 h-8 border-2 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin"></div>
                           <p className="text-[10px] font-black uppercase tracking-widest">Scanning Databases...</p>
                        </div>
                      ) : results.length > 0 ? (
                        results.map(p => (
                          <Link 
                            key={p.id}
                            to={`/product/${p.id}`}
                            onClick={onClose}
                            className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 hover:border-[#00F0FF]/30 transition-all group"
                          >
                             <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                             <div className="flex-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{p.platform} / {p.category}</div>
                                <h4 className="font-black uppercase tracking-tight text-white group-hover:text-[#00F0FF] transition-colors">{p.name}</h4>
                                <div className="text-sm font-bold text-[#00F0FF]">{formatPrice(p.price)}</div>
                             </div>
                             <ArrowRight className="text-gray-700 group-hover:text-[#00F0FF] transition-colors" size={18} />
                          </Link>
                        ))
                      ) : input && !isSearching ? (
                        <div className="py-12 text-center text-gray-600 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                           <p className="text-xs font-black uppercase tracking-widest italic">No matches found in the mainframe.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                           {['Elden Ring', 'Mac Games', 'Under 500', 'New RPGs'].map(tag => (
                             <button 
                              key={tag}
                              onClick={() => setInput(tag)}
                              className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#00F0FF] hover:bg-[#00F0FF]/5 hover:border-[#00F0FF]/20 transition-all flex items-center justify-between"
                             >
                               {tag} <Gamepad2 size={12} />
                             </button>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
