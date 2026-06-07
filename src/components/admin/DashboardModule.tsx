import React from 'react';
import { 
  DollarSign, Users, ShoppingCart, Key, ShieldCheck, 
  TrendingUp, AlertTriangle, UserPlus, ClipboardList,
  Layers, PackageOpen, Award, CheckCircle, Percent, Clock
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { motion } from 'framer-motion';

interface DashboardModuleProps {
  stats: {
    todayRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    todayOrders: number;
    weeklyOrders: number;
    monthlyOrders: number;
    totalCustomers: number;
    newCustomersCount: number;
    returningCustomersCount: number;
    averageOrderValue: number;
    lowStockAlertsCount: number;
    inventoryHealthScore: number;
    activeReservationsCount: number;
    activeWarrantiesCount: number;
    slotsPS4: { available: number; reserved: number; sold: number; blocked: number };
    slotsPS5: { available: number; reserved: number; sold: number; blocked: number };
    slotsSecondary: { available: number; reserved: number; sold: number; blocked: number };
  };
  recentSales: any[];
  lowStockAlerts: any[];
  recentCustomers: any[];
  activities: any[];
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardModule({ 
  stats, 
  recentSales, 
  lowStockAlerts, 
  recentCustomers, 
  activities,
  onNavigateToTab
}: DashboardModuleProps) {

  // Simple custom SVG chart coordinates for Revenue Trend
  const trendPoints = [
    { label: 'Mon', val: 1200 },
    { label: 'Tue', val: 1900 },
    { label: 'Wed', val: 1530 },
    { label: 'Thu', val: 2800 },
    { label: 'Fri', val: 2400 },
    { label: 'Sat', val: 3400 },
    { label: 'Sun', val: stats.todayRevenue > 0 ? stats.todayRevenue : 4100 }
  ];

  const maxVal = Math.max(...trendPoints.map(p => p.val));
  const svgWidth = 500;
  const svgHeight = 150;
  
  const pointsString = trendPoints.map((p, i) => {
    const x = (i / (trendPoints.length - 1)) * (svgWidth - 40) + 20;
    const y = svgHeight - ((p.val / maxVal) * (svgHeight - 40) + 20);
    return `${x},${y}`;
  }).join(' ');

  const fillPointsString = `20,${svgHeight} ${pointsString} ${svgWidth - 20},${svgHeight}`;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00F0FF]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00F0FF]/10 text-[#00F0FF] rounded-full border border-[#00F0FF]/20 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={12} className="text-[#00F0FF]" /> ENTERPRISE CORE ONLINE
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
            ZEROLAG <span className="text-[#00F0FF]">CONTROL CENTER</span>
          </h1>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider max-w-xl">
            Real-time operations management console. Track digital product allocations, customer queries, receipts, and warranties.
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <button 
            onClick={() => onNavigateToTab('orders')}
            className="px-6 py-3 bg-[#00F0FF] text-[#0B0B0F] rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_20px_#00F0FF55]"
          >
            + Create Order
          </button>
          <button 
            onClick={() => onNavigateToTab('inventory')}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-colors"
          >
            View Inventory
          </button>
        </div>
      </div>

      {/* Main Revenue KPIs Grid Layout */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400 flex items-center gap-2">
          <TrendingUp size={12} className="text-[#00F0FF]" /> REVENUE & SETTLEMENT FLOWS
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Revenue Today", value: formatPrice(stats.todayRevenue), desc: "Direct sales today", icon: <DollarSign size={20} className="text-[#00F0FF]" />, color: "border-[#00F0FF]/25 shadow-[0_0_20px_rgba(0,240,255,0.05)]" },
            { title: "Revenue This Week", value: formatPrice(stats.weeklyRevenue), desc: "Last 7 days dynamic", icon: <TrendingUp size={20} className="text-[#6C5CE7]" />, color: "border-white/5" },
            { title: "Revenue This Month", value: formatPrice(stats.monthlyRevenue), desc: "Current billing cycle", icon: <DollarSign size={20} className="text-pink-400" />, color: "border-white/5" },
            { title: "Revenue This Year", value: formatPrice(stats.yearlyRevenue), desc: "Cumulative calendar roll", icon: <DollarSign size={20} className="text-[#00F0FF]" />, color: "border-white/5" },
          ].map((kpi, idx) => (
            <div key={idx} className={`p-6 bg-[#151619] rounded-2xl border ${kpi.color} space-y-3`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{kpi.title}</span>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">{kpi.icon}</div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{kpi.value}</div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{kpi.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Orders Today", value: stats.todayOrders, desc: "Secured purchases", icon: <ShoppingCart size={20} className="text-[#00F0FF]" /> },
          { title: "Orders This Week", value: stats.weeklyOrders, desc: "Order level volume", icon: <ShoppingCart size={20} className="text-[#6C5CE7]" /> },
          { title: "Orders This Month", value: stats.monthlyOrders, desc: "Monthly activity level", icon: <ShoppingCart size={20} className="text-pink-400" /> },
          { title: "Average Order Value", value: formatPrice(stats.averageOrderValue), desc: "EGP basket density", icon: <Percent size={20} className="text-[#00F0FF]" /> },
        ].map((kpi, idx) => (
          <div key={idx} className="p-5 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{kpi.title}</span>
              <div className="text-gray-400">{kpi.icon}</div>
            </div>
            <div className="text-xl font-black text-white tracking-tight">{kpi.value}</div>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* CRM segmentation & Inventory Health indicators Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <Users size={12} className="text-[#00F0FF]" /> CRM SEGMENTS BUYERS
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-2xl font-black text-white">{stats.totalCustomers}</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Total Lenders</span>
            </div>
            <div>
              <div className="text-lg font-black text-[#00F0FF]">{stats.newCustomersCount}</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">New (30d)</span>
            </div>
            <div>
              <div className="text-lg font-black text-pink-400">{stats.returningCustomersCount}</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Returning</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-yellow-400" /> STOCK HEALTH ALERT INDEX
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-2xl font-black text-yellow-400">{stats.lowStockAlertsCount}</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Low Stock Classes</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-green-400">{stats.inventoryHealthScore}%</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Inventory Health Score</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <Clock size={12} className="text-purple-400" /> OPERATIONS BACKLOG
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-2xl font-black text-purple-400">{stats.activeReservationsCount}</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Holds Active</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-cyan-400">{stats.activeWarrantiesCount}</div>
              <span className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Coverages Monitored</span>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Account Slots KPIs */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
          <Layers size={14} className="text-[#00F0FF]" /> ACCOUNT CHANNELS & SLOTS ALLOCATIONS
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              name: "PS4 Primary Slots", 
              data: stats.slotsPS4,
              color: "border-[#00F0FF]/20"
            },
            { 
              name: "PS5 Primary Slots", 
              data: stats.slotsPS5,
              color: "border-[#6C5CE7]/20"
            },
            { 
              name: "Secondary Slots", 
              data: stats.slotsSecondary,
              color: "border-white/5"
            }
          ].map((ch, idx) => {
            const total = ch.data.available + ch.data.reserved + ch.data.sold + ch.data.blocked;
            const availablePct = total > 0 ? (ch.data.available / total) * 100 : 0;
            const reservedPct = total > 0 ? (ch.data.reserved / total) * 100 : 0;
            const soldPct = total > 0 ? (ch.data.sold / total) * 100 : 0;
            const blockedPct = total > 0 ? (ch.data.blocked / total) * 100 : 0;

            return (
              <div key={idx} className={`p-6 bg-[#151619] rounded-[1.5rem] border ${ch.color} space-y-6`}>
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black uppercase tracking-tight text-white">{ch.name}</h4>
                  <span className="text-[10px] font-mono font-bold text-gray-500">Total: {total}</span>
                </div>

                {/* Status Bar */}
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div style={{ width: `${availablePct}%` }} className="bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                  <div style={{ width: `${reservedPct}%` }} className="bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                  <div style={{ width: `${soldPct}%` }} className="bg-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
                  <div style={{ width: `${blockedPct}%` }} className="bg-gray-600"></div>
                </div>

                {/* Slots Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></span>
                    <div className="leading-none">
                      <div className="text-xs font-black text-white">{ch.data.available}</div>
                      <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Available</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
                    <div className="leading-none">
                      <div className="text-xs font-black text-white">{ch.data.reserved}</div>
                      <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Reserved</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shrink-0"></span>
                    <div className="leading-none">
                      <div className="text-xs font-black text-white">{ch.data.sold}</div>
                      <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Sold Slots</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-600 shrink-0"></span>
                    <div className="leading-none">
                      <div className="text-xs font-black text-white">{ch.data.blocked}</div>
                      <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Blocked</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Trend & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Revenue Chart */}
        <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Weekly Performance Trend</h4>
            <div className="text-xs font-black text-[#00F0FF]">+12.4% vs last week</div>
          </div>
          <div className="relative h-44 w-full flex items-end">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-full overflow-visible"
            >
              <line x1="20" y1="20" x2={svgWidth - 20} y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="20" y1="60" x2={svgWidth - 20} y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="20" y1="100" x2={svgWidth - 20} y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="20" y1="140" x2={svgWidth - 20} y2="140" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              <polygon 
                points={fillPointsString} 
                fill="url(#trendGradient)" 
                opacity="0.15"
              />

              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
                </linearGradient>
              </defs>

              <polyline 
                fill="none" 
                stroke="#00F0FF" 
                strokeWidth="3.5" 
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
                className="drop-shadow-[0_0_8px_#00F0FF88]"
              />

              {trendPoints.map((p, i) => {
                const x = (i / (trendPoints.length - 1)) * (svgWidth - 40) + 20;
                const y = svgHeight - ((p.val / maxVal) * (svgHeight - 40) + 20);
                return (
                  <g key={i} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r="4" fill="#0B0B0F" stroke="#00F0FF" strokeWidth="2" />
                    <circle cx={x} cy={y} r="8" fill="#00F0FF" opacity="0" className="group-hover/dot:opacity-30 transition-opacity" />
                    <text 
                      x={x} 
                      y={y - 12} 
                      textAnchor="middle" 
                      fill="#00F0FF" 
                      fontSize="9" 
                      fontWeight="bold" 
                      fontFamily="monospace"
                      className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
                    >
                      {formatPrice(p.val)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex justify-between items-center px-4 pt-2 border-t border-white/5">
            {trendPoints.map((p, idx) => (
              <span key={idx} className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{p.label}</span>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#6C5CE7] flex items-center gap-2">
            <AlertTriangle size={14} /> Critical Stock Warnings
          </h4>
          
          <div className="space-y-3 max-h-[170px] overflow-y-auto pr-1">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                  <div>
                    <div className="text-xs font-black uppercase text-white truncate max-w-[150px]">{prod.name}</div>
                    <div className="text-[8px] font-mono text-pink-400 capitalize">{prod.platform} • {prod.category}</div>
                  </div>
                  <div className="px-2 py-1 bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                    Low Stock
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center border border-dashed border-white/5 rounded-xl text-gray-500 text-xs uppercase tracking-wider">
                <CheckCircle size={16} className="mx-auto text-green-500 mb-2" /> All products well stocked
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Foot & Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Sales / Orders */}
        <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
              <ClipboardList size={14} /> Recent Sales & Settlements
            </h4>
            <button 
              onClick={() => onNavigateToTab('orders')}
              className="text-[9px] font-bold uppercase tracking-widest text-gray-400 underline"
            >
              See All
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {recentSales.length > 0 ? (
              recentSales.map((sale, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <div className="text-xs font-black uppercase tracking-tight text-white">{sale.customerName}</div>
                    <p className="text-[9px] font-mono text-gray-400 truncate max-w-[200px]">{sale.productName || 'Shared PSN Slot'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#00F0FF]">{formatPrice(sale.price || sale.total)}</div>
                    <div className="text-[8px] font-mono text-gray-500">{sale.orderNumber || sale.id?.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs uppercase tracking-wider">No sales recorded today</div>
            )}
          </div>
        </div>

        {/* Live Activity logs / Audits */}
        <div className="p-6 bg-[#151619] rounded-[1.5rem] border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <PackageOpen size={14} className="text-[#6C5CE7]" /> Internal Audit Trail
            </h4>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {activities.length > 0 ? (
              activities.map((act, idx) => (
                <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-[#6C5CE7] mt-1.5 shrink-0 shadow-[0_0_10px_#6C5CE7]"></div>
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">{act.entity} {act.action}</div>
                    <p className="text-xs text-gray-300 leading-normal">{act.details}</p>
                    <div className="flex items-center justify-between text-[8px] font-mono text-gray-500">
                      <span>{act.user}</span>
                      <span>{new Date(act.date?.seconds * 1000 || act.date || Date.now()).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs uppercase tracking-wider">Activity stack empty</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
