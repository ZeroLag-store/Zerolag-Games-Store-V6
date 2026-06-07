import React, { useState } from 'react';
import { 
  Users, Search, Plus, Phone, MessageSquare, Facebook, ClipboardCheck, 
  Trash2, Award, Calendar, CreditCard, ChevronRight, Edit3, UserCheck, CheckCircle
} from 'lucide-react';
import { Customer, Order, Warranty, Reservation } from '../../types';
import { formatPrice } from '../../lib/utils';
import { motion } from 'framer-motion';

interface CustomerModuleProps {
  customers: Customer[];
  orders: Order[];
  warranties: Warranty[];
  reservations: Reservation[];
  onAddCustomer: (customer: Partial<Customer>) => void;
  onEditCustomer: (customerId: string, customer: Partial<Customer>) => void;
  onDeleteCustomer: (customerId: string) => void;
  onLogActivity: (action: string, entity: string, details: string) => void;
  showToast: (msg: string) => void;
  userRole: string; // OWNER, MANAGER, EMPLOYEE
}

export default function CustomerModule({
  customers,
  orders,
  warranties,
  reservations,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onLogActivity,
  showToast,
  userRole
}: CustomerModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formCustomer, setFormCustomer] = useState<Partial<Customer>>({
    fullName: '',
    phoneNumber: '',
    whatsApp: '',
    facebookProfile: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const filteredCustomers = customers.filter(c => 
    (c.fullName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (c.phoneNumber || '').includes(searchQuery) ||
    (c.whatsApp || '').includes(searchQuery)
  );

  // Auto select first customer if found and none selected
  React.useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomerId]);

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // Get customer specific sub-records
  const customerOrders = orders.filter(o => o.customerId === selectedCustomerId);
  const customerWarranties = warranties.filter(w => w.customerId === selectedCustomerId);
  const customerReservations = reservations.filter(r => r.customerId === selectedCustomerId);
  const totalSpent = customerOrders
    .filter(o => o.status === 'Completed')
    .reduce((sum, current) => sum + current.price, 0);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomer.fullName || !formCustomer.phoneNumber) {
      showToast('Name and Phone are mandatory');
      return;
    }

    const payload = {
      ...formCustomer,
      whatsApp: formCustomer.whatsApp || formCustomer.phoneNumber // default whatsapp to phone if empty
    };

    if (editingId) {
      onEditCustomer(editingId, payload);
      showToast('CRM record updated');
      onLogActivity('Modifed', 'Customer CRM', `Edited contact profile details for ${payload.fullName}`);
    } else {
      onAddCustomer(payload);
      showToast('Customer registered in CRM core');
      onLogActivity('Created', 'Customer CRM', `Registered new client target ${payload.fullName}`);
    }

    setIsEditing(false);
    setEditingId(null);
    setFormCustomer({ fullName: '', phoneNumber: '', whatsApp: '', facebookProfile: '', notes: '' });
  };

  const handleEditClick = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation(); // don't open details pane
    setFormCustomer(c);
    setEditingId(c.id);
    setIsEditing(true);
  };

  // WhatsApp quick text builder
  const sendWhatsAppMsg = (c: Customer) => {
    const textMsg = encodeURIComponent(`Hello ${c.fullName}! This is Zerolag Support informing you about your active console slots...`);
    window.open(`https://wa.me/${c.whatsApp.replace(/\+/g, '')}?text=${textMsg}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customer Directory Sidebar */}
      <div className="p-6 bg-[#151619] rounded-[2rem] border border-white/5 space-y-6 lg:col-span-1 h-fit">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
            <Users size={16} /> CLIENT DIRECTORY
          </h3>
          <button 
            onClick={() => { setFormCustomer({ fullName: '', phoneNumber: '', whatsApp: '', facebookProfile: '', notes: '' }); setEditingId(null); setIsEditing(true); }}
            className="p-1 px-3 bg-[#00F0FF]/10 text-[#00F0FF] rounded-lg text-[10px] font-black uppercase tracking-wider border border-[#00F0FF]/25 hover:bg-[#00F0FF] hover:text-black transition-all"
          >
            + Create
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search VIPs, mobile numbers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#00F0FF]"
          />
          <Search className="absolute left-3 top-3 text-gray-500" size={14} />
        </div>

        {/* Directory List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(cust => (
              <div 
                key={cust.id}
                onClick={() => setSelectedCustomerId(cust.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  selectedCustomerId === cust.id 
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.05)]' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="space-y-1 overflow-hidden">
                  <h4 className="font-extrabold uppercase text-xs truncate">{cust.fullName}</h4>
                  <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                    <Phone size={10} /> {cust.phoneNumber}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={(e) => handleEditClick(cust, e)}
                    className="p-1.5 text-gray-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 rounded"
                    title="Edit CRM variables"
                  >
                    <Edit3 size={12} />
                  </button>
                  {userRole !== 'EMPLOYEE' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm('Delete customer ledger?')) onDeleteCustomer(cust.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded"
                      title="Delete profile"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  <ChevronRight size={14} className="text-gray-500" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs uppercase tracking-widest border border-dashed border-white/5 rounded-2xl">
              No customers found
            </div>
          )}
        </div>
      </div>

      {/* Customer 360-degree interactive cards */}
      <div className="lg:col-span-2 space-y-6">
        {activeCustomer ? (
          <div className="space-y-6">
            {/* VIP Core Identity */}
            <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#6C5CE7]/15 rounded-full blur-[60px] -mr-16 -mt-16"></div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-tr from-[#00F0FF] to-[#6C5CE7] rounded-full flex items-center justify-center font-black text-xl text-[#0B0B0F] shadow-[0_0_20px_#00F0FF33]">
                    {(activeCustomer.fullName?.[0] || 'C').toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{activeCustomer.fullName}</h2>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Client terminal registered • 2026</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-300 pt-2">
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-[#00F0FF]" /> {activeCustomer.phoneNumber}
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={13} className="text-[#00F0FF]" /> {activeCustomer.whatsApp}
                  </div>
                  {activeCustomer.facebookProfile && (
                    <a href={activeCustomer.facebookProfile} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
                      <Facebook size={13} /> Facebook
                    </a>
                  )}
                </div>

                {activeCustomer.notes && (
                  <div className="p-4 bg-[#0B0B0F] rounded-xl border border-white/5 text-xs text-gray-400 italic">
                    {activeCustomer.notes}
                  </div>
                )}

                {/* Risk and VIP Standing metrics */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider ${
                    totalSpent > 5000 
                      ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    Risk Grade: {activeCustomer.notes?.toLowerCase().includes("chargeback") || activeCustomer.notes?.toLowerCase().includes("cancel") ? "⛔ MEDIUM RISK" : "✓ SECURE LOW RISK"}
                  </span>
                  <span className="px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/25">
                    Credit Rating: VIP Gamer AA+
                  </span>
                </div>
              </div>

              {/* LTV Block */}
              <div className="p-6 bg-[#0B0B0F] rounded-2xl border border-white/5 min-w-[220px] text-center space-y-1 relative z-10 shrink-0 self-stretch sm:self-auto flex flex-col justify-center">
                <CreditCard size={18} className="text-[#00F0FF] mx-auto mb-2" />
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest">LIFETIME VALUE (LTV)</div>
                <div className="text-2xl font-black text-green-400">{formatPrice(totalSpent)}</div>
                <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Settled completed orders</div>
                <span className="text-[8px] text-[#00F0FF] font-black uppercase tracking-widest pt-1 border-t border-white/5 mt-2">
                  TIER: {totalSpent >= 8000 ? "PLATINUM" : totalSpent >= 3000 ? "GOLD" : totalSpent >= 1000 ? "SILVER" : "BRONZE"}
                </span>
              </div>
            </div>

            {/* Sub modules Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Active Warranties */}
              <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2 border-b border-white/5 pb-3">
                  <Award size={14} /> Active Warranties ({customerWarranties.length})
                </h4>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {customerWarranties.length > 0 ? (
                    customerWarranties.map(w => (
                      <div key={w.id} className="p-3 bg-[#0B0B0F] rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-gray-300">{w.productName}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] ${w.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                            {w.status}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500 flex justify-between">
                          <span>End: {new Date(w.endDate?.seconds * 1000 || w.endDate).toLocaleDateString()}</span>
                          <span className="text-gray-600">{w.slotType}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 uppercase font-black text-center py-8">No current warranties</p>
                  )}
                </div>
              </div>

              {/* Reservations */}
              <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2 border-b border-white/5 pb-3">
                  <Calendar size={14} /> Held Reservations ({customerReservations.length})
                </h4>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {customerReservations.length > 0 ? (
                    customerReservations.map(r => (
                      <div key={r.id} className="p-3 bg-[#0B0B0F] rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-gray-300">{r.productName}</span>
                          <span className="px-2 py-0.5 rounded text-[8px] bg-amber-500/10 text-amber-400">
                            {r.status}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500 flex justify-between">
                          <span>Expiry: {new Date(r.reservedUntil?.seconds * 1000 || r.reservedUntil).toLocaleDateString()}</span>
                          <span className="text-gray-500">{r.slotType}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 uppercase font-black text-center py-8">No current holds</p>
                  )}
                </div>
              </div>

              {/* Purchase history */}
              <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#6C5CE7] flex items-center gap-2 border-b border-white/5 pb-3">
                  <ClipboardCheck size={14} /> Order History ({customerOrders.length})
                </h4>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {customerOrders.length > 0 ? (
                    customerOrders.map(o => (
                      <div key={o.id} className="p-3 bg-[#0B0B0F] rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-gray-300 truncate max-w-[100px]">{o.accountEmail}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] ${
                            o.status === 'Completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-gray-500 flex justify-between">
                          <span>{new Date(o.createdAt?.seconds * 1000 || o.createdAt).toLocaleDateString()}</span>
                          <span className="text-[#00F0FF]">{formatPrice(o.price)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 uppercase font-black text-center py-8">History empty</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rapid WhatsApp notification bar */}
            <div className="p-4 bg-[#0B0B0F] rounded-xl border border-white/5 flex items-center justify-between">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Need to notify custom terminal slot?</div>
              <button 
                onClick={() => sendWhatsAppMsg(activeCustomer)}
                className="px-4 py-2 bg-green-500 text-green-950 font-black uppercase text-[10px] tracking-widest rounded-lg flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <MessageSquare size={12} /> Contact on WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl">
            Select or register a client in the registry sidebar to access sub-ledgers.
          </div>
        )}
      </div>

      {/* Slide-over CRM Profile creation form */}
      {isEditing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0B0B0F]/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#151619] border border-white/10 rounded-[2rem] p-8 space-y-6"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#00F0FF]">
                {editingId ? 'EDIT CRM VIP' : 'REGISTER NEW CLIENT'}
              </h2>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-white font-bold text-xs uppercase"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Full Legal Name</label>
                <input 
                  type="text" 
                  required
                  value={formCustomer.fullName || ''}
                  onChange={e => setFormCustomer(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs focus:outline-none"
                  placeholder="e.g. Aly Osama"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Contact Number (Phone)</label>
                <input 
                  type="text" 
                  required
                  value={formCustomer.phoneNumber || ''}
                  onChange={e => setFormCustomer(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs"
                  placeholder="e.g. +201114763125"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">WhatsApp Number</label>
                <input 
                  type="text" 
                  value={formCustomer.whatsApp || ''}
                  onChange={e => setFormCustomer(prev => ({ ...prev, whatsApp: e.target.value }))}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs"
                  placeholder="Leave blank to use main number"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Facebook URL Profile</label>
                <input 
                  type="text" 
                  value={formCustomer.facebookProfile || ''}
                  onChange={e => setFormCustomer(prev => ({ ...prev, facebookProfile: e.target.value }))}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs"
                  placeholder="http://facebook.com/usr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Client CRM Notes</label>
                <textarea 
                  value={formCustomer.notes || ''}
                  onChange={e => setFormCustomer(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs focus:outline-none"
                  placeholder="VIP buyer, prefers subscriptions, bad paying habits, etc."
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-[#00F0FF] text-black font-black uppercase tracking-widest text-xs rounded-xl"
              >
                {editingId ? 'Modify Ledger' : 'Sync Client'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
