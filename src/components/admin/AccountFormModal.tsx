import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DigitalAccount, SlotStatus, SlotType, AccountSlot, Product } from '../../types';

interface AccountFormModalProps {
  account: DigitalAccount | null; // null if creating new
  products: Product[];
  onClose: () => void;
  onSave: (accountData: Partial<DigitalAccount>, editingId: string | null) => void;
  showToast: (msg: string) => void;
}

export default function AccountFormModal({
  account,
  products,
  onClose,
  onSave,
  showToast
}: AccountFormModalProps) {
  const editingId = account?.id || null;

  const [formAccount, setFormAccount] = useState<Partial<DigitalAccount>>(() => {
    if (account) {
      return {
        email: account.email || '',
        password: account.password || '',
        recoveryEmail: account.recoveryEmail || '',
        recoveryPhone: account.recoveryPhone || '',
        productId: account.productId || '',
        productName: account.productName || '',
        region: account.region || 'EG',
        notes: account.notes || '',
        slots: account.slots && account.slots.length > 0 ? account.slots : [
          { id: 'ps4_prim', slotType: 'PS4_PRIMARY', status: 'AVAILABLE', currentPrice: 0 },
          { id: 'ps5_prim', slotType: 'PS5_PRIMARY', status: 'AVAILABLE', currentPrice: 0 },
          { id: 'secondary', slotType: 'SECONDARY', status: 'AVAILABLE', currentPrice: 0 }
        ]
      };
    }
    return {
      email: '',
      password: '',
      recoveryEmail: '',
      recoveryPhone: '',
      productId: '',
      productName: '',
      region: 'EG',
      notes: '',
      slots: [
        { id: 'ps4_prim', slotType: 'PS4_PRIMARY', status: 'AVAILABLE', currentPrice: 0 },
        { id: 'ps5_prim', slotType: 'PS5_PRIMARY', status: 'AVAILABLE', currentPrice: 0 },
        { id: 'secondary', slotType: 'SECONDARY', status: 'AVAILABLE', currentPrice: 0 }
      ]
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccount.email || !formAccount.productId) {
      showToast('Email and Product targets are required');
      return;
    }

    const linkedProduct = products.find(p => p.id === formAccount.productId);
    const resolvedAccount: Partial<DigitalAccount> = {
      ...formAccount,
      productName: linkedProduct ? linkedProduct.name : formAccount.productName || 'Unassigned Catalog Game',
    };

    onSave(resolvedAccount, editingId);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0B0B0F]/90 backdrop-blur-md animate-fade-in">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-[#151619] border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-[#00F0FF]">
            {editingId ? 'EDIT DIGITAL ACCOUNT' : 'INJECT DIGITAL TERMINAL CREDENTIALS'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-white font-black text-xs"
          >
            CANCEL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Master login Email</label>
              <input 
                type="email" 
                required 
                value={formAccount.email || ''} 
                onChange={e => setFormAccount(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs"
                placeholder="e.g. psnlogin@zerolag.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Login Password</label>
              <input 
                type="text" 
                required 
                value={formAccount.password || ''} 
                onChange={e => setFormAccount(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs"
                placeholder="Password digits"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Recovery Contact Email</label>
              <input 
                type="email" 
                value={formAccount.recoveryEmail || ''} 
                onChange={e => setFormAccount(prev => ({ ...prev, recoveryEmail: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Recovery Phone Number</label>
              <input 
                type="text" 
                value={formAccount.recoveryPhone || ''} 
                onChange={e => setFormAccount(prev => ({ ...prev, recoveryPhone: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Linked Catalog Game</label>
              <select 
                required
                value={formAccount.productId || ''}
                onChange={e => setFormAccount(prev => ({ ...prev, productId: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs uppercase"
              >
                <option value="">SELECT PRODUCT</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.platform} • {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Activation Region</label>
              <select 
                value={formAccount.region || 'EG'}
                onChange={e => setFormAccount(prev => ({ ...prev, region: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs"
              >
                <option value="EG">EG (EGYPT Warehouse)</option>
                <option value="US">US (Americas)</option>
                <option value="EU">EU (Europe region)</option>
              </select>
            </div>
          </div>

          {/* SLOTS STATUS OVERRIDES */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Configure Slots (Primary/Secondary Allocations)</label>
            <div className="grid grid-cols-3 gap-3">
              {formAccount.slots?.map((slot, idx) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2">
                  <span className="text-[8px] font-extrabold text-[#00F0FF] tracking-wider uppercase block">{slot.slotType?.replace('_', ' ')}</span>
                  <select
                    value={slot.status}
                    onChange={e => {
                      const updated = [...(formAccount.slots || [])];
                      updated[idx].status = e.target.value as SlotStatus;
                      setFormAccount(prev => ({ ...prev, slots: updated }));
                    }}
                    className="w-full bg-black/60 text-[9px] font-black border border-white/10 rounded-lg p-1"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="SOLD">SOLD</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                  <input 
                    type="number"
                    placeholder="Override Price"
                    value={slot.currentPrice || ''}
                    onChange={e => {
                      const updated = [...(formAccount.slots || [])];
                      updated[idx].currentPrice = Number(e.target.value) || 0;
                      setFormAccount(prev => ({ ...prev, slots: updated }));
                    }}
                    className="w-full bg-black/60 text-[9px] border border-white/10 rounded-lg p-1 text-white font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500">Security Notes & Recovery Logs</label>
            <textarea 
              value={formAccount.notes || ''}
              onChange={e => setFormAccount(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2 px-3 text-xs"
              placeholder="Insert secret questions, recovery codes..."
              rows={2}
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-400 cursor-pointer"
          >
            SYNC SYSTEM CHANNELS STATE
          </button>
        </form>
      </motion.div>
    </div>
  );
}
