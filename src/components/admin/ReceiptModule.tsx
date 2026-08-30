import React, { useState } from 'react';
import { 
  FileText, Search, Printer, MessageSquare, Copy, Check, ChevronDown, 
  ExternalLink, CreditCard, ShieldAlert, BadgeCheck
} from 'lucide-react';
import { Receipt, Order } from '../../types';
import { formatPrice } from '../../lib/utils';
import Logo from '../Logo';
import { motion } from 'framer-motion';

interface ReceiptModuleProps {
  receipts: Receipt[];
  orders: Order[];
  onCreateReceipt: (receipt: Partial<Receipt>) => void;
  showToast: (msg: string) => void;
}

export default function ReceiptModule({
  receipts,
  orders,
  onCreateReceipt,
  showToast,
}: ReceiptModuleProps) {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter receipts
  const filteredReceipts = receipts.filter(r => 
    (r.customerName || '').toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
    (r.receiptCode || '').toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
    (r.productName || '').toLowerCase().includes(receiptSearchQuery.toLowerCase())
  );

  // Auto select first receipt
  React.useEffect(() => {
    if (filteredReceipts.length > 0 && !selectedReceiptId) {
      setSelectedReceiptId(filteredReceipts[0].id);
    }
  }, [filteredReceipts, selectedReceiptId]);

  const activeReceipt = receipts.find(r => r.id === selectedReceiptId);

  // Auto generate receipt from un-billed completed orders helper
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const unbilledOrders = completedOrders.filter(
    o => !receipts.some(r => r.orderId === o.id)
  );

  const handleGenerateReceipt = (ord: Order) => {
    const codeNumber = String(receipts.length + 1).padStart(6, '0');
    const code = `ZLG-2026-${codeNumber}`;

    const newReceipt: Partial<Receipt> = {
      receiptCode: code,
      date: new Date().toISOString(),
      orderId: ord.id,
      customerId: ord.customerId,
      customerName: ord.customerName,
      productName: ord.accountEmail, // use the associated account email as productName
      slotType: ord.slotType,
      price: ord.price,
      warrantyDuration: '1 Year Full Support Warranty',
    };

    onCreateReceipt(newReceipt);
    showToast(`Receipt Generated: ${code}`);
  };

  const handleCopy = () => {
    if (!activeReceipt) return;
    const text = `
-----------------------------
ZEROLAG GAME STORE RECEIPT
-----------------------------
Receipt ID: ${activeReceipt.receiptCode}
Date: ${new Date(activeReceipt.date?.seconds * 1000 || activeReceipt.date).toLocaleString()}
Customer: ${activeReceipt.customerName}
Product/Email: ${activeReceipt.productName}
Slot Channel: ${activeReceipt.slotType.replace('_', ' ')}
Paid Amount: ${formatPrice(activeReceipt.price)}
Warranty State: ${activeReceipt.warrantyDuration || '365 Days Base Protection'}
-----------------------------
Thank you for buying at Zerolag! Keep this info safe.
    `;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Receipt details copied to clipboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!activeReceipt) return;
    const textMsg = encodeURIComponent(
      `*ZEROLAG GAME STORE* \n` +
      `*INVOICE RECEIPT:* \`${activeReceipt.receiptCode}\`\n\n` +
      `• *Customer:* ${activeReceipt.customerName}\n` +
      `• *Game/Account:* ${activeReceipt.productName}\n` +
      `• *Slot Assigned:* ${activeReceipt.slotType.replace('_', ' ')}\n` +
      `• *Amount Settled:* ${formatPrice(activeReceipt.price)} EGP\n` +
      `• *Warranty Terms:* ${activeReceipt.warrantyDuration || '1 Year'}\n\n` +
      `_Thank you for shopping at ZeroLag!_`
    );
    window.open(`https://wa.me/?text=${textMsg}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Receipts listing & unbilled transactions */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Unbilled Orders quick-actions */}
        {unbilledOrders.length > 0 && (
          <div className="p-6 bg-[#6C5CE7]/10 rounded-[1.5rem] border border-[#6C5CE7]/35 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-[#6C5CE7] tracking-[0.2em] flex items-center gap-2">
              <ShieldAlert size={14} /> UNBILLED SETTLEMENTS ({unbilledOrders.length})
            </h4>

            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
              {unbilledOrders.map(ord => (
                <div key={ord.id} className="flex justify-between items-center p-3 bg-[#0B0B0F] rounded-xl border border-white/5">
                  <div className="overflow-hidden">
                    <p className="font-extrabold text-[10px] uppercase truncate text-gray-200">{ord.customerName}</p>
                    <p className="text-[8px] font-mono text-gray-500">{ord.orderNumber} • {formatPrice(ord.price)}</p>
                  </div>
                  <button 
                    onClick={() => handleGenerateReceipt(ord)}
                    className="px-2.5 py-1.5 bg-[#00F0FF] text-black font-black uppercase text-[8px] tracking-widest rounded-lg hover:scale-105 transition-transform shrink-0"
                  >
                    + Receipt
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search existing receipts */}
        <div className="p-6 bg-[#151619] rounded-[2rem] border border-white/5 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF]">INVOICE REGISTRY</h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search receipt code, name..."
                value={receiptSearchQuery}
                onChange={e => setReceiptSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs focus:outline-none focus:border-[#00F0FF]"
              />
              <Search className="absolute left-3 top-3 text-gray-500" size={14} />
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredReceipts.length > 0 ? (
              filteredReceipts.map(rec => (
                <div 
                  key={rec.id}
                  onClick={() => setSelectedReceiptId(rec.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                    selectedReceiptId === rec.id 
                      ? 'bg-[#00F0FF]/10 border-[#00F0FF]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <p className="font-mono text-xs font-black text-[#00F0FF]">{rec.receiptCode}</p>
                    <h5 className="text-[10px] font-extrabold uppercase truncate text-gray-300">{rec.customerName}</h5>
                    <p className="text-[9px] font-mono text-gray-500">{rec.slotType}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-white">{formatPrice(rec.price)}</div>
                    <div className="text-[8px] font-mono text-gray-400">{new Date(rec.date?.seconds * 1000 || rec.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 uppercase font-black text-center py-12">No invoices found</p>
            )}
          </div>
        </div>
      </div>

      {/* Therm-printer Mockup Details Panel */}
      <div className="lg:col-span-2">
        {activeReceipt ? (
          <div className="space-y-6 print:m-0 print:border-none">
            {/* Command Actions layout */}
            <div className="flex flex-wrap gap-2 justify-end print:hidden">
              <button 
                onClick={handlePrint}
                className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button 
                onClick={handleCopy}
                className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />} Copy Text
              </button>
              <button 
                onClick={handleWhatsAppShare}
                className="px-4 py-2.5 bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2"
              >
                <MessageSquare size={14} /> WhatsApp Share
              </button>
            </div>

            {/* Print Container mock */}
            <div 
              id="thermal-invoice"
              className="p-8 bg-white text-black font-mono text-xs border border-gray-200 rounded-[1.5rem] shadow-xl max-w-lg mx-auto space-y-6 print:max-w-none print:shadow-none print:bg-white"
            >
              {/* Header Title */}
              <div className="text-center space-y-1">
                <Logo className="justify-center mb-2" invertColor={true} />
                <p className="text-[9px] text-gray-600 uppercase">Interactive Digital Account Distributors</p>
                <p className="text-[9px] text-gray-600">Cairo, Egypt • Support: +201114763125</p>
                <p className="text-[9px] text-gray-500 pt-1">***************************************</p>
              </div>

              {/* Meta details */}
              <div className="space-y-1.5 flex flex-col pt-2 select-all">
                <div className="flex justify-between">
                  <span>Invc Reference:</span>
                  <span className="font-bold">{activeReceipt.receiptCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing Date:</span>
                  <span>{new Date(activeReceipt.date?.seconds * 1000 || activeReceipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client Name:</span>
                  <span className="font-bold uppercase">{activeReceipt.customerName}</span>
                </div>
                <p className="text-[9px] text-gray-500 pt-1">---------------------------------------</p>
              </div>

              {/* Items Allocation */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between font-bold">
                  <span>Line Item Account</span>
                  <span>Final EGP</span>
                </div>

                <div className="flex justify-between text-[11px] items-start">
                  <div className="max-w-[180px]">
                    <p className="font-bold break-all">{activeReceipt.productName}</p>
                    <p className="text-[9px] text-gray-500 uppercase">{activeReceipt.slotType.replace('_', ' ')} Alloc</p>
                  </div>
                  <span className="font-extrabold whitespace-nowrap">{formatPrice(activeReceipt.price)}</span>
                </div>
                <p className="text-[9px] text-gray-500 pt-1 border-t border-dashed border-gray-300">---------------------------------------</p>
              </div>

              {/* Subtotals & Taxes */}
              <div className="space-y-1 flex flex-col font-bold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(activeReceipt.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Tax (VAT 0%):</span>
                  <span>EGP 0.00</span>
                </div>
                <div className="flex justify-between text-sm uppercase pt-1 border-t border-gray-400">
                  <span>Grand Net Amount:</span>
                  <span>{formatPrice(activeReceipt.price)}</span>
                </div>
              </div>

              {/* Warranty section */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <BadgeCheck className="text-[#6C5CE7] shrink-0" size={24} />
                <div className="leading-normal text-[9px] space-y-0.5">
                  <div className="font-black text-gray-900 uppercase">WARRANTY PROTECTED STATUS</div>
                  <p className="text-gray-600 font-bold">{activeReceipt.warrantyDuration || '365 Days Replacement SLA'}</p>
                </div>
              </div>

              {/* Footer messages */}
              <div className="text-center pt-2 space-y-1">
                <p className="text-[9px] text-gray-500">***************************************</p>
                <p className="text-[10px] font-bold uppercase tracking-tight">KEEP LOGIN SECURE • DO NOT SHARE CREDENTIALS</p>
                <p className="text-[9px] text-gray-600">Generated automatically by ZeroLag ERP Engine.</p>
              </div>

            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 border border-dashed border-white/5 rounded-2xl">
            Select or generate an invoice code to render details.
          </div>
        )}
      </div>
    </div>
  );
}
