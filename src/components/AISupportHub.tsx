import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, X, Send, Bot, User, Sparkles, Minus, Maximize2, 
  Ticket, HelpCircle, PhoneCall, CheckCircle2, ShieldCheck, ArrowLeft, ChevronRight
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../App';
import { apiService } from '../lib/apiService';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

interface SupportTicket {
  id: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  email: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SOLVED';
  replies?: any[];
  createdAt: string;
}

export default function AISupportHub() {
  const { storeSettings, compareList = [] } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'ticket' | 'faq' | 'whatsapp'>('ai');

  // Listen to external toggle/open triggers
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
      setIsMinimized(false);
    };
    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('toggle-support-hub', handleToggle);
    window.addEventListener('open-support-hub', handleOpen);
    (window as any).openSupportHub = handleOpen;
    return () => {
      window.removeEventListener('toggle-support-hub', handleToggle);
      window.removeEventListener('open-support-hub', handleOpen);
      delete (window as any).openSupportHub;
    };
  }, []);
  
  // Tab AI Chat states
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'Neural Support Link established. How can I assist your gaming experience today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tab Ticket States
  const [ticketCategory, setTicketCategory] = useState('Account Allocation');
  const [ticketPriority, setTicketPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [ticketEmail, setTicketEmail] = useState(auth.currentUser?.email || '');
  const [ticketDesc, setTicketDesc] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  // Conversational view for individual tickets
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Real-time synchronization of customer filed tickets direct from Firestore
  useEffect(() => {
    let cachedIDs: string[] = [];
    try {
      const saved = localStorage.getItem('zl_support_ticket_ids');
      if (saved) cachedIDs = JSON.parse(saved);
    } catch (_) {}

    const currEmail = auth.currentUser?.email || ticketEmail;

    const qTickets = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qTickets, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const filtered = list.filter(t => 
        (currEmail && t.email?.toLowerCase() === currEmail.toLowerCase()) || 
        cachedIDs.includes(t.id)
      );
      setTickets(filtered);

      if (selectedTicket) {
        const updatedDetail = filtered.find(t => t.id === selectedTicket.id);
        if (updatedDetail) setSelectedTicket(updatedDetail);
      }
    }, (err) => {
      console.warn("Realtime support tickets snapshot load failed: ", err);
    });

    return () => unsub();
  }, [ticketEmail, auth.currentUser?.email, selectedTicket?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'ai') {
      scrollToBottom();
    }
  }, [messages, isLoading, activeTab]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const historySnapshot = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiService.sendSupportMessage(
        input.trim(),
        messages.map(m => ({ role: m.role, content: m.content }))
      );

      const botReply = data?.reply || "I have received your inquiry. How else can I assist you with ZeroLag Games Store products or activation today?";
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', content: botReply };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Support chat error:", err);
      // Fallback message
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: (Date.now()+1).toString(), 
          role: 'bot', 
          content: 'Thank you for reaching out! For immediate priority support, you can also contact our team directly via WhatsApp at 01114763125.' 
        }]);
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketEmail.trim() || !ticketDesc.trim()) return;

    try {
      const ticketId = "ZL-" + Math.floor(100000 + Math.random() * 900000);
      await addDoc(collection(db, 'support_tickets'), {
        id: ticketId,
        category: ticketCategory,
        priority: ticketPriority,
        email: ticketEmail.trim(),
        description: ticketDesc.trim(),
        status: 'PENDING',
        replies: [],
        createdAt: new Date().toISOString()
      });

      // Keep ID stored locally so they can see their submissions even as guest/unauth
      let cachedIDs: string[] = [];
      try {
        const saved = localStorage.getItem('zl_support_ticket_ids');
        if (saved) cachedIDs = JSON.parse(saved);
      } catch (_) {}
      cachedIDs.push(ticketId);
      localStorage.setItem('zl_support_ticket_ids', JSON.stringify(cachedIDs));

      setTicketSubmitted(true);
      setTicketDesc('');
      setTimeout(() => {
        setTicketSubmitted(false);
      }, 4000);
    } catch (err) {
      console.error("Failed to lodge support ticket: ", err);
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const q = query(collection(db, 'support_tickets'), where('id', '==', selectedTicket.id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, 'support_tickets', snap.docs[0].id);
        const currentReplies = selectedTicket.replies || [];
        const newReply = {
          sender: 'customer',
          message: ticketReplyText.trim(),
          timestamp: new Date().toISOString()
        };
        await updateDoc(docRef, {
          replies: [...currentReplies, newReply]
        });
        setTicketReplyText('');
      } else {
        console.error("Ticket document not found in Firestore!");
      }
    } catch (err) {
      console.error("Failed to post candidate reply: ", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const waVal = storeSettings?.whatsApp || "01114763125";
    const cleanWaVal = waVal.startsWith('0') ? '2' + waVal : (waVal.startsWith('+') ? waVal.slice(1) : '2' + waVal);
    const textMsg = encodeURIComponent("Hello Zerolag Egypt! I require assistance regarding digital slots on my account...");
    window.open(`https://wa.me/${cleanWaVal}?text=${textMsg}`, '_blank');
  };

  const faqs = [
    { q: "How do I activate the shared slot on my console?", a: "Go to Console Settings > User Accounts > Add User. Input the digital account credentials provided in your receipts dashboard, then activate as primary (PS4 Primary or PS5 Console Sharing)." },
    { q: "Can other people play on my profile?", a: "Yes, if purchased as a Primary slot, you can play using your standard personal account. Do not share credentials or modify secondary passwords." },
    { q: "What does the 1-Year dynamic warranty cover?", a: "Covers complete lock recovery, license corrections, password updates, and automated slot replacements. Does not cover console bans due to unauthorized modifications." },
    { q: "How long can I reserve a slot?", a: "Standard reservations remain active on the hold ledger for exactly 24 hours, after which our sweeper engine auto-expires the hold." }
  ];

  return (
    <div className={`fixed ${compareList.length > 0 ? 'bottom-[120px] sm:bottom-[120px]' : 'bottom-6 sm:bottom-6'} right-4 sm:right-6 z-[999]`}>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-[#00F0FF] text-black rounded-full shadow-[0_0_30px_rgba(0,240,255,0.4)] flex items-center justify-center hover:scale-110 transition-transform group"
          >
            <MessageSquare size={24} className="sm:size-7 group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#6C5CE7] rounded-full border-2 border-[#0B0B0F] flex items-center justify-center animate-bounce">
              <span className="text-[7px] font-black text-white">AI</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`bg-[#0d0e12] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'h-20 w-72' : 'h-[620px] w-[400px] max-w-[calc(100vw-32px)] sm:max-w-[calc(100vw-48px)]'}`}
          >
            {/* Header */}
            <div className="p-6 bg-[#151619] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
                   <Bot size={20} />
                </div>
                <div>
                   <h4 className="text-sm font-black uppercase tracking-tighter text-white">SUPPORT <span className="text-[#00F0FF]">MATRIX</span></h4>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Enterprise Core Normal</span>
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                    {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                 </button>
                 <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                    <X size={16} />
                 </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Custom Sub-navigation Tabs */}
                <div className="flex items-center justify-between border-b border-white/5 bg-[#111216] px-4 py-2 text-[10px] font-black uppercase tracking-widest overflow-x-auto gap-2">
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className={`pb-1 px-1 transition-colors flex items-center gap-1 ${activeTab === 'ai' ? 'text-[#00F0FF] border-b-2 border-[#00F0FF]' : 'text-gray-500 hover:text-white'}`}
                  >
                    <MessageSquare size={12} /> AI Link
                  </button>
                  <button 
                    onClick={() => setActiveTab('ticket')}
                    className={`pb-1 px-1 transition-colors flex items-center gap-1 ${activeTab === 'ticket' ? 'text-[#00F0FF] border-b-2 border-[#00F0FF]' : 'text-gray-500 hover:text-white'}`}
                  >
                    <Ticket size={12} /> Tickets
                  </button>
                  <button 
                    onClick={() => setActiveTab('whatsapp')}
                    className={`pb-1 px-1 transition-colors flex items-center gap-1 ${activeTab === 'whatsapp' ? 'text-[#00F0FF] border-b-2 border-[#00F0FF]' : 'text-gray-500 hover:text-white'}`}
                  >
                    <PhoneCall size={12} /> WhatsApp
                  </button>
                  <button 
                    onClick={() => setActiveTab('faq')}
                    className={`pb-1 px-1 transition-colors flex items-center gap-1 ${activeTab === 'faq' ? 'text-[#00F0FF] border-b-2 border-[#00F0FF]' : 'text-gray-500 hover:text-white'}`}
                  >
                    <HelpCircle size={12} /> FAQ Hub
                  </button>
                </div>

                {/* Tab content area */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  
                  {activeTab === 'ai' && (
                    <div className="space-y-6 h-full flex flex-col justify-between">
                      <div className="space-y-6 flex-1 overflow-y-auto max-h-[380px]">
                        {messages.map((m) => (
                          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-[#6C5CE7] text-white' : 'bg-white/5 text-[#00F0FF]'}`}>
                                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                               </div>
                               <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed ${m.role === 'user' ? 'bg-[#6C5CE7] text-white rounded-tr-none' : 'bg-white/5 text-gray-300 border border-white/5 rounded-tl-none'}`}>
                                  {m.content}
                               </div>
                            </div>
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start">
                             <div className="flex gap-3 items-center text-gray-500">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                   <Sparkles size={16} className="animate-spin text-[#00F0FF]" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Consulting Gaming databases...</span>
                             </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input block inside tab */}
                      <form onSubmit={handleSend} className="pt-4 border-t border-white/5">
                        <div className="relative">
                          <input 
                            placeholder="Type assistance question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00F0FF]/50 transition-all text-xs font-semibold uppercase tracking-wider"
                          />
                          <button 
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#00F0FF] hover:scale-110 disabled:text-gray-600 disabled:hover:scale-100 transition-all animate-pulse"
                          >
                            <Send size={20} />
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeTab === 'ticket' && (
                    selectedTicket ? (
                      <div className="space-y-4">
                        <button 
                          onClick={() => setSelectedTicket(null)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:text-white pb-1"
                        >
                          <ArrowLeft size={12} /> Back to Ticket Ledger
                        </button>
                        
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-extrabold text-[#00F0FF] uppercase">{selectedTicket.category}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                              selectedTicket.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                              selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-green-500/10 text-green-400'
                            }`}>
                              {selectedTicket.status}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-gray-500 font-mono">
                            TICKET ID: {selectedTicket.id} &bull; PRIORITY: <span className="font-bold text-white">{selectedTicket.priority || 'Medium'}</span>
                          </div>
                          
                          <p className="text-xs text-white leading-normal bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-wrap font-semibold uppercase tracking-wide">
                            {selectedTicket.description}
                          </p>
                        </div>
                        
                        {/* Conversation replies log */}
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block font-sans">REPLY LEDGER LOGS</span>
                          {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                            <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                              No staff feedback received yet. Still in queue.
                            </div>
                          ) : (
                            selectedTicket.replies.map((rep: any, idx: number) => (
                              <div 
                                key={idx} 
                                className={`p-3 rounded-xl border max-w-[85%] text-[10px] leading-relaxed ${
                                  rep.sender === 'customer' 
                                    ? 'bg-white/5 border-white/5 ml-auto text-right' 
                                    : 'bg-[#00F0FF]/5 border-[#00F0FF]/10 text-left'
                                }`}
                              >
                                <span className="text-[8px] text-gray-400 uppercase font-bold block mb-1">
                                  {rep.sender === 'customer' ? 'You' : 'ZeroLag Support Staff'}
                                </span>
                                <p className="text-white font-medium whitespace-pre-wrap uppercase tracking-wide text-[9px]">{rep.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {/* Send follower up reply input */}
                        <form onSubmit={handleSendTicketReply} className="pt-2 border-t border-white/5 flex gap-2">
                          <input 
                            placeholder="Type backup message detailing state..."
                            value={ticketReplyText}
                            onChange={e => setTicketReplyText(e.target.value)}
                            className="flex-1 bg-[#101114] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#00F0FF]/30"
                          />
                          <button 
                            type="submit"
                            disabled={!ticketReplyText.trim() || sendingReply}
                            className="px-4 bg-[#00F0FF] text-black text-[10px] font-black uppercase tracking-widest rounded-xl disabled:bg-gray-700 disabled:text-gray-500"
                          >
                            Send
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[9px] font-black uppercase text-[#00F0FF]">CORE SUPPORT TICKETS</span>
                          <p className="text-[10px] text-gray-400 uppercase font-bold leading-normal mt-1">
                            Submit a direct support ticket to Egypt's ZeroLag warehouse management.
                          </p>
                        </div>

                        <AnimatePresence>
                          {ticketSubmitted && (
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3"
                            >
                              <CheckCircle2 className="text-green-400" size={18} />
                              <div className="leading-tight">
                                <span className="text-[10px] font-black text-white uppercase">Ticket Registered</span>
                                <p className="text-[9px] text-gray-400 uppercase">Support staff will message your email within 1 hour.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <form onSubmit={handleTicketSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-[9px] font-black uppercase text-gray-400">Inquiry Category</label>
                              <select 
                                value={ticketCategory}
                                onChange={e => setTicketCategory(e.target.value)}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-[10px] text-white uppercase font-bold"
                              >
                                <option value="Account Allocation">Allocation / Prim Slot</option>
                                <option value="Warranty Claim">Warranty Claim</option>
                                <option value="Payment verification">Payment delay</option>
                                <option value="General Query">General Query</option>
                              </select>
                            </div>

                            <div className="space-y-1.5 col-span-1">
                              <label className="text-[9px] font-black uppercase text-gray-400">Claim Priority</label>
                              <select 
                                value={ticketPriority}
                                onChange={e => setTicketPriority(e.target.value as any)}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-[10px] text-white uppercase font-bold"
                              >
                                <option value="Low">Low - Info Query</option>
                                <option value="Medium">Medium - Standard Status</option>
                                <option value="High">High - Locked Account</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-gray-400">Your registered Email</label>
                            <input 
                              type="email"
                              required
                              placeholder="e.g. aly@gmail.com"
                              value={ticketEmail}
                              onChange={e => setTicketEmail(e.target.value)}
                              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white uppercase font-bold"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-gray-400">Explain the issue thoroughly</label>
                            <textarea 
                              required
                              rows={3}
                              placeholder="e.g. Received PS5 credentials, but primary console activation says 'Too many devices activated'..."
                              value={ticketDesc}
                              onChange={e => setTicketDesc(e.target.value)}
                              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white uppercase font-semibold"
                            />
                          </div>

                          <button 
                            type="submit"
                            className="w-full py-4 bg-[#00F0FF] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform"
                          >
                            SUBMIT TO TICKET OPERATIONS
                          </button>
                        </form>

                        {/* Client registered tickets log list */}
                        {tickets.length > 0 && (
                          <div className="pt-4 border-t border-white/5 space-y-3">
                            <span className="text-[9px] font-black uppercase text-gray-500">YOUR FILED TICKETS LOG ({tickets.length})</span>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                              {tickets.map(t => (
                                <div 
                                  key={t.id} 
                                  onClick={() => setSelectedTicket(t)}
                                  className="p-3 bg-[#111216] hover:bg-[#15161a] hover:border-[#00F0FF]/30 cursor-pointer rounded-xl border border-white/5 flex justify-between items-center text-[10px] transition-all"
                                >
                                  <div className="leading-tight">
                                    <span className="font-bold text-white uppercase truncate block max-w-[130px]">{t.category}</span>
                                    <span className="font-mono text-gray-500 block text-[8px] mt-0.5">{t.id} &bull; PRIORITY: {t.priority || 'Medium'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                                      t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                                      t.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                                      'bg-green-500/10 text-green-400'
                                    }`}>
                                      {t.status}
                                    </span>
                                    <ChevronRight size={10} className="text-gray-650" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {activeTab === 'whatsapp' && (
                    <div className="space-y-6 text-center py-6">
                      <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.15)] mb-4">
                        <PhoneCall size={32} />
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-white">Direct WhatsApp Support</h3>
                      <p className="text-xs text-gray-400 max-w-xs mx-auto uppercase font-bold leading-normal">
                        Skip chat queues entirely. Sync instantly with our Egypt operations line on WhatsApp and dispatch receipts manually.
                      </p>
                      
                      <button 
                        onClick={handleWhatsAppRedirect}
                        className="px-8 py-4 bg-green-500 text-green-950 font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                      >
                        LAUNCH WHATSAPP TRANSMISSION
                      </button>

                      <p className="text-[9px] text-gray-500 uppercase tracking-wider font-extrabold max-w-xxs mx-auto pt-6">
                        ✓ Operations shift active daily Cairo time: 10:00 AM - 02:00 AM.
                      </p>
                    </div>
                  )}

                  {activeTab === 'faq' && (
                    <div className="space-y-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF]">FREQUENTLY ENCOUNTERED ERRORS</span>
                      <div className="space-y-3">
                        {faqs.map((f, i) => (
                          <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
                            <span className="text-xs font-black uppercase text-white tracking-tight">{f.q}</span>
                            <p className="text-[10px] text-gray-400 leading-normal uppercase font-semibold">{f.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
