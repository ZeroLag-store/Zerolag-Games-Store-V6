import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc 
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  MessageSquare, User, HelpCircle, ArrowLeft, RefreshCcw, Send, 
  Calendar, Check, AlertCircle, ShieldAlert
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export default function SupportModule() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SOLVED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'Low' | 'Medium' | 'High'>('ALL');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      setTickets(data);
      // Keep detail ticket refreshed in state 
      if (selectedTicket) {
        const updated = data.find((t: any) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
      setLoading(false);
    }, (err) => {
      console.error("Failed to load customer support tickets", err);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedTicket?.id]);

  const handleUpdateStatus = async (ticketDocId: string, newStatus: string) => {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketDocId);
      await updateDoc(ticketRef, {
        status: newStatus
      });
      // Log actions as activity logging
    } catch (err) {
      console.error("Failed to update status: ", err);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const ticketRef = doc(db, 'support_tickets', selectedTicket.docId);
      const currentReplies = selectedTicket.replies || [];
      const newReply = {
        sender: 'staff',
        message: adminReplyText.trim(),
        timestamp: new Date().toISOString()
      };
      
      // Auto transition to "IN_PROGRESS" on reply unless already "SOLVED"
      const nextStatus = selectedTicket.status === 'SOLVED' ? 'SOLVED' : 'IN_PROGRESS';

      await updateDoc(ticketRef, {
        replies: [...currentReplies, newReply],
        status: nextStatus
      });
      setAdminReplyText('');
    } catch (err) {
      console.error("Failed to submit admin reply: ", err);
    } finally {
      setSendingReply(false);
    }
  };

  // Filter computation
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  return (
    <div className="bg-[#151619] rounded-3xl border border-white/5 p-6 space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
        <div>
          <span className="text-[10px] text-[#00F0FF] font-black uppercase tracking-widest block">Neural Support Dashboard</span>
          <h1 className="text-xl font-black text-white uppercase tracking-tight mt-1">Claims & Customer Tickets</h1>
        </div>
        
        {/* Quick parameters filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0b0b0f] p-1 border border-white/5 rounded-xl">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'SOLVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st as any)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors ${
                  statusFilter === st ? 'bg-[#00F0FF] text-black' : 'text-gray-405 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="bg-[#0b0b0f] border border-white/5 rounded-xl text-[9px] py-2 px-3 font-black uppercase tracking-wider text-white"
          >
            <option value="ALL">PRIORITY: ALL</option>
            <option value="Low">Low Only</option>
            <option value="Medium">Medium Only</option>
            <option value="High">High Priority Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCcw className="animate-spin text-[#00F0FF] mx-auto mb-4" size={32} />
          <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Querying Support tickets...</span>
        </div>
      ) : selectedTicket ? (
        /* Conversational Inner View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chat Stream */}
          <div className="lg:col-span-2 space-y-6 bg-black/30 p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <button 
                onClick={() => setSelectedTicket(null)}
                className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-white uppercase font-black"
              >
                <ArrowLeft size={14} /> Back to ledger
              </button>

              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider uppercase ${
                selectedTicket.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                'bg-green-500/10 text-green-400'
              }`}>
                Claim status: {selectedTicket.status}
              </span>
            </div>

            {/* Chat logs render */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#00F0FF] uppercase font-black">ORIGINAL DISPATCH BY USER</span>
                  <span className="font-mono text-gray-500">{selectedTicket.createdAt}</span>
                </div>
                <p className="text-xs text-white uppercase font-medium leading-normal tracking-wide whitespace-pre-wrap mt-2">{selectedTicket.description}</p>
              </div>

              {/* Replier conversation trail */}
              {selectedTicket.replies && selectedTicket.replies.map((r: any, idx: number) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl border max-w-[85%] text-xs ${
                    r.sender === 'staff' 
                      ? 'bg-blue-500/5 border-blue-500/10 ml-auto text-right' 
                      : 'bg-white/5 border-white/5 mr-auto text-left'
                  }`}
                >
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">
                    {r.sender === 'staff' ? 'Your feedback (Staff)' : 'Customer Client'}
                  </span>
                  <p className="text-white font-semibold uppercase tracking-wide text-[10px]">{r.message}</p>
                </div>
              ))}
            </div>

            {/* Admin replier interface */}
            <form onSubmit={handleSendAdminReply} className="pt-4 border-t border-white/5 flex gap-3">
              <input 
                placeholder="Type response detailing action / credentials adjustment..."
                value={adminReplyText}
                onChange={e => setAdminReplyText(e.target.value)}
                className="flex-1 bg-[#0b0b0f] border border-white/10 rounded-xl py-3 px-4 text-xs text-white uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#00F0FF]/30"
              />
              <button 
                type="submit"
                disabled={!adminReplyText.trim() || sendingReply}
                className="px-6 bg-[#00F0FF] hover:bg-[#33F3FF] text-black font-black uppercase text-xs tracking-widest rounded-xl disabled:bg-gray-700"
              >
                Reply
              </button>
            </form>
          </div>

          {/* Ticket Information & Quick Actions Pane */}
          <div className="col-span-1 bg-black/40 p-6 rounded-2xl border border-white/5 space-y-6 text-xs text-gray-400 font-mono">
            <div>
              <span className="text-[9px] uppercase font-black block text-gray-500">Ticket Category</span>
              <span className="text-white uppercase font-black mt-1 text-sm block">{selectedTicket.category}</span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-black block text-gray-500">Client Email</span>
              <span className="text-white font-bold mt-1 text-xs block">{selectedTicket.email}</span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-black block text-gray-400">Claim Priority</span>
              <span className={`font-black uppercase tracking-wider block mt-1 ${
                selectedTicket.priority === 'High' ? 'text-red-400' :
                selectedTicket.priority === 'Medium' ? 'text-amber-500' : 'text-gray-500'
              }`}>{selectedTicket.priority || 'Medium'}</span>
            </div>

            {/* Change order status triggers directly */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <span className="text-[8px] uppercase font-black tracking-widest text-[#00F0FF] block mb-2">Adjust Claim State</span>
              <button 
                onClick={() => handleUpdateStatus(selectedTicket.docId, 'PENDING')}
                disabled={selectedTicket.status === 'PENDING'}
                className="w-full text-center py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 font-black rounded text-[9px] uppercase tracking-widest disabled:opacity-30"
              >
                Mark Pending
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedTicket.docId, 'IN_PROGRESS')}
                disabled={selectedTicket.status === 'IN_PROGRESS'}
                className="w-full text-center py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-black rounded text-[9px] uppercase tracking-widest disabled:opacity-30"
              >
                Mark In Progress
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedTicket.docId, 'SOLVED')}
                disabled={selectedTicket.status === 'SOLVED'}
                className="w-full text-center py-2 bg-green-500/10 hover:bg-green-500/25 text-green-400 border border-green-500/20 font-black rounded text-[9px] uppercase tracking-widest disabled:opacity-30"
              >
                Mark Solved ✓
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Overall Listing Ledger Table */
        <div className="overflow-x-auto">
          {filteredTickets.length === 0 ? (
            <div className="py-16 text-center">
              <HelpCircle className="text-gray-600 mx-auto mb-3" size={24} />
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">No matching claims on current grid view filter parameters</span>
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs uppercase tracking-wider">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] font-black text-gray-500">
                      <th className="pb-3 pl-2">Ticket ID</th>
                      <th className="pb-3">Client Email</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3 text-center">Priority</th>
                      <th className="pb-3 text-center">Replies</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right pr-4">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map(t => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/10 transition-colors group">
                        <td className="py-4 pl-2 font-mono text-[#00F0FF] font-extrabold">{t.id}</td>
                        <td className="py-4 font-bold text-white normal-case">{t.email}</td>
                        <td className="py-4 font-extrabold text-gray-300 max-w-[150px] truncate">{t.category}</td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${
                            t.priority === 'High' ? 'bg-red-500/10 text-red-500 font-extrabold' : 
                            t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-400/10 text-gray-400'
                          }`}>
                            {t.priority || 'Medium'}
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono font-black text-gray-500">
                          {t.replies?.length || 0}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[8px] font-black tracking-widest ${
                            t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                            t.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-green-500/10 text-green-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-4">
                          <button
                            onClick={() => setSelectedTicket(t)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-[#00F0FF] hover:text-black rounded text-[9px] font-black transition-colors"
                          >
                            Launch Conversation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Stacked Cards */}
              <div className="md:hidden space-y-4">
                {filteredTickets.map(t => (
                  <div key={t.id} className="bg-[#1A1C20]/85 rounded-2xl border border-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-[#00F0FF] text-xs">
                        #{t.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${
                        t.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                        t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-400/10 text-gray-400'
                      }`}>
                        {t.priority || 'Medium'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">Client Email</span>
                      <div className="text-white text-xs font-bold font-mono normal-case break-all">{t.email}</div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">Category</span>
                      <div className="text-gray-300 text-xs font-semibold">{t.category}</div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-0.5">Replies</span>
                        <span className="font-mono text-xs font-black text-gray-400">{t.replies?.length || 0}</span>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${
                          t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                          t.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-green-500/10 text-green-400'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="w-full text-center py-2.5 bg-white/5 border border-white/10 hover:bg-[#00F0FF] hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Launch Conversation
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
