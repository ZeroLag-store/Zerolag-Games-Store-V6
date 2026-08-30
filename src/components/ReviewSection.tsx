import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../App';
import { Star, Send, User, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
  isVerified?: boolean;
}

export default function ReviewSection({ productId }: { productId: string }) {
  const { user, showToast } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, 'reviews'),
          where('productId', '==', productId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Login to leave a review');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const reviewData = {
        productId,
        userId: user.uid,
        userName: user.displayName || (user.email || 'Gamer').split('@')[0],
        rating: newRating,
        comment: newComment,
        createdAt: serverTimestamp(),
        isVerified: true // Mocking verification for now, usually checks orders
      };

      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      
      const newReview: Review = {
        id: docRef.id,
        ...reviewData,
        createdAt: { seconds: Date.now() / 1000 } // Optimistic update
      };

      setReviews(prev => [newReview, ...prev]);
      setNewComment('');
      setNewRating(5);
      showToast('Review shared with the community');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'reviews');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter">
            USER <span className="text-[#00F0FF]">FEEDBACK</span>
          </h2>
          <div className="w-20 h-1 bg-[#00F0FF]"></div>
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
          <div className="text-3xl font-black text-[#00F0FF]">
            {reviews.length > 0 
              ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
              : "5.0"}
          </div>
          <div className="space-y-0.5">
            <div className="flex gap-0.5 text-[#00F0FF]">
              {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {reviews.length} Global Reviews
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        {/* Reviews List */}
        <div className="space-y-6">
          {loading ? (
            [...Array(2)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse"></div>)
          ) : reviews.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#151619] border border-white/5 rounded-3xl p-8 space-y-4 relative group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 border border-white/5">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          {review.userName}
                          {review.isVerified && (
                             <span className="flex items-center gap-1 text-[#00F0FF] text-[8px] border border-[#00F0FF]/20 px-1.5 py-0.5 rounded-full bg-[#00F0FF]/5">
                               <ShieldCheck size={10} /> Verified
                             </span>
                          )}
                        </div>
                        <div className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.2em] flex items-center gap-1">
                          <Clock size={10} /> {new Date(review.createdAt?.seconds * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={12} 
                          fill={i < review.rating ? "#00F0FF" : "none"} 
                          className={i < review.rating ? "text-[#00F0FF]" : "text-gray-800"} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">"{review.comment}"</p>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] grayscale opacity-40">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Signal lost. No reviews detected.</span>
            </div>
          )}
        </div>

        {/* Submit Review */}
        <div className="sticky top-32 bg-[#151619] border border-white/5 rounded-[2.5rem] p-8 space-y-8 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#00F0FF]/30 to-transparent"></div>
          
          <div className="space-y-2">
             <h3 className="font-black uppercase tracking-tight">Broadcast Review</h3>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
               Share your neural experience with fellow collectors in the vault.
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Sync Level (Rating)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                      newRating >= star 
                        ? 'bg-[#00F0FF]/10 border-[#00F0FF]/30 text-[#00F0FF]' 
                        : 'bg-white/5 border-white/10 text-gray-600 hover:border-white/20'
                    }`}
                  >
                    <Star size={18} fill={newRating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Transmission (Comment)</label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter your transmission memo..."
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-[#00F0FF]/50 transition-all min-h-[120px] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !newComment.trim() || !user}
              className="w-full py-4 bg-[#00F0FF] text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-[#33F3FF] transition-all disabled:opacity-50 disabled:grayscale group"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Transmit Data <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>

            {!user && (
              <p className="text-[9px] text-center font-bold text-red-500/60 uppercase tracking-widest">
                Auth required for transmission sync
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
