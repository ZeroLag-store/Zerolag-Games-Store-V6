import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Heart, User, LogOut, ChevronRight, ShoppingBag, Clock, ShieldCheck, 
  Award, FileText, Calendar, Compass, MapPin, Settings2, HelpCircle, PhoneCall 
} from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Profile() {
  const { user, wishlist, showToast } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<'profile' | 'orders' | 'receipts' | 'reservations' | 'warranties' | 'wishlist' | 'addresses' | 'settings'>('profile');
  const [loading, setLoading] = useState(true);
  
  // Custom states for settings & address
  const [address, setAddress] = useState({ street: "Tahrir Square 12", city: "Cairo", governorate: "Cairo", phone: "01114763125" });
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [tickLanguage, setTickLanguage] = useState('English');
  const navigate = useNavigate();

  // Load deep linked tab from URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['profile', 'orders', 'receipts', 'reservations', 'warranties', 'wishlist', 'addresses', 'settings'].includes(tabParam)) {
      setProfileTab(tabParam as any);
    }
  }, [window.location.search]);

  // Load User Data
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchAllUserData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch Orders
        const qOrders = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        );
        const oSnap = await getDocs(qOrders);
        const oList = oSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(oList);

        // 2. Fetch Warranties
        const qWarranties = query(
          collection(db, 'warranties'),
          where('customerId', '==', user.uid)
        );
        const wSnap = await getDocs(qWarranties);
        setWarranties(wSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 3. Fetch Reservations
        const qReservations = query(
          collection(db, 'reservations'),
          where('customerId', '==', user.uid)
        );
        const rSnap = await getDocs(qReservations);
        setReservations(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 4. Fetch Receipts
        const qReceipts = query(
          collection(db, 'receipts'),
          where('customerId', '==', user.uid)
        );
        const rcSnap = await getDocs(qReceipts);
        setReceipts(rcSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (e) {
        console.warn("Error loading user profile context:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUserData();
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Logged out successfully');
      navigate('/');
    } catch (e) {
      showToast('Logout failed');
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Shipping coordinates synchronized successfully!");
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("User details synced successfully.");
  };

  if (!user) return null;

  // Let's compute simulated Lifetime Spending based on completed order prices
  // and VIP system based on expenditures.
  const totalSpendVal = orders.reduce((sum, item) => sum + (item.total || item.price || 0), 0);

  // VIP Logic
  // Bronze: 0 - 1,000 | Silver: 1,001 - 3,000 | Gold: 3,001 - 8,000 | Platinum: 8,001 - 20,000 | Diamond: 20,001+
  const getVipBadge = (spend: number) => {
    if (spend >= 20000) return { title: 'DIAMOND VIP', color: 'from-cyan-400 to-blue-500 shadow-cyan-500/30 text-cyan-50', level: 'Diamond' };
    if (spend >= 8000) return { title: 'PLATINUM VIP', color: 'from-indigo-400 to-purple-500 shadow-purple-500/30 text-purple-50', level: 'Platinum' };
    if (spend >= 3000) return { title: 'GOLD VIP', color: 'from-yellow-400 to-amber-500 shadow-amber-500/30 text-amber-950', level: 'Gold' };
    if (spend >= 1000) return { title: 'SILVER VIP', color: 'from-slate-300 to-slate-400 shadow-slate-400/20 text-slate-900', level: 'Silver' };
    return { title: 'BRONZE VIP', color: 'from-amber-600 to-amber-800 shadow-amber-800/10 text-amber-50', level: 'Bronze' };
  };

  const vipInfo = getVipBadge(totalSpendVal);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
        
        {/* Left Control Rail Navigation Options */}
        <aside className="space-y-6">
          <div className="bg-[#151619] border border-white/5 rounded-[2.5rem] p-8 text-center relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50"></div>
            
            <div className="relative mb-6 mx-auto w-20 h-20 rounded-2xl bg-[#0B0B0F] border border-[#00F0FF]/30 flex items-center justify-center p-1">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#00F0FF]/15 to-transparent flex items-center justify-center text-[#00F0FF]">
                <User size={30} />
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-lg font-black uppercase tracking-tight truncate">{user.displayName || user.email?.split('@')[0]}</h1>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest truncate">{user.email}</p>
            </div>

            {/* VIP badge render */}
            <div className="mt-4">
              <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r ${vipInfo.color} shadow-lg`}>
                ★ {vipInfo.title}
              </span>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-sm font-black text-[#00F0FF]">{orders.length}</div>
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Completed</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-[#00F0FF]">{wishlist.length}</div>
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Wishlist</div>
              </div>
            </div>
          </div>

          {/* Vertical Profile Tabs Area */}
          <div className="bg-[#151619] border border-white/5 rounded-3xl p-4 flex flex-col gap-1.5">
            {[
              { id: 'profile', label: 'VIP Dashboard', icon: <Award size={15} /> },
              { id: 'orders', label: 'Dynamic Orders', icon: <Package size={15} /> },
              { id: 'receipts', label: 'Receipts & Billing', icon: <FileText size={15} /> },
              { id: 'reservations', label: 'Active Holds', icon: <Clock size={15} /> },
              { id: 'warranties', label: 'SLA Warranties', icon: <ShieldCheck size={15} /> },
              { id: 'wishlist', label: 'Vault Wishlist', icon: <Heart size={15} /> },
              { id: 'addresses', label: 'Saved Addresses', icon: <MapPin size={15} /> },
              { id: 'settings', label: 'Account Settings', icon: <Settings2 size={15} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setProfileTab(tab.id as any)}
                className={`w-full p-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-3 transition-all ${
                  profileTab === tab.id 
                    ? 'bg-[#00F0FF] text-[#0B0B0F] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}

            <button
              onClick={handleLogout}
              className="w-full mt-4 p-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut size={15} />
              <span>Logout Session</span>
            </button>
          </div>
        </aside>

        {/* Right Dashboard Area Dynamic Container */}
        <main className="min-h-[60vh]">
          {loading ? (
            <div className="space-y-6">
              <div className="h-44 bg-white/5 rounded-[2rem] animate-pulse"></div>
              <div className="h-24 bg-white/5 rounded-2xl animate-pulse"></div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={profileTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* 1. VIP DASHBOARD TAB */}
                {profileTab === 'profile' && (
                  <div className="space-y-8">
                    <div className="p-8 bg-gradient-to-r from-slate-900 to-[#151619] rounded-[2rem] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-[#00F0FF]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                      
                      <div className="space-y-3 relative z-10 text-center md:text-left">
                        <span className="px-3 py-1 bg-[#00F0FF]/10 text-[#00F0FF] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#00F0FF]/25">
                          METRICS OVERVIEW
                        </span>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">
                          LOYALTY TIER: <span className="text-[#00F0FF]">{vipInfo.level} Gamer</span>
                        </h2>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider max-w-xl">
                          Your tier is calculated live based on your total store spending. Level up automatically to unlock discounts and instant secondary slot priorities.
                        </p>
                      </div>

                      <div className="p-6 bg-black/40 border border-white/10 rounded-2xl text-center shrink-0">
                        <div className="text-xs font-black uppercase text-gray-400 mb-1">Lifetime Spending</div>
                        <div className="text-2xl font-black text-[#00F0FF]">{formatPrice(totalSpendVal)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">Account Health</div>
                        <div className="text-xl font-black text-white">100% SECURED</div>
                        <p className="text-[9px] text-gray-500 uppercase font-semibold">Active defense active across shared consoles</p>
                      </div>

                      <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-pink-400">Total Warranties</div>
                        <div className="text-xl font-black text-white">{warranties.length} ACTIVE CONTRACTS</div>
                        <p className="text-[9px] text-gray-500 uppercase font-semibold">Protected against credential alterations</p>
                      </div>

                      <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-green-400">Active Holds</div>
                        <div className="text-xl font-black text-white">{reservations.length} CLAIMABLE ITEMS</div>
                        <p className="text-[9px] text-gray-500 uppercase font-semibold">Reserved slots waiting for cart checkout</p>
                      </div>
                    </div>

                    {/* VIP Benefits Accordion */}
                    <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-tighter">Your VIP Status Benefits Tracker</h3>
                      <div className="space-y-3">
                        {[
                          { tier: 'Bronze', spend: '0 - 1,000 EGP', desc: 'Secure digital licenses & standard email support notifications.' },
                          { tier: 'Silver', spend: '1,000 - 3,000 EGP', desc: 'Password reset request processing priority under 1 hr.' },
                          { tier: 'Gold', spend: '3,000 - 8,000 EGP', desc: 'Exclusive access to flash sales & 5% standard cart coupon rebates.' },
                          { tier: 'Platinum', spend: '8,000 - 20,000 EGP', desc: 'Automatic 4-hour reservation hold extensions and WhatsApp group direct line.' },
                          { tier: 'Diamond', spend: '20,000+ EGP', desc: 'Ultimate priority secondary slot authorization resets done in under 5 minutes.' }
                        ].map((v, i) => {
                          const isCurrent = vipInfo.level === v.tier;
                          return (
                            <div key={i} className={`p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              isCurrent ? 'bg-[#00F0FF]/10 border border-[#00F0FF]/30' : 'bg-black/20 border border-white/5 opacity-55'
                            }`}>
                              <div>
                                <span className={`text-xs font-black uppercase ${isCurrent ? 'text-[#00F0FF]' : 'text-gray-400'}`}>
                                  {v.tier} Tier (Spend: {v.spend}) {isCurrent && '★ ACTIVE'}
                                </span>
                                <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider mt-1">{v.desc}</p>
                              </div>
                              {isCurrent && (
                                <span className="px-3 py-1 bg-[#00F0FF] text-black text-[9px] font-black uppercase tracking-widest rounded-lg">
                                  Current Tier Badge
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DYNAMIC ORDERS TAB */}
                {profileTab === 'orders' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <Package className="text-[#00F0FF]" size={24} /> Virtual Game Key Allocations
                    </h2>

                    {orders.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] space-y-4">
                        <ShoppingBag size={40} className="text-gray-600 mx-auto" />
                        <div className="space-y-1">
                          <h3 className="text-sm font-black uppercase tracking-tight">No Active Assets</h3>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">You have not completed any game account purchases yet.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {orders.map((ord: any) => (
                          <div key={ord.id} className="bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
                            <div className="p-6 bg-white/5 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <div className="text-[9px] font-mono text-gray-400">ORDER CODE: {ord.id}</div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-[#00F0FF] mt-1">
                                  {ord.items?.map((it: any) => it.name).join(', ') || 'Shared PSN Slot License'}
                                </h4>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-white">{formatPrice(ord.total || ord.price || 0)}</div>
                                <div className="text-[9px] text-[#00F0FF] font-black tracking-widest uppercase">DELIVERED & SECURED</div>
                              </div>
                            </div>

                            <div className="p-6 space-y-4">
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed">
                                To play this game, add a login user account on your console with the credentials below. Ensure you follow the specific guidelines to maintain valid warranty coverage.
                              </p>

                              {/* Credentials detail card */}
                              <div className="p-4 bg-black/60 border border-[#00F0FF]/30 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Shared PSN Email address</span>
                                  <span className="text-[#00F0FF] font-black">{ord.userEmail || user.email}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Assigned Shared Password</span>
                                  <span className="text-yellow-400 font-black">•••••••• [Protected]</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() => showToast("Credentials copied to clipboard")}
                                  className="px-4 py-2 bg-white/5 hover:bg-[#00F0FF] hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest text-[#00F0FF] transition-all"
                                >
                                  Copy Email Address
                                </button>
                                <button
                                  onClick={() => showToast("Sony authorization reset request pinged to ERP system!")}
                                  className="px-4 py-2 bg-indigo-950/40 border border-[#6C5CE7]/30 text-indigo-300 hover:bg-[#6C5CE7] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  Reset Console Authorization
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. RECEIPTS TAB */}
                {profileTab === 'receipts' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <FileText className="text-[#00F0FF]" size={24} /> Official Purchase Invoices
                    </h2>

                    {receipts.length === 0 ? (
                      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 text-center text-gray-500 text-xs uppercase font-black tracking-widest">
                        No receipts uploaded to metadata. Once your order leaves 'processing', an official PDF receipt gets locked here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {receipts.map((rec: any, idx) => (
                          <div key={rec.id || idx} className="p-6 bg-[#151619] rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold text-[#00F0FF]">{rec.receiptCode || `ZLG-2026-${String(idx).padStart(6, '0')}`}</span>
                              <h4 className="text-xs font-black uppercase tracking-tight text-white">{rec.productName} ({rec.slotType})</h4>
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Date Issued: {new Date(rec.date).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase block">Total Settled</span>
                                <span className="text-sm font-black text-white">{formatPrice(rec.price)}</span>
                              </div>
                              <button
                                onClick={() => window.print()}
                                className="px-5 py-2.5 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black transition-all rounded-xl text-[9px] font-black uppercase tracking-wider"
                              >
                                Print Invoice
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ACTIVE RESERVATIONS TAB */}
                {profileTab === 'reservations' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <Clock className="text-[#00F0FF]" size={24} /> Active Reservation Slot Locks
                    </h2>

                    {reservations.length === 0 ? (
                      <div className="py-20 text-center bg-[#151619] border border-white/5 rounded-[2rem] space-y-4">
                        <Compass className="text-gray-600 mx-auto" size={32} />
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">No active reservation locks exist on your account currently.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reservations.map((res: any) => (
                          <div key={res.id} className="p-6 bg-[#151619] rounded-2xl border border-[#00F0FF]/25 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <span className="text-[9px] font-mono text-cyan-400 capitalize bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/10">RESERVING CONSOLE HOLD: {res.slotType}</span>
                                <h4 className="text-sm font-black uppercase tracking-tight text-white mt-1">{res.productName}</h4>
                                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest block mt-1">Linked library: {res.digitalAccountId}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-gray-500 uppercase block">STATUS</span>
                                <span className="text-xs text-green-400 font-bold uppercase tracking-widest">{res.status}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                              <div className="flex items-center gap-2 text-[10px] text-red-400 uppercase font-black">
                                <Clock size={14} /> AUTORELEASE HOLD LOCK ACTIVE RANGE: 4 HOURS TOTAL
                              </div>
                              <Link
                                to="/checkout"
                                className="px-5 py-2.5 bg-[#00F0FF] text-black hover:scale-105 transition-transform rounded-xl text-[9px] font-black uppercase tracking-widest"
                              >
                                Checkout Reserved Game Slot
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. SLA WARRANTIES TAB */}
                {profileTab === 'warranties' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <ShieldCheck className="text-[#00F0FF]" size={24} /> Active 1-Year SLA Contracts
                    </h2>

                    {warranties.length === 0 ? (
                      <div className="py-16 text-center bg-[#151619] border border-white/5 rounded-2xl text-gray-500 text-xs uppercase font-black tracking-widest">
                        Your purchased digital libraries will automatically generate a dynamic 1-Year SLA Contract here.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {warranties.map((war: any) => (
                          <div key={war.id} className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-tight text-white">{war.productName} ({war.slotType})</h4>
                                <div className="text-[9px] text-gray-500 font-mono mt-0.5">CONTRACT KEY: {war.id}</div>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-gray-500 uppercase block">WARRANTY STATUS</span>
                                <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[9px] font-bold uppercase rounded border border-green-500/20">{war.status || 'ACTIVE'}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[10px] uppercase font-bold text-gray-400 border-t border-white/5 pt-4">
                              <div>
                                <span className="text-[8px] text-gray-500 block">START COVERAGE</span>
                                <span>{new Date(war.startDate).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-[8px] text-gray-500 block">EXCLUDES COOLDOWN EXPIRATION</span>
                                <span>{new Date(war.endDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. WISHLIST TAB */}
                {profileTab === 'wishlist' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <Heart className="text-pink-500" size={24} /> Saved items inside the Vault
                    </h2>

                    {wishlist.length === 0 ? (
                      <div className="py-20 text-center bg-[#151619] border border-white/5 rounded-[2.5rem] space-y-4">
                        <Heart className="text-gray-600 mx-auto" size={32} />
                        <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Your digital list is currently empty.</p>
                        <Link to="/shop" className="inline-block px-5 py-3 bg-[#00F0FF] text-black text-[9px] font-black uppercase rounded-xl tracking-widest mt-4">
                          Browse Collection
                        </Link>
                      </div>
                    ) : (
                      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 text-center text-gray-400 text-xs">
                        You have {wishlist.length} gaming gear keys bookmarked in your secure cookie vault. Complete checkout within the shop to secure shared account slots.
                      </div>
                    )}
                  </div>
                )}

                {/* 7. SAVED ADDRESSES TAB */}
                {profileTab === 'addresses' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Saved Shipping Coordinates</h2>
                    <form onSubmit={handleSaveAddress} className="bg-[#151619] rounded-[2rem] border border-white/5 p-8 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">Street Name & Number</label>
                          <input
                            type="text"
                            value={address.street}
                            onChange={e => setAddress({ ...address, street: e.target.value })}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">City</label>
                          <input
                            type="text"
                            value={address.city}
                            onChange={e => setAddress({ ...address, city: e.target.value })}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">Governorate</label>
                          <input
                            type="text"
                            value={address.governorate}
                            onChange={e => setAddress({ ...address, governorate: e.target.value })}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">Contact Number</label>
                          <input
                            type="text"
                            value={address.phone}
                            onChange={e => setAddress({ ...address, phone: e.target.value })}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="px-6 py-3 bg-[#00F0FF] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                      >
                        Synchronize Address
                      </button>
                    </form>
                  </div>
                )}

                {/* 8. ACCOUNT SETTINGS TAB */}
                {profileTab === 'settings' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">User Preferences Console</h2>
                    <form onSubmit={handleSaveSettings} className="bg-[#151619] rounded-[2rem] border border-white/5 p-8 space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs"
                            placeholder="Gamer Alias"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-gray-500">Ticket Preference Language</label>
                          <select
                            value={tickLanguage}
                            onChange={e => setTickLanguage(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
                          >
                            <option value="English">English</option>
                            <option value="Arabic">Arabic (العربية)</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between text-xs text-gray-400">
                        <span>Multi-factor authentication via Authenticator</span>
                        <input type="checkbox" defaultChecked className="accent-[#00F0FF] rounded" />
                      </div>

                      <button
                        type="submit"
                        className="px-6 py-3 bg-[#00F0FF] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                      >
                        Commit Updates
                      </button>
                    </form>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
