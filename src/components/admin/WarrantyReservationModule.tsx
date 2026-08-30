import React, { useState } from 'react';
import { 
  Award, ShieldAlert, Calendar, Clock, AlertTriangle, Play, CheckCircle, 
  Trash2, Search
} from 'lucide-react';
import { Warranty, Reservation } from '../../types';
import { useAuth } from '../../App';
import { motion } from 'framer-motion';

interface WarrantyReservationModuleProps {
  warranties: Warranty[];
  reservations: Reservation[];
  onTriggerExpiredChecks: () => void;
  onUpdateWarrantyStatus: (id: string, status: 'ACTIVE' | 'EXPIRED' | 'VOID') => void;
  onUpdateReservationStatus: (id: string, status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED') => void;
  onLogActivity: (action: string, entity: string, details: string) => void;
  showToast: (msg: string) => void;
}

export default function WarrantyReservationModule({
  warranties,
  reservations,
  onTriggerExpiredChecks,
  onUpdateWarrantyStatus,
  onUpdateReservationStatus,
  onLogActivity,
  showToast,
}: WarrantyReservationModuleProps) {
  const [subTab, setSubTab] = useState<'warranties' | 'reservations'>('warranties');
  const [termQuery, setTermQuery] = useState('');

  // Auto trigger check on load
  React.useEffect(() => {
    onTriggerExpiredChecks();
  }, []);

  // Filter listings
  const filteredWarranties = warranties.filter(w => 
    (w.customerName || '').toLowerCase().includes(termQuery.toLowerCase()) ||
    (w.productName || '').toLowerCase().includes(termQuery.toLowerCase()) ||
    (w.status || '').toLowerCase().includes(termQuery.toLowerCase())
  );

  const filteredReservations = reservations.filter(r => 
    (r.customerName || '').toLowerCase().includes(termQuery.toLowerCase()) ||
    (r.productName || '').toLowerCase().includes(termQuery.toLowerCase()) ||
    (r.status || '').toLowerCase().includes(termQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div className="flex gap-4 text-xs font-black uppercase tracking-widest text-[#00F0FF]">
          <button 
            onClick={() => setSubTab('warranties')}
            className={`pb-1 border-b-2 transition-all ${subTab === 'warranties' ? 'text-white border-white' : 'text-gray-500 hover:text-white border-transparent'}`}
          >
            SLA WARRANTIES ({warranties.length})
          </button>
          <button 
            onClick={() => setSubTab('reservations')}
            className={`pb-1 border-b-2 transition-all ${subTab === 'reservations' ? 'text-amber-400 border-amber-400' : 'text-gray-500 hover:text-white border-transparent'}`}
          >
            ACTIVE RESERVATIONS HOLDS ({reservations.length})
          </button>
        </div>

        <button 
          onClick={() => { onTriggerExpiredChecks(); showToast('Triggered cron sweep...'); }}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 border border-white/15"
        >
          <Clock size={12} /> Trigger Sweep cron
        </button>
      </div>

      {/* Local search */}
      <div className="p-4 bg-[#151619] rounded-xl border border-white/5 flex gap-4">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder={`Filter ${subTab}...`}
            value={termQuery}
            onChange={e => setTermQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0B0B0F] border border-white/10 rounded-lg text-xs"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
        </div>
      </div>

      {/* Warranties ledger list */}
      {subTab === 'warranties' && (
        <div className="p-4 sm:p-6 bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
          {/* Desktop View Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <th className="py-4 pl-4">Game Account / Slot</th>
                  <th className="py-4">VIP Client</th>
                  <th className="py-4 text-center">Inception Date</th>
                  <th className="py-4 text-center">Expiry Target</th>
                  <th className="py-4 text-center">Protection State</th>
                  <th className="py-4 pr-4 text-right">Administrative Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredWarranties.length > 0 ? (
                  filteredWarranties.map((w) => {
                    const isExpiringSoon = new Date(w.endDate?.seconds * 1000 || w.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={w.id} className="hover:bg-white/[0.01]">
                        <td className="py-4 pl-4">
                          <div className="font-extrabold uppercase text-xs text-gray-200">{w.productName}</div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">{w.slotType.replace('_', ' ')}</div>
                        </td>
                        <td className="py-4 uppercase font-bold text-gray-300">{w.customerName}</td>
                        <td className="py-4 text-center text-gray-500">{new Date(w.startDate?.seconds * 1000 || w.startDate).toLocaleDateString()}</td>
                        <td className="py-4 text-center">
                          <span className={`font-mono text-[11px] ${isExpiringSoon && w.status === 'ACTIVE' ? 'text-pink-400 font-extrabold shadow-[0_0_8px_#FF5D5D]' : ''}`}>
                            {new Date(w.endDate?.seconds * 1000 || w.endDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg ${
                            w.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => onUpdateWarrantyStatus(w.id, 'ACTIVE')}
                              className="px-2 py-1 bg-white/5 text-[8px] font-black uppercase rounded text-green-400 hover:bg-green-500/15"
                            >
                              Active
                            </button>
                            <button 
                              onClick={() => onUpdateWarrantyStatus(w.id, 'EXPIRED')}
                              className="px-2 py-1 bg-white/5 text-[8px] font-black uppercase rounded text-red-400 hover:bg-red-500/15"
                            >
                              Expire
                            </button>
                            <button 
                              onClick={() => onUpdateWarrantyStatus(w.id, 'VOID')}
                              className="px-2 py-1 bg-white/5 text-[8px] font-black uppercase rounded text-gray-400 hover:bg-gray-500/15"
                            >
                              Void
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest">
                      Warranty database table is empty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View Table stacked cards */}
          <div className="md:hidden space-y-4">
            {filteredWarranties.length > 0 ? (
              filteredWarranties.map((w) => {
                const isExpiringSoon = new Date(w.endDate?.seconds * 1000 || w.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                return (
                  <div key={w.id} className="bg-[#1A1C20]/80 rounded-2xl border border-white/5 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold uppercase text-white font-mono">{w.productName}</div>
                      <span className={`inline-block px-2.5 py-0.5 text-[8px] font-mono font-black uppercase rounded-lg ${
                        w.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {w.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Slot / VIP Client</div>
                      <div className="text-gray-300 font-semibold">{w.slotType.replace('_', ' ')} / {w.customerName}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/5">
                      <div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Inception</div>
                        <div className="text-gray-400 font-mono">{new Date(w.startDate?.seconds * 1000 || w.startDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Expiry Date</div>
                        <div className={`font-mono ${isExpiringSoon && w.status === 'ACTIVE' ? 'text-pink-400 font-extrabold' : 'text-gray-400'}`}>
                          {new Date(w.endDate?.seconds * 1000 || w.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/5 flex gap-2 justify-end">
                      <button 
                        onClick={() => onUpdateWarrantyStatus(w.id, 'ACTIVE')}
                        className="px-2 py-1 bg-white/5 text-[9px] font-black uppercase rounded text-green-400 hover:bg-green-500/15"
                      >
                        Active
                      </button>
                      <button 
                        onClick={() => onUpdateWarrantyStatus(w.id, 'EXPIRED')}
                        className="px-2 py-1 bg-white/5 text-[9px] font-black uppercase rounded text-red-400 hover:bg-red-500/15"
                      >
                        Expire
                      </button>
                      <button 
                        onClick={() => onUpdateWarrantyStatus(w.id, 'VOID')}
                        className="px-2 py-1 bg-white/5 text-[9px] font-black uppercase rounded text-gray-400 hover:bg-gray-500/15"
                      >
                        Void
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                No warranties recorded
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reservations Holds List */}
      {subTab === 'reservations' && (
        <div className="p-4 sm:p-6 bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
          {/* Desktop View Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <th className="py-4 pl-4">Game / Slot Detail</th>
                  <th className="py-4">VIP Client Name</th>
                  <th className="py-4 text-center">Reservation Expiry Target</th>
                  <th className="py-4 text-center">Reservation Hold State</th>
                  <th className="py-4 pr-4 text-right">Actions Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((r) => {
                    const expiryTime = new Date(r.reservedUntil?.seconds * 1000 || r.reservedUntil);
                    const isHoldingExpired = expiryTime.getTime() < Date.now();
                    return (
                      <tr key={r.id} className="hover:bg-white/[0.01]">
                        <td className="py-4 pl-4">
                          <div className="font-extrabold uppercase text-xs text-gray-200">{r.productName}</div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">{r.slotType}</div>
                        </td>
                        <td className="py-4 uppercase font-bold text-gray-300">{r.customerName}</td>
                        <td className="py-4 text-center">
                          <span className={`font-mono text-[11px] ${isHoldingExpired && r.status === 'ACTIVE' ? 'text-red-400 font-extrabold underline' : ''}`}>
                            {expiryTime.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg ${
                            r.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            r.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => { onUpdateReservationStatus(r.id, 'COMPLETED'); showToast('Cleared hold'); }}
                              className="px-2 py-1 bg-white/5 text-[8px] font-black uppercase rounded text-green-400 hover:bg-green-500/15"
                            >
                              Complete
                            </button>
                            <button 
                              onClick={() => { onUpdateReservationStatus(r.id, 'CANCELLED'); showToast('Cancelled hold'); }}
                              className="px-2 py-1 bg-white/5 text-[8px] font-black uppercase rounded text-red-400 hover:bg-red-500/15"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest">
                      Reservation database has no active records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View Stacked Cards */}
          <div className="md:hidden space-y-4">
            {filteredReservations.length > 0 ? (
              filteredReservations.map((r) => {
                const expiryTime = new Date(r.reservedUntil?.seconds * 1000 || r.reservedUntil);
                const isHoldingExpired = expiryTime.getTime() < Date.now();
                return (
                  <div key={r.id} className="bg-[#1A1C20]/80 rounded-2xl border border-white/5 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold uppercase text-white font-mono">{r.productName}</div>
                      <span className={`inline-block px-2.5 py-0.5 text-[8px] font-mono font-black uppercase rounded-lg ${
                        r.status === 'ACTIVE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        r.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Slot / VIP Client</div>
                      <div className="text-gray-300 font-semibold">{r.slotType} / {r.customerName}</div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                      <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5 font-sans">Expiry hold</div>
                      <div className={`font-mono ${isHoldingExpired && r.status === 'ACTIVE' ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                        {expiryTime.toLocaleString()}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/5 flex gap-2 justify-end">
                      <button 
                        onClick={() => { onUpdateReservationStatus(r.id, 'COMPLETED'); showToast('Cleared hold'); }}
                        className="px-2.5 py-1.5 bg-white/5 text-[9px] font-black uppercase rounded-lg text-green-400 hover:bg-green-400/15"
                      >
                        Complete
                      </button>
                      <button 
                        onClick={() => { onUpdateReservationStatus(r.id, 'CANCELLED'); showToast('Cancelled hold'); }}
                        className="px-2.5 py-1.5 bg-white/5 text-[9px] font-black uppercase rounded-lg text-red-400 hover:bg-red-400/15"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                No reservations active
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
