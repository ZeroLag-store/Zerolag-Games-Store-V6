import { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Search, Key, ShieldCheck, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CustomerLookup() {
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const q = query(collection(db, 'accounts'), where('customerPhone', '==', phone));
      const snap = await getDocs(q);
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'customer_lookup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-24 px-4 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00F0FF]/5 rounded-full blur-[120px]"></div>

      <div className="max-w-4xl w-full space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">
            ACCOUNT <span className="text-[#00F0FF]">RETRIVAL</span>
          </h1>
          <p className="text-gray-500 uppercase text-[10px] font-black tracking-[0.4em]">Instant Access to your Neural Assets</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-md mx-auto">
          <div className="flex bg-[#151619] p-2 rounded-[2rem] border border-white/10 shadow-2xl focus-within:border-[#00F0FF]/50 transition-all">
            <input 
              type="tel" 
              placeholder="ENTER PHONE NUMBER..." 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="flex-1 bg-transparent px-6 py-4 outline-none font-black text-sm uppercase tracking-widest placeholder:text-gray-700"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 bg-[#00F0FF] text-black rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform flex items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Search size={18} />}
              Sync
            </button>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
               key="loading"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex flex-col items-center gap-6 py-20"
            >
               <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,240,255,0.3)]"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00F0FF] animate-pulse">Decrypting Records...</span>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {results.map((acc, i) => (
                <motion.div 
                  key={acc.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 bg-[#151619] rounded-[2.5rem] border border-[#00F0FF]/20 shadow-[0_0_40px_rgba(0,240,255,0.1)] space-y-6 relative overflow-hidden group hover:border-[#00F0FF]/50 transition-all"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00F0FF]/5 rounded-full blur-3xl group-hover:bg-[#00F0FF]/10 transition-colors"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <div className="text-[10px] font-black uppercase text-[#00F0FF] tracking-widest">{acc.type}</div>
                       <h3 className="text-2xl font-black uppercase tracking-tight">{acc.productName}</h3>
                    </div>
                    <div className="p-3 bg-[#00F0FF]/10 rounded-2xl">
                       <Gamepad2 className="text-[#00F0FF]" size={24} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Credentials</label>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 relative group/cred overflow-hidden">
                       <code className="text-xs font-mono text-gray-300 block break-all">{acc.credentials}</code>
                       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-100 group-hover/cred:opacity-0 transition-opacity flex items-center justify-center gap-2 cursor-pointer">
                          <ShieldCheck size={14} className="text-[#00F0FF]" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Hover to Decrypt</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#00F0FF]/50 pt-4 border-t border-white/5">
                     <span className="flex items-center gap-1"><Key size={12} /> {acc.category}</span>
                     <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                     <span>Assigned: {acc.assignedAt?.toDate ? acc.assignedAt.toDate().toLocaleDateString() : 'Active'}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : hasSearched && (
            <motion.div 
               key="empty"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-4"
            >
               <h3 className="text-xl font-black uppercase text-gray-500">No Records Found</h3>
               <p className="text-xs text-gray-600 uppercase font-black tracking-widest">Ensure the phone number matches your order registration.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
