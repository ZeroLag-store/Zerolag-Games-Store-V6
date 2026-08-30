import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Bot, User, ChevronRight, Gamepad2, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiService } from '../lib/apiService';

interface RecommendedGame {
  id?: string;
  name: string;
  reason: string;
  matchScore: number;
}

export default function AIRecommender() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedGame[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      const data = await apiService.getRecommendations(input.trim());
      if (data && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error("AI recommender error:", err);
      setError("The AI is currently recalibrating. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#151619] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] min-h-[500px]">
        {/* Left: Chat Area */}
        <div className="p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00F0FF]/10 rounded-full text-[#00F0FF] text-[10px] font-black uppercase tracking-[0.2em]">
              <BrainCircuit size={14} />
              AI Neural Recommender
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none">
              FIND YOUR NEXT <br />
              <span className="text-[#00F0FF] drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">OBSESSION</span>
            </h2>
            
            <p className="text-gray-400 text-sm max-w-md font-medium leading-relaxed">
              Describe your mood, a game you loved, or a specific "vibe" you're looking for. Our neural engine will scan the vault for your perfect match.
            </p>
          </div>

          <form onSubmit={handleSuggest} className="mt-12 relative group/form">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00F0FF]/50 to-transparent"></div>
            <div className="relative flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2 pl-6 focus-within:border-[#00F0FF]/50 transition-all duration-300">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="I want something dark, mysterious and story-driven..."
                className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-gray-600 py-3"
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-[#00F0FF] text-black w-12 h-12 rounded-xl flex items-center justify-center hover:bg-[#33F3FF] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} strokeWidth={2.5} />
                )}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Soulslike', 'Open World', 'Cozy RPG', 'Hyper-Fast'].map((tag) => (
                <button 
                  key={tag}
                  type="button"
                  onClick={() => setInput(tag)}
                  className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-[#00F0FF] transition-all border border-transparent hover:border-[#00F0FF]/20"
                >
                  {tag}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Right: Results Area */}
        <div className="bg-[#0B0B0F]/50 p-8 lg:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
              <Bot size={14} /> Neural Results
            </span>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              {recommendations.length} Detected
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <AnimatePresence mode="popLayout">
              {recommendations.length > 0 ? (
                recommendations.map((game, i) => (
                  <motion.div
                    key={game.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-[#00F0FF]/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black uppercase tracking-tight group-hover:text-[#00F0FF] transition-colors">{game.name}</h4>
                      <span className="text-[10px] font-black text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-0.5 rounded-md border border-[#00F0FF]/20">
                        {game.matchScore}% MATCH
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 italic">
                      "{game.reason}"
                    </p>
                    <Link 
                      to={`/shop?search=${game.name}`}
                      className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-[#00F0FF] transition-colors"
                    >
                      Search in Store <ChevronRight size={10} />
                    </Link>
                  </motion.div>
                ))
              ) : loading ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#00F0FF]/20 blur-xl rounded-full"></div>
                    <Sparkles className="relative text-[#00F0FF] animate-pulse" size={32} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 animate-pulse">Scanning Gaming Metadata...</p>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <p className="text-xs font-medium text-red-400 opacity-80">{error}</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-30 grayscale">
                  <Gamepad2 size={40} className="text-gray-600" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Awaiting Input Signal</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
