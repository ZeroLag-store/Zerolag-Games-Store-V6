import { useState } from 'react';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Search, Key, ShieldCheck, Gamepad2, Copy, Check, Clock, 
  CheckCircle2, AlertCircle, MessageSquare, ExternalLink, HelpCircle, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../App';

interface LookupResult {
  id: string;
  type: 'order' | 'account';
  orderId?: string;
  orderNumber?: string;
  productName: string;
  selectedVersion?: string;
  status: string;
  price?: number;
  createdAt?: any;
  credentials?: string;
  accountEmail?: string;
  accountPassword?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  notes?: string;
}

export default function CustomerLookup() {
  const { storeSettings } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const normalizePhone = (p: string) => {
    return p.replace(/[\s\-\+\(\)]/g, '').replace(/^20/, '').replace(/^0/, '');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      const termLower = term.toLowerCase();
      const rawPhone = term.replace(/[^\d]/g, '');
      const normPhone = normalizePhone(term);

      const foundMap = new Map<string, LookupResult>();

      // 1. Query Orders Collection
      const ordersSnap = await getDocs(collection(db, 'orders'));
      ordersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const oId = (data.orderId || data.orderNumber || docSnap.id || '').toLowerCase();
        const cPhone = (data.customerPhone || data.phoneNumber || '').toString();
        const cPhoneNorm = normalizePhone(cPhone);
        const cEmail = (data.customerEmail || data.userEmail || data.accountEmail || '').toLowerCase();
        const cName = (data.customerName || '').toLowerCase();

        const matchesOrderId = oId.includes(termLower);
        const matchesEmail = cEmail.includes(termLower);
        const matchesPhone = rawPhone.length >= 7 && (cPhone.includes(rawPhone) || (normPhone.length >= 7 && cPhoneNorm.includes(normPhone)));
        const matchesName = termLower.length >= 4 && cName.includes(termLower);

        if (matchesOrderId || matchesEmail || matchesPhone || matchesName) {
          const creds = data.deliveredCredentials || 
            (data.assignedAccountEmail ? `Email: ${data.assignedAccountEmail}\nPassword: ${data.assignedAccountPassword || '••••••••'}` : '');

          foundMap.set(`order_${docSnap.id}`, {
            id: docSnap.id,
            type: 'order',
            orderId: data.orderId || data.orderNumber || `ZLG-${docSnap.id.substring(0, 6).toUpperCase()}`,
            orderNumber: data.orderNumber,
            productName: data.productName || data.name || 'Digital Game License',
            selectedVersion: data.selectedVersion || (data.slotType ? data.slotType.replace('_', ' ') : 'Primary Slot'),
            status: data.status || 'Pending Payment Verification',
            price: data.finalPrice || data.price || data.total || 0,
            createdAt: data.createdAt,
            credentials: creds,
            accountEmail: data.assignedAccountEmail || data.accountEmail,
            accountPassword: data.assignedAccountPassword,
            customerName: data.customerName,
            customerEmail: data.customerEmail || data.userEmail,
            customerPhone: data.customerPhone || data.phoneNumber,
            paymentMethod: data.paymentMethod,
            notes: data.notes
          });
        }
      });

      // 2. Query Accounts Collection for legacy / ERP slot assignments
      const accountsSnap = await getDocs(collection(db, 'accounts'));
      accountsSnap.docs.forEach((docSnap) => {
        const acc = docSnap.data() as any;
        const accPhone = (acc.customerPhone || '').toString();
        const accPhoneNorm = normalizePhone(accPhone);
        const accEmail = (acc.email || '').toLowerCase();

        const matchesPhone = rawPhone.length >= 7 && (accPhone.includes(rawPhone) || (normPhone.length >= 7 && accPhoneNorm.includes(normPhone)));
        
        let slotMatch = false;
        if (Array.isArray(acc.slots)) {
          acc.slots.forEach((s: any) => {
            const sPhone = (s.assignedCustomerPhone || '').toString();
            if (rawPhone.length >= 7 && (sPhone.includes(rawPhone) || normalizePhone(sPhone).includes(normPhone))) {
              slotMatch = true;
            }
          });
        }

        if (matchesPhone || slotMatch) {
          const key = `acc_${docSnap.id}`;
          if (!foundMap.has(key)) {
            foundMap.set(key, {
              id: docSnap.id,
              type: 'account',
              orderId: `SLOT-${docSnap.id.substring(0, 6).toUpperCase()}`,
              productName: acc.productName || acc.email,
              selectedVersion: acc.type || 'Direct Digital Slot',
              status: 'Delivered',
              createdAt: acc.assignedAt || acc.createdAt,
              credentials: acc.credentials || `Email: ${acc.email}\nPassword: ${acc.password || ''}`,
              accountEmail: acc.email,
              accountPassword: acc.password,
              customerPhone: acc.customerPhone
            });
          }
        }
      });

      // Sort by newest first
      const combined = Array.from(foundMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setResults(combined);
    } catch (err) {
      console.error("Account lookup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
          <CheckCircle2 size={12} /> Delivered
        </span>
      );
    }
    if (s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full text-[10px] font-black uppercase tracking-wider">
          <Clock size={12} className="animate-spin" /> Payment Verified (Preparing Dispatch)
        </span>
      );
    }
    if (s === 'cancelled' || s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider">
          <AlertCircle size={12} /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-[10px] font-black uppercase tracking-wider">
        <Clock size={12} /> Verification In Progress
      </span>
    );
  };

  const whatsAppNumber = storeSettings?.whatsApp || '01114763125';

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00F0FF]/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl w-full space-y-10 relative z-10">
        
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-[#00F0FF]">
            <Key size={13} /> ORDER TRACKING & INSTANT CREDENTIALS
          </div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
            ACCOUNT <span className="text-[#00F0FF]">RETRIEVAL</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
            Enter your Phone Number, Order ID (e.g. <span className="font-mono text-white">ZLG-000001</span>), or Email to track your order and retrieve delivered account logins.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-[#151619] p-2 rounded-2xl border border-white/10 shadow-2xl focus-within:border-[#00F0FF]/50 transition-all">
            <div className="flex items-center flex-1 w-full pl-3">
              <Search size={18} className="text-gray-500 mr-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Phone (010...), Order ID (ZLG-...), or Email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-transparent py-3 pr-3 outline-none text-white text-xs sm:text-sm font-medium placeholder:text-gray-600"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-[#00F0FF] text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-[#00D0E0] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Key size={15} />}
              <span>Track & Retrieve</span>
            </button>
          </div>
        </form>

        {/* Dynamic Results Display */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <div className="w-10 h-10 border-3 border-[#00F0FF] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#00F0FF]">Locating order records...</span>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-xs font-mono uppercase tracking-widest text-gray-400 text-center">
                Found {results.length} matching {results.length === 1 ? 'order' : 'orders'}
              </div>

              <div className="grid grid-cols-1 gap-6">
                {results.map((item) => {
                  const isDelivered = (item.status || '').toLowerCase() === 'delivered' || (item.status || '').toLowerCase() === 'completed';
                  const dateStr = item.createdAt?.seconds 
                    ? new Date(item.createdAt.seconds * 1000).toLocaleString() 
                    : item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent';

                  return (
                    <div 
                      key={item.id}
                      className="bg-[#151619] rounded-2xl border border-white/10 p-6 sm:p-8 space-y-6 relative overflow-hidden"
                    >
                      {/* Top Bar: Order ID, Date & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-white font-mono font-bold text-xs rounded">
                            {item.orderId}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {dateStr}
                          </span>
                        </div>
                        <div>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>

                      {/* Middle: Product info & Version */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Game / Service</span>
                          <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">{item.productName}</h3>
                          <div className="text-xs text-[#00F0FF] font-bold uppercase mt-1">
                            Allocation: {item.selectedVersion}
                          </div>
                        </div>

                        {item.price !== undefined && item.price > 0 && (
                          <div className="sm:text-right">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Order Amount</span>
                            <div className="text-lg font-mono font-black text-white">
                              {formatPrice(item.price)}
                            </div>
                            <div className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">
                              Gateway: {item.paymentMethod || 'InstaPay'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Credentials Box (if delivered) */}
                      {isDelivered && (item.credentials || item.accountEmail) ? (
                        <div className="bg-[#0B0B0F] rounded-xl border border-[#00F0FF]/30 p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#00F0FF]">
                              <ShieldCheck size={16} /> Delivered Access Credentials
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.credentials || `Email: ${item.accountEmail}\nPassword: ${item.accountPassword || ''}`, item.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00F0FF]/10 hover:bg-[#00F0FF] text-[#00F0FF] hover:text-black border border-[#00F0FF]/30 hover:border-transparent rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check size={12} /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy Login
                                </>
                              )}
                            </button>
                          </div>

                          <div className="bg-black/60 rounded-lg p-4 font-mono text-xs text-gray-200 whitespace-pre-wrap select-all leading-relaxed border border-white/5">
                            {item.credentials || `Email: ${item.accountEmail}\nPassword: ${item.accountPassword || 'Contact Support'}`}
                          </div>

                          <div className="text-[11px] text-gray-400 leading-relaxed pt-2 border-t border-white/5">
                            💡 <strong className="text-white">Activation Note:</strong> Sign in using the credentials above on your console. If Primary, activate the console as your primary PS4/PS5 under Settings → Account Management.
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                              <Clock size={14} /> Verification In Progress
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Your payment screenshot is being reviewed by our verification desk. Credentials will appear right here as soon as approved.
                            </p>
                          </div>
                          <a
                            href={`https://wa.me/2${whatsAppNumber}?text=${encodeURIComponent(`Hi ZeroLag Support, I placed order ${item.orderId} for ${item.productName} and would like an update.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 hover:border-transparent rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap"
                          >
                            <MessageSquare size={13} /> Expedite via WhatsApp
                          </a>
                        </div>
                      )}

                      {/* Footer Support Link */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-gray-500 font-mono">
                        <span>ZeroLag Lifetime Warranty Protection Enabled</span>
                        <a 
                          href={`https://wa.me/2${whatsAppNumber}?text=${encodeURIComponent(`Hello ZeroLag Support, I need assistance with my order: ${item.orderId}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00F0FF] hover:underline flex items-center gap-1 font-bold"
                        >
                          Need Help? Contact Desk <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : hasSearched && (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center bg-[#151619]/60 border border-white/5 rounded-2xl space-y-4 p-8"
            >
              <HelpCircle size={36} className="text-gray-500 mx-auto" />
              <h3 className="text-lg font-black uppercase text-white">No Matching Orders Located</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                We couldn't find an order matching "<span className="font-mono text-white">{searchTerm}</span>". Please ensure you entered the same phone number, Order ID (e.g. ZLG-...), or email used during checkout.
              </p>
              <div className="pt-2">
                <a
                  href={`https://wa.me/2${whatsAppNumber}?text=${encodeURIComponent(`Hi ZeroLag, I placed an order with query "${searchTerm}" and need help retrieving it.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#25D366] text-black font-black uppercase text-xs rounded-xl hover:bg-[#20bd5a] transition-all"
                >
                  <MessageSquare size={14} /> Contact WhatsApp Support
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

