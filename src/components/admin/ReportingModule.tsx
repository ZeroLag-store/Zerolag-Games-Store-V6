import React, { useState } from 'react';
import { 
  FileSpreadsheet, Calendar, TrendingUp, DollarSign, Download, ClipboardList, BarChart3
} from 'lucide-react';
import { Order, DigitalAccount } from '../../types';
import { formatPrice } from '../../lib/utils';
import { motion } from 'framer-motion';

interface ReportingModuleProps {
  orders: Order[];
  accounts: DigitalAccount[];
  showToast: (msg: string) => void;
}

export default function ReportingModule({
  orders,
  accounts,
  showToast,
}: ReportingModuleProps) {
  const [reportType, setReportType] = useState<'sales' | 'inventory'>('sales');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Settle time boundaries
  const getFilteredOrders = () => {
    const now = new Date();
    let startDate = new Date();

    if (timeframe === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'monthly') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === 'custom' && customStart && customEnd) {
      const filtered = orders.filter(o => {
        const orderDate = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
        return orderDate >= new Date(customStart) && orderDate <= new Date(customEnd);
      });
      return filtered;
    }

    return orders.filter(o => {
      const orderDate = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
      return orderDate >= startDate && o.status === 'Completed';
    });
  };

  const activeOrders = getFilteredOrders();
  const summaryRevenue = activeOrders.reduce((sum, current) => sum + current.price, 0);

  const handleDownloadCsvReport = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      
      if (reportType === 'sales') {
        const headers = ['Order Code', 'Date', 'Customer Name', 'Customer Email', 'Amount Price EGP', 'Status'];
        const rows = [headers.join(',')];
        
        activeOrders.forEach(o => {
          rows.push([
            o.orderNumber,
            new Date(o.createdAt?.seconds * 1000 || o.createdAt).toLocaleDateString(),
            o.customerName,
            o.accountEmail,
            o.price,
            o.status
          ].join(','));
        });
        csvContent += rows.join('\n');
      } else {
        // Inventory Report
        const headers = ['Email Address', 'Product Name', 'Region', 'PS4 Slot Unit', 'PS5 Slot Unit', 'Secondary Slot Unit'];
        const rows = [headers.join(',')];
        accounts.forEach(acc => {
          rows.push([
            acc.email,
            acc.productName,
            acc.region,
            acc.slots.find(s => s.slotType === 'PS4_PRIMARY')?.status || 'none',
            acc.slots.find(s => s.slotType === 'PS5_PRIMARY')?.status || 'none',
            acc.slots.find(s => s.slotType === 'SECONDARY')?.status || 'none'
          ].join(','));
        });
        csvContent += rows.join('\n');
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Zerolag_ERP_${reportType}_report_${timeframe}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Report sheet compiled and downloaded');
    } catch (err) {
      showToast('Export error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Configure Filter Row */}
      <div className="p-6 bg-[#151619] rounded-[2rem] border border-white/5 space-y-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
          <Calendar size={14} /> FILTER OPERATIONS METRICS PERIOD
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400">Target Metrics Sub-system</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as any)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white uppercase"
            >
              <option value="sales">Revenue & Sales reports</option>
              <option value="inventory">Digital Accounts stock allocation</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400">Settlement Range</label>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value as any)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white uppercase"
            >
              <option value="daily">Daily Today</option>
              <option value="weekly">Weekly Roll (Last 7 Days)</option>
              <option value="monthly">Monthly Cycle (Last 30 Days)</option>
              <option value="custom">Custom Calendar range</option>
            </select>
          </div>

          {timeframe === 'custom' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400">Start date</label>
                <input 
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2 px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400">End date</label>
                <input 
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2 px-3 text-xs"
                />
              </div>
            </>
          )}

          <button 
            onClick={handleDownloadCsvReport}
            className="px-6 py-2.5 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={16} /> DOWNLOAD CSV SPREADSHEET
          </button>
        </div>
      </div>

      {/* Numerical Metrics Summary Block */}
      {reportType !== 'inventory' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-1">
              <DollarSign size={14} /> Cumulative Gross Settlement
            </h4>
            <div className="text-4xl font-black text-white">{formatPrice(summaryRevenue)}</div>
            <p className="text-[9px] font-mono text-gray-500 uppercase">Compiled across {activeOrders.length} Completed orders within context</p>
          </div>

          <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
              <TrendingUp size={14} /> Registered Target Settlements
            </h4>
            <div className="text-4xl font-black text-white">{activeOrders.length}</div>
            <p className="text-[9px] font-mono text-gray-500 uppercase">Count of completed transactions inside domain</p>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <BarChart3 size={14} className="text-[#00F0FF]" /> Total Available account units details: {accounts.length}
          </h4>
          <p className="text-xs text-gray-400 leading-normal">
            Exporting the inventory context will map the operational credentials, security recovery logs, and individual channel slot active boundaries.
          </p>
        </div>
      )}
    </div>
  );
}
