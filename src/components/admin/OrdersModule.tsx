import React, { useState } from 'react';
import { 
  ShoppingCart, Search, ShieldCheck, CreditCard, ChevronRight, CheckCircle2,
  Trash2, TrendingUp, AlertCircle, ShoppingBag, Plus, RefreshCcw, ExternalLink,
  Image as ImageIcon, HelpCircle, XCircle, Truck, FileText
} from 'lucide-react';
import { Customer, DigitalAccount, AccountSlot, Order, OrderStatus, SlotType } from '../../types';
import { formatPrice } from '../../lib/utils';
import { motion } from 'framer-motion';

interface OrdersModuleProps {
  orders: Order[];
  customers: Customer[];
  accounts: DigitalAccount[];
  onAddOrder: (order: Partial<Order>) => void;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  onDeleteOrder?: (id: string) => void;
  onEditOrder?: (id: string, fields: Partial<Order>) => void;
  onLogActivity: (action: string, entity: string, details: string) => void;
  showToast: (msg: string) => void;
  userRole: string; // OWNER, MANAGER, EMPLOYEE
}

export default function OrdersModule({
  orders,
  customers,
  accounts,
  onAddOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onEditOrder,
  onLogActivity,
  showToast,
  userRole
}: OrdersModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'list' | 'analytics' | 'web-orders'>('list');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [webSearchQuery, setWebSearchQuery] = useState('');

  // Edit Order States
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editStatus, setEditStatus] = useState<string>('Pending');
  const [modalTab, setModalTab] = useState<'info' | 'receipt' | 'edit'>('info');

  // Form Flow States for manual creation
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Vodafone Cash');

  // Customer & Account selections computed
  const selectedCust = customers.find(c => c.id === selectedCustomerId);
  const selectedAcc = accounts.find(a => a.id === selectedAccountId);
  
  // Slots associated to selection
  const availableSlots = selectedAcc 
    ? selectedAcc.slots.filter(s => s.status === 'AVAILABLE')
    : [];
  const activeSlot = selectedAcc?.slots.find(s => s.id === selectedSlotId);

  // Auto fill pricing based on active slot default
  React.useEffect(() => {
    if (activeSlot) {
      setCustomPrice(activeSlot.currentPrice);
    }
  }, [selectedSlotId, activeSlot]);

  // Analytics computed over ERP completed and Web Paid/Delivered orders
  const totalCompletedOrders = orders.filter(o => o.status === 'Completed' || (o as any).status === 'Paid' || (o as any).status === 'Delivered');
  const totalRevenue = totalCompletedOrders.reduce((acc, current) => acc + (current.price || (current as any).finalPrice || 0), 0);

  // Split ERP historical manual sales orders from the online Web Checkout orders
  const erpOrders = orders.filter(o => !(o as any).isWebOrder && !(o as any).orderId);
  const webCheckoutOrders = orders.filter(o => (o as any).isWebOrder || (o as any).orderId);

  // Filter ERP orders listing
  const filteredErpOrders = erpOrders.filter(o => 
    (o.customerName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    (o.orderNumber || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    (o.accountEmail || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    (o.status || '').toLowerCase().includes(orderSearchQuery.toLowerCase())
  );

  // Filter Web Checkout orders listing
  const filteredWebOrders = webCheckoutOrders.filter(o => {
    const oAny = o as any;
    const label = `${oAny.orderId || ''} ${oAny.customerName || ''} ${oAny.customerEmail || ''} ${oAny.productName || ''} ${oAny.paymentMethod || ''} ${oAny.status || ''}`;
    return label.toLowerCase().includes(webSearchQuery.toLowerCase());
  });

  // Create ERP order transaction manually
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedAccountId || !selectedSlotId) {
      showToast('Please select Customer, Account and Slot to create order');
      return;
    }

    if (customPrice <= 0) {
      showToast('Set a valid price for the slot');
      return;
    }

    const orderPayload: Partial<Order> = {
      orderNumber: `ZLG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      customerId: selectedCustomerId,
      customerName: selectedCust?.fullName || 'Walk-In Customer',
      customerPhone: selectedCust?.phoneNumber || '',
      accountId: selectedAccountId,
      accountEmail: selectedAcc?.email || '',
      slotId: selectedSlotId,
      slotType: activeSlot?.slotType || 'SECONDARY',
      price: customPrice,
      status: 'Completed', // direct completed for internal admin flows
      paymentMethod,
    };

    onAddOrder(orderPayload);
    showToast('ERP Sales Order settled and active');
    onLogActivity('Created', 'Sales Order', `Settled order ${orderPayload.orderNumber} for ${orderPayload.customerName} on ${orderPayload.accountEmail}`);
    
    // Clear inputs and back to list
    setSelectedCustomerId('');
    setSelectedAccountId('');
    setSelectedSlotId('');
    setCustomPrice(0);
    setActiveSubTab('list');
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Toggle Navigation */}
      <div className="flex flex-wrap border-b border-white/5 gap-6 text-xs font-black uppercase tracking-widest pb-3">
        {[
          { id: 'list', val: 'SALES HISTORY LEDGER (ERP)', color: 'text-gray-300' },
          { id: 'web-orders', val: 'ONLINE WEB CHECKOUTS', color: 'text-[#25D366]' },
          { id: 'create', val: '+ CREATE NEW TRANSACTION', color: 'text-[#00F0FF]' },
          { id: 'analytics', val: 'PROFIT & REVENUE STATS', color: 'text-[#6C5CE7]' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`transition-all relative pb-3 ${
              activeSubTab === tab.id 
                ? tab.id === 'create' ? 'text-[#00F0FF]' : tab.id === 'analytics' ? 'text-[#6C5CE7]' : tab.id === 'web-orders' ? 'text-[#25D366]' : 'text-white' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            {tab.val}
            {tab.id === 'web-orders' && webCheckoutOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-[#25D366] text-black rounded text-[9px] font-black">
                {webCheckoutOrders.length}
              </span>
            )}
            {activeSubTab === tab.id && (
              <span className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                tab.id === 'create' ? 'bg-[#00F0FF]' : tab.id === 'analytics' ? 'bg-[#6C5CE7]' : tab.id === 'web-orders' ? 'bg-[#25D366]' : 'bg-white'
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}
      
      {/* Create Order Flow */}
      {activeSubTab === 'create' && (
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 p-6 bg-[#151619] border border-white/5 rounded-3xl">
            <h3 className="text-xs font-black uppercase text-[#00F0FF] tracking-widest flex items-center gap-2">
              <ShoppingCart size={14} /> ORDER PLACEMENT WIZARD
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Selector */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Target CRM Customer</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none text-white"
                >
                  <option value="">-- Choose VIP Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.phoneNumber})</option>
                  ))}
                </select>
              </div>

              {/* Digital Account Select */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Source Digital Account</label>
                <select
                  required
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none text-white"
                >
                  <option value="">-- Choose Account --</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.email} ({a.productName})</option>
                  ))}
                </select>
              </div>

              {/* Account Slots Selector */}
              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Available Slot Type</label>
                <select
                  required
                  disabled={!selectedAccountId}
                  value={selectedSlotId}
                  onChange={e => setSelectedSlotId(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none disabled:opacity-40 text-white"
                >
                  <option value="">-- Select Active Slot Channel --</option>
                  {availableSlots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.slotType.replace('_', ' ')} (Price EGP: {s.currentPrice})
                    </option>
                  ))}
                </select>
                {selectedAccountId && availableSlots.length === 0 && (
                  <p className="text-[9px] text-[#FF5D5D] font-bold">⚠️ Out of stock! No free slots found on this account.</p>
                )}
              </div>

              {/* Deal pricing */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400">Final Transaction Price (EGP)</label>
                <input 
                  type="number" 
                  required
                  disabled={!selectedSlotId}
                  value={customPrice}
                  onChange={e => setCustomPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none disabled:opacity-40 text-[#00F0FF] font-black"
                  placeholder="Price in Egyptian pounds"
                />
              </div>

              {/* Payment terminal selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400">Payment Gateway / Route</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none text-white"
                >
                  <option value="Vodafone Cash">Vodafone Cash</option>
                  <option value="InstaPay">InstaPay</option>
                  <option value="CIB Bank Transfer">CIB Bank Transfer</option>
                  <option value="Zerolag Cash Deposit">Zerolag Cash Deposit</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-[1.01] transition-transform"
            >
              Authorize Order Placement
            </button>
          </div>

          {/* Quick billing metadata panel */}
          <div className="p-6 bg-[#151619] border border-white/5 rounded-3xl h-fit space-y-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">TRANSACTION MATRIX PREVIEW</h4>
            
            <div className="space-y-4 text-xs divide-y divide-white/5">
              <div className="py-2 flex justify-between items-center">
                <span className="text-gray-500">Client:</span>
                <span className="font-bold text-white uppercase">{selectedCust ? selectedCust.fullName : '-'}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-gray-500">Credent inbox:</span>
                <span className="font-mono text-gray-300 truncate max-w-[150px]">{selectedAcc ? selectedAcc.email : '-'}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-gray-500">Platform Category:</span>
                <span className="text-[#6C5CE7] uppercase font-bold">{selectedAcc ? selectedAcc.productName : '-'}</span>
              </div>
              <div className="py-3 flex justify-between items-center text-sm font-black text-green-400">
                <span>Total Due:</span>
                <span>{customPrice ? formatPrice(customPrice) : '0.00'}</span>
              </div>
            </div>

            <div className="p-4 bg-[#0B0B0F] rounded-xl border border-white/5 text-[10px] text-gray-500 leading-normal">
              ✅ Once approved, the selected account slot will be changed status to <strong className="text-red-400">SOLD</strong> and an automatic unique invoice/warranty code will generate.
            </div>
          </div>
        </form>
      )}

      {/* History Ledger List (ERP Manual) */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Search ERP manual transactions..."
                value={orderSearchQuery}
                onChange={e => setOrderSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            </div>

            <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
              <RefreshCcw size={14} className="animate-spin text-[#00F0FF]" /> Live Syncing database manual orders log
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
            
            {/* Desktop View: Wide spacing, high readability table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    <th className="py-4 pl-4 w-[12%]">Order Code</th>
                    <th className="py-4 w-[12%]">Date</th>
                    <th className="py-4 w-[22%]">CRM Customer</th>
                    <th className="py-4 w-[22%]">Target Credentials Slot</th>
                    <th className="py-4 w-[12%]">Amount EGP</th>
                    <th className="py-4 w-[15%]">Profit Status</th>
                    <th className="py-4 text-right pr-4 w-[15%]">Ledger Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredErpOrders.length > 0 ? (
                    filteredErpOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/[0.02]/70 transition-all">
                        <td className="py-5 pl-4 font-mono font-black text-white">
                          <span className="bg-white/5 border border-white/10 px-2 py-1 select-all rounded font-mono">
                            {ord.orderNumber}
                          </span>
                        </td>
                        <td className="py-5 text-gray-400 font-mono text-[11px]">
                          {new Date(ord.createdAt?.seconds * 1000 || ord.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-5">
                          <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-wide">{ord.customerName}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{ord.customerPhone}</div>
                        </td>
                        <td className="py-5">
                          <div className="font-mono text-gray-200 text-xs truncate max-w-[200px]" title={ord.accountEmail}>
                            {ord.accountEmail}
                          </div>
                          <div className="text-[10px] text-[#00F0FF] uppercase font-black tracking-wide mt-0.5">
                            {ord.slotType.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="py-5">
                          <span className="inline-block px-2.5 py-1 bg-black/40 border border-white/5 rounded-lg font-mono font-black text-white text-xs">
                            {formatPrice(ord.price)}
                          </span>
                        </td>
                        <td className="py-5">
                          <select 
                            value={ord.status}
                            onChange={e => onUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                            className={`py-1 px-2.5 rounded text-[9px] font-black uppercase tracking-wider bg-transparent outline-none border border-white/10 ${
                              ord.status === 'Completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                              ord.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}
                          >
                            <option className="bg-[#151619]" value="Pending">Pending</option>
                            <option className="bg-[#151619]" value="Completed">Completed</option>
                            <option className="bg-[#151619]" value="Cancelled">Cancelled</option>
                            <option className="bg-[#151619]" value="Refunded">Refunded</option>
                          </select>
                        </td>
                        <td className="py-5 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[9px] font-mono text-purple-400 uppercase border border-purple-500/20 px-2 py-1 rounded bg-purple-500/5 whitespace-nowrap">
                              SLOT: {ord.slotType}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrder(ord);
                                setEditCustomerName(ord.customerName || '');
                                setEditPrice(ord.price || 0);
                                setEditPaymentMethod(ord.paymentMethod || '');
                                setEditStatus(ord.status || 'Pending');
                              }}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Edit
                            </button>
                            {userRole !== 'EMPLOYEE' && onDeleteOrder && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you absolute sure you want to permanently delete this ERP sales order?')) {
                                    onDeleteOrder(ord.id);
                                  }
                                }}
                                className="p-2 bg-red-400/10 hover:bg-red-500 text-red-500 hover:text-black border border-red-500/20 hover:border-transparent rounded-lg transition-all"
                                title="Delete Order"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest">
                        No manual in-store orders registered
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Dynamic stacked cards optimized for finger touch and reading ergonomics */}
            <div className="md:hidden space-y-4">
              {filteredErpOrders.length > 0 ? (
                filteredErpOrders.map((ord) => (
                  <div key={ord.id} className="bg-[#1A1C20]/85 rounded-2xl border border-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-white text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                        {ord.orderNumber}
                      </span>
                      <span className="text-gray-500 text-[10px] font-mono">
                        {new Date(ord.createdAt?.seconds * 1000 || ord.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">CRM Client / Creds</span>
                      <div className="font-extrabold text-white text-sm uppercase">{ord.customerName}</div>
                      <div className="text-xs text-gray-400 font-mono truncate">{ord.accountEmail}</div>
                      <div className="text-[10px] text-[#00F0FF] uppercase font-black mt-1">
                        Platform Allocation: {ord.slotType.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 items-center">
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-0.5">Amount</span>
                        <span className="font-mono font-black text-white text-xs">
                          {formatPrice(ord.price)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider mb-1">State status</span>
                        <select 
                          value={ord.status}
                          onChange={e => onUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[#0B0B0F]/90 outline-none border cursor-pointer ${
                            ord.status === 'Completed' ? 'text-green-400 border-green-500/30 bg-green-500/5' : 
                            ord.status === 'Cancelled' ? 'text-red-400 border-red-500/30 bg-red-500/5' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5'
                          }`}
                        >
                          <option className="bg-[#151619]" value="Pending">Pending</option>
                          <option className="bg-[#151619]" value="Completed">Completed</option>
                          <option className="bg-[#151619]" value="Cancelled">Cancelled</option>
                          <option className="bg-[#151619]" value="Refunded">Refunded</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-3 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrder(ord);
                          setEditCustomerName(ord.customerName || '');
                          setEditPrice(ord.price || 0);
                          setEditPaymentMethod(ord.paymentMethod || '');
                          setEditStatus(ord.status || 'Pending');
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                      >
                        Edit Order
                      </button>
                      {userRole !== 'EMPLOYEE' && onDeleteOrder && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you absolute sure you want to permanently delete this ERP sales order?')) {
                              onDeleteOrder(ord.id);
                            }
                          }}
                          className="p-1.5 bg-red-400/10 text-red-500 rounded-lg border border-red-500/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs uppercase tracking-widest bg-[#1A1C20]/40 rounded-2xl border border-white/5">
                  No manual in-store orders registered
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ONLINE WEB CHECKOUTS (New requested page) */}
      {activeSubTab === 'web-orders' && (
        <div className="space-y-4">
          <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="Search web checkouts (Name, ID, product...)"
                value={webSearchQuery}
                onChange={e => setWebSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs focus:outline-none text-white"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            </div>

            <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
              <RefreshCcw size={14} className="animate-spin text-[#25D366]" /> Live sync online web payments
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
            
            {/* Desktop View: Cozy and high visual scanning for web checkouts table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    <th className="py-4 pl-4 w-[12%]">Order ID</th>
                    <th className="py-4 w-[22%]">Date / Client Details</th>
                    <th className="py-4 w-[24%]">Game & Version License</th>
                    <th className="py-4 w-[14%]">Amount Due & Gateway</th>
                    <th className="py-4 w-[14%]">Upload Screenshot Proof</th>
                    <th className="py-4 w-[14%]">State Status</th>
                    <th className="py-4 text-right pr-4 w-[15%]">Admin Verification Handlers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredWebOrders.length > 0 ? (
                    filteredWebOrders.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-white/[0.02]/70 transition-all">
                        
                        {/* Order ID */}
                        <td className="py-5 pl-4">
                          <span className="font-mono font-black text-white px-2 py-1 bg-white/5 border border-white/10 rounded select-all font-mono">
                            {ord.orderId || ord.orderNumber || 'WEB-ORDER'}
                          </span>
                        </td>

                        {/* Date and Client */}
                        <td className="py-5">
                          <div className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-wide">{ord.customerName}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{ord.customerEmail}</div>
                          {ord.customerPhone && (
                            <div className="text-[10px] text-[#00F0FF] font-mono mt-0.5">📞 {ord.customerPhone}</div>
                          )}
                          <div className="text-[10px] text-gray-500 mt-1 font-mono font-semibold">
                            {ord.createdAt?.seconds 
                              ? new Date(ord.createdAt.seconds * 1000).toLocaleString() 
                              : ord.createdAt 
                                ? new Date(ord.createdAt).toLocaleString() 
                                : 'Just now'}
                          </div>
                        </td>

                        {/* Game and Version */}
                        <td className="py-5">
                          <div className="font-bold text-white text-xs sm:text-sm break-words leading-tight uppercase" title={ord.productName}>
                            {ord.productName || 'Direct Package License'}
                          </div>
                          <div className="text-[10px] text-[#00F0FF] uppercase font-black tracking-wide mt-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></span>
                            Version: {ord.selectedVersion || 'Secondary'} &nbsp;
                            {ord.quantity && <span className="text-gray-500 font-mono">({ord.quantity}x)</span>}
                          </div>
                        </td>

                        {/* Amount and Method */}
                        <td className="py-5 font-mono">
                          <div className="inline-block px-2.5 py-1 bg-black/40 border border-white/5 rounded-lg text-xs font-black text-white">
                            {formatPrice(ord.finalPrice || ord.price || ord.total || 0)}
                          </div>
                          <div className="text-[10px] text-[#25D366] font-bold uppercase tracking-widest mt-1.5">
                            {ord.paymentMethod || 'InstaPay'}
                          </div>
                        </td>

                        {/* Screenshot Proof */}
                        <td className="py-5">
                          {ord.paymentProofUrl ? (
                            <div className="flex items-center gap-2">
                              {/* Open Payment Screenshot */}
                              <a 
                                href={ord.paymentProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 p-1.5 px-3 bg-[#00F0FF]/10 hover:bg-[#00F0FF] border border-[#00F0FF]/20 hover:border-transparent rounded-xl text-[#00F0FF] hover:text-black font-black transition-all text-[10px] uppercase tracking-wide"
                              >
                                <img 
                                  src={ord.paymentProofUrl} 
                                  alt="Screenshot Proof" 
                                  className="w-5 h-5 object-cover rounded border border-[#00F0FF]/30 group-hover:border-transparent"
                                />
                                <span className="flex items-center gap-1">
                                  View Proof <ExternalLink size={11} />
                                </span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-[9px] font-mono font-bold text-yellow-500 border border-yellow-500/20 px-2.5 py-1.5 rounded-lg bg-yellow-500/5 flex items-center gap-1 w-fit">
                              <HelpCircle size={11} /> WhatsApp Proof
                            </span>
                          )}
                        </td>

                        {/* State Status Badge */}
                        <td className="py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            ord.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                            ord.status === 'Delivered' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' :
                            ord.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/25' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ord.status === 'Paid' ? 'bg-emerald-400' :
                              ord.status === 'Delivered' ? 'bg-cyan-400' :
                              ord.status === 'Cancelled' ? 'bg-red-500' :
                              'bg-yellow-400 animate-pulse'
                            }`} />
                            {ord.status || 'Pending Payment Verification'}
                          </span>
                        </td>

                        {/* Handlers (Mark Paid, Mark Delivered, Cancel Order) */}
                        <td className="py-5 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Mark Paid */}
                            {ord.status !== 'Paid' && ord.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateOrderStatus(ord.id, 'Paid');
                                  showToast('Order state status set to: PAID');
                                }}
                                className="px-3 py-1.5 bg-emerald-500 text-black hover:bg-emerald-600 rounded-lg font-black text-[10px] uppercase tracking-wider transition-colors"
                                title="Approve Payment"
                              >
                                Mark Paid
                              </button>
                            )}

                            {/* Mark Delivered */}
                            {ord.status !== 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateOrderStatus(ord.id, 'Delivered');
                                  showToast('Order state status set to: DELIVERED');
                                }}
                                className="px-3 py-1.5 bg-cyan-500 text-black hover:bg-cyan-600 rounded-lg font-black text-[10px] uppercase tracking-wider transition-colors"
                                title="Ship/Deliver Account Credentials"
                              >
                                Mark Delivered
                              </button>
                            )}

                            {/* Cancel Order */}
                            {ord.status !== 'Cancelled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you absolute sure you want to cancel this online web order?')) {
                                    onUpdateOrderStatus(ord.id, 'Cancelled');
                                    showToast('Order status set to: CANCELLED');
                                  }
                                }}
                                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-transparent hover:border-red-500/25 rounded-lg transition-all"
                                title="Reject / Cancel Order"
                              >
                                <XCircle size={15} />
                              </button>
                            )}

                            {/* Edit Order */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrder(ord);
                                setEditCustomerName(ord.customerName || '');
                                setEditPrice(ord.finalPrice || ord.price || ord.total || 0);
                                setEditPaymentMethod(ord.paymentMethod || '');
                                setEditStatus(ord.status || 'Pending Payment Verification');
                                setModalTab('info');
                              }}
                              className="px-3 py-1.5 bg-[#00F0FF]/15 border border-[#00F0FF]/25 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black rounded-lg font-black text-[10px] uppercase tracking-wider transition-all"
                            >
                              Review & Receipt
                            </button>

                            {/* Delete Order */}
                            {userRole !== 'EMPLOYEE' && onDeleteOrder && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Are you absolute sure you want to permanently delete this online order?')) {
                                    onDeleteOrder(ord.id);
                                  }
                                }}
                                className="p-2 bg-red-400/10 hover:bg-red-500 text-red-400 hover:text-black border border-red-500/20 hover:border-transparent rounded-lg transition-all"
                                title="Delete Order"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                        No online web checkout orders located in active snapshot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High quality stacked bento blocks for fingers and reading zoom */}
            <div className="md:hidden space-y-4">
              {filteredWebOrders.length > 0 ? (
                filteredWebOrders.map((ord: any) => (
                  <div key={ord.id} className="bg-[#1A1C20]/85 rounded-2xl border border-white/5 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-white text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded select-all">
                        {ord.orderId || ord.orderNumber || 'WEB-ORDER'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        ord.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        ord.status === 'Delivered' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                        ord.status === 'Cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {ord.status || 'Pending Verification'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">Client / Subscribed License</span>
                      <div className="font-extrabold text-white text-sm uppercase">{ord.customerName}</div>
                      <div className="text-xs text-gray-400 font-mono">{ord.customerEmail}</div>
                      {ord.customerPhone && (
                        <div className="text-xs text-[#00F0FF] font-mono">📞 {ord.customerPhone}</div>
                      )}
                      <div className="text-[10px] text-gray-500 mt-1 font-mono">
                        {ord.createdAt?.seconds 
                          ? new Date(ord.createdAt.seconds * 1000).toLocaleString() 
                          : ord.createdAt 
                            ? new Date(ord.createdAt).toLocaleString() 
                            : 'Just now'}
                      </div>
                    </div>

                    <div className="space-y-1 bg-black/25 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">Acquired Title</span>
                      <div className="text-xs font-bold text-[#00F0FF] uppercase">{ord.productName || 'Direct Package License'}</div>
                      <div className="text-[9px] text-gray-400 font-semibold mt-0.5">
                        Selected: <span className="text-pink-400 font-mono font-black">{ord.selectedVersion || 'Secondary'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center pt-2">
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">Total Due</span>
                        <span className="font-mono font-black text-white text-xs block">
                          {formatPrice(ord.finalPrice || ord.price || ord.total || 0)}
                        </span>
                        <span className="text-[9px] text-[#25D366] font-bold uppercase block -mt-0.5">{ord.paymentMethod || 'InstaPay'}</span>
                      </div>
                      <div className="text-right flex justify-end">
                        {ord.paymentProofUrl ? (
                          <a 
                            href={ord.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-1.5 px-3 bg-[#00F0FF]/10 text-[#00F0FF] rounded-lg border border-[#00F0FF]/20 text-[10px] font-black uppercase tracking-wide"
                          >
                            <img 
                              src={ord.paymentProofUrl} 
                              alt="Screenshot Proof" 
                              className="w-4 h-4 object-cover rounded border border-[#00F0FF]/30"
                            />
                            Proof <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-[8px] font-mono font-bold text-yellow-500 border border-yellow-500/25 px-2 py-1 rounded-lg bg-yellow-500/5">
                            WA/Manual Proof
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-3 border-t border-white/5">
                      {ord.status !== 'Paid' && ord.status !== 'Delivered' && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(ord.id, 'Paid');
                            showToast('Order status set to: PAID');
                          }}
                          className="px-3 py-1.5 bg-emerald-500 text-black hover:bg-emerald-600 rounded-lg font-black text-[10px] uppercase tracking-wider"
                        >
                          Mark Paid
                        </button>
                      )}

                      {ord.status !== 'Delivered' && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(ord.id, 'Delivered');
                            showToast('Order status set to: DELIVERED');
                          }}
                          className="px-3 py-1.5 bg-cyan-500 text-black hover:bg-cyan-600 rounded-lg font-black text-[10px] uppercase tracking-wider"
                        >
                          Mark Delivered
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrder(ord);
                          setEditCustomerName(ord.customerName || '');
                          setEditPrice(ord.finalPrice || ord.price || ord.total || 0);
                          setEditPaymentMethod(ord.paymentMethod || '');
                          setEditStatus(ord.status || 'Pending Payment Verification');
                          setModalTab('info');
                        }}
                        className="px-3 py-1.5 bg-[#00F0FF]/15 border border-[#00F0FF]/25 text-[#00F0FF] rounded-lg font-black text-[10px] uppercase tracking-wider block"
                      >
                        Review & Receipt
                      </button>

                      {userRole !== 'EMPLOYEE' && onDeleteOrder && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you absolute sure you want to permanently delete this online order?')) {
                              onDeleteOrder(ord.id);
                            }
                          }}
                          className="p-1.5 bg-red-400/10 text-red-400 rounded-lg border border-red-500/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs uppercase tracking-widest bg-[#1A1C20]/40 rounded-2xl border border-white/5">
                  No online web checkout orders located in snapshot
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Analytics Module */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
            <ShoppingBag size={24} className="text-[#00F0FF]" />
            <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest">GROSS SALES REVENUE</div>
            <div className="text-3xl font-black text-[#00F0FF]">{formatPrice(totalRevenue)}</div>
            <p className="text-[8px] text-gray-500 font-bold uppercase">All completed & paid invoices</p>
          </div>

          <div className="p-6 bg-[#151619] rounded-2xl border border-[#6C5CE7]/25 flex flex-col items-center justify-center text-center space-y-2">
            <TrendingUp size={24} className="text-[#6C5CE7]" />
            <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest">TOTAL SETTLED ORDERS</div>
            <div className="text-3xl font-black text-[#6C5CE7]">{totalCompletedOrders.length}</div>
            <p className="text-[8px] text-gray-500 font-bold uppercase">Completed manual + approved online orders</p>
          </div>

          <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
            <AlertCircle size={24} className="text-green-400" />
            <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest">AVERAGE ORDER TICKET</div>
            <div className="text-3xl font-black text-green-400">
              {totalCompletedOrders.length > 0 ? formatPrice(totalRevenue / totalCompletedOrders.length) : 'EGP 0.00'}
            </div>
            <p className="text-[8px] text-gray-500 font-bold uppercase">Per active processed invoice item</p>
          </div>
        </div>
      )}

      {/* Edit Order & Receipt Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 w-full max-w-2xl space-y-6 relative text-left shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-start gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] font-mono font-black text-[#00F0FF] uppercase tracking-widest px-2 py-0.5 bg-[#00F0FF]/10 rounded border border-[#00F0FF]/25">
                  Order ID: {editingOrder.orderId || editingOrder.orderNumber || 'WEB-ORDER'}
                </span>
                <h3 className="text-sm font-black uppercase text-white mt-2">
                  Order Review & Receipt Panel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-4 border-b border-white/5 pb-2 text-xs font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`pb-2 relative transition-all ${modalTab === 'info' ? 'text-[#00F0FF]' : 'text-gray-500 hover:text-white'}`}
              >
                1. Client & Delivery Info
                {modalTab === 'info' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00F0FF]" />}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('receipt')}
                className={`pb-2 relative transition-all ${modalTab === 'receipt' ? 'text-pink-400' : 'text-gray-500 hover:text-white'}`}
              >
                2. Automated Receipt
                {modalTab === 'receipt' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-pink-400" />}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('edit')}
                className={`pb-2 relative transition-all ${modalTab === 'edit' ? 'text-purple-400' : 'text-gray-500 hover:text-white'}`}
              >
                3. Update Metadata
                {modalTab === 'edit' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-400" />}
              </button>
            </div>

            {/* Modal Contents */}
            <div className="space-y-4 py-2">
              
              {/* Tab 1: Client and delivery info */}
              {modalTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#0B0B0F]/60 p-4 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-[8px] text-gray-500 block uppercase font-black font-sans">Customer Name</span>
                      <div className="text-white text-sm font-black uppercase font-sans">{editingOrder.customerName}</div>
                    </div>
                    <div className="bg-[#0B0B0F]/60 p-4 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-[8px] text-gray-500 block uppercase font-black font-sans">Customer Email</span>
                      <div className="text-white text-xs font-mono">{editingOrder.customerEmail || editingOrder.userEmail || 'N/A'}</div>
                    </div>
                    <div className="bg-[#0B0B0F]/60 p-4 rounded-2xl border border-white/5 space-y-1 col-span-full">
                      <span className="text-[8px] text-gray-500 block uppercase font-black font-sans">Customer Phone Number</span>
                      <div className="text-[#00F0FF] text-sm font-black font-mono">
                        {editingOrder.customerPhone || editingOrder.phoneNumber || 'Not Provided (Check WhatsApp notification)'}
                      </div>
                    </div>
                  </div>

                  {/* Hardware delivery info if applicable */}
                  {editingOrder.hasHardware && editingOrder.shippingAddress ? (
                    <div className="p-4 bg-pink-500/5 border border-pink-500/15 rounded-2xl space-y-3">
                      <div className="text-[10px] text-pink-400 font-black uppercase flex items-center gap-1.5 font-sans">
                        <Truck size={12} /> Physical Delivery address
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="col-span-full font-semibold text-white">
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Street Address:</span>
                          {editingOrder.shippingAddress.fullAddress}
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">City:</span>
                          <span className="text-white font-bold">{editingOrder.shippingAddress.city}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Governorate:</span>
                          <span className="text-white font-bold">{editingOrder.shippingAddress.governorate}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Postal Code:</span>
                          <span className="text-white font-mono font-bold">{editingOrder.shippingAddress.postalCode}</span>
                        </div>
                        {editingOrder.shippingAddress.additionalNotes && (
                          <div className="col-span-full bg-black/30 p-2.5 rounded-xl border border-white/5">
                            <span className="text-gray-500 text-[9px] uppercase font-bold block">Additional Instructions/Notes:</span>
                            <p className="text-gray-300 text-[11px] leading-relaxed mt-0.5">{editingOrder.shippingAddress.additionalNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 rounded-xl text-center text-gray-500 text-[9px] font-black uppercase tracking-wider leading-relaxed">
                      Digital license delivery order (No hardware shipping fields required)
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Auto Receipt */}
              {modalTab === 'receipt' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[#0B0B0F] p-2 px-3 border border-white/5 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-gray-400">Automatical text Receipt Log</span>
                    <button
                      type="button"
                      onClick={() => {
                        const receiptStr = editingOrder.receiptText || `Order: ${editingOrder.productName}\nTotal Due: ${formatPrice(editingOrder.finalPrice)}`;
                        navigator.clipboard.writeText(receiptStr);
                        showToast('Receipt copied successfully!');
                      }}
                      className="px-2.5 py-1.5 bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-black rounded border border-pink-500/25 hover:border-transparent text-[9px] font-black uppercase tracking-wider transition-all"
                    >
                      Copy Receipt Text
                    </button>
                  </div>

                  <div className="relative">
                    <pre className="bg-[#0B0B0F] p-4 text-[10px] sm:text-xs font-mono text-gray-300 border border-white/5 rounded-xl whitespace-pre-wrap select-all max-h-[240px] overflow-y-auto w-full leading-normal">
                      {editingOrder.receiptText || `========================================
     ZEROLAG GAMES STORE RECEIPT
========================================
Order ID      : ${editingOrder.orderId || editingOrder.orderNumber || 'WEB-ORDER'}
Date          : ${new Date(editingOrder.createdAt).toLocaleString()}
Customer Name : ${editingOrder.customerName}
Email         : ${editingOrder.customerEmail || 'N/A'}
Phone Number  : ${editingOrder.customerPhone || 'N/A'}
----------------------------------------
Item Purchased:
 - ${editingOrder.productName || 'Title Package'} (Version: ${editingOrder.selectedVersion || 'Secondary'})
----------------------------------------
Grand Total   : ${formatPrice(editingOrder.finalPrice || editingOrder.price || 0)}
========================================
        THANK YOU FOR SHOPPING!
========================================`}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 3: Update Metadata / Edit */}
              {modalTab === 'edit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Customer Name</label>
                      <input 
                        type="text"
                        value={editCustomerName}
                        onChange={e => setEditCustomerName(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF] font-black uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Price (EGP)</label>
                      <input 
                        type="number"
                        value={editPrice}
                        onChange={e => setEditPrice(Number(e.target.value))}
                        className="w-full bg-[#0B0B0F] border border-[#00F0FF]/25 focus:border-[#00F0FF] rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Payment Method</label>
                      <input 
                        type="text"
                        value={editPaymentMethod}
                        onChange={e => setEditPaymentMethod(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF] font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Status</label>
                      <select 
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-[#00F0FF]/25 focus:border-[#00F0FF] rounded-xl px-4 py-3 text-xs text-[#00F0FF] focus:outline-none font-black uppercase"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Refunded">Refunded</option>
                        <option value="Paid">Paid</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Pending Payment Verification">Pending Payment Verification</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-colors"
              >
                Close Panel
              </button>
              
              {modalTab === 'edit' && (
                <button
                  type="button"
                  onClick={() => {
                    if (onEditOrder && editingOrder.id) {
                      onEditOrder(editingOrder.id, {
                        customerName: editCustomerName,
                        price: editPrice,
                        finalPrice: editPrice,
                        paymentMethod: editPaymentMethod,
                        status: editStatus as any
                      });
                      setEditingOrder(null);
                    }
                  }}
                  className="px-5 py-2.5 bg-[#00F0FF] text-black rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-[#33F3FF] transition-colors"
                >
                  Save Changes
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
