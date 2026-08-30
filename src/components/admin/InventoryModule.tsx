import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Shield, Settings, FileSpreadsheet, 
  Upload, Download, AlertTriangle, Eye, EyeOff, Save, CheckCircle,
  Gamepad, Layers, Trash, HelpCircle, CheckCircle2, Copy, X, UploadCloud, ArrowLeft, ArrowRight,
  Archive, Sparkles, Monitor, Gamepad2, Check
} from 'lucide-react';
import { collection, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../firebase';
import { DigitalAccount, SlotStatus, SlotType, AccountSlot, Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useAuth } from '../../App';
import { motion } from 'framer-motion';
import { deleteImageHelper } from '../../lib/storageHelper';
import { normalizeProductConfig } from '../../lib/productNormalizer';
import { safeAddDoc, cleanFirestoreData } from '../../lib/firestoreUtils';
import AccountFormModal from './AccountFormModal';
import ProductFormModal from './ProductFormModal';

interface InventoryModuleProps {
  accounts: DigitalAccount[];
  products: Product[];
  onAddAccount: (acc: Partial<DigitalAccount>) => void;
  onEditAccount: (accountId: string, acc: Partial<DigitalAccount>) => void;
  onDeleteAccount: (accountId: string) => void;
  onBulkUpdateStatus: (accountIds: string[], slotType: SlotType, status: SlotStatus) => void;
  onBulkImport: (accounts: any[]) => void;
  onLogActivity: (action: string, entity: string, details: string) => void;
  showToast: (msg: string) => void;
  userRole: string; // OWNER, MANAGER, EMPLOYEE
  onRefreshData: () => void;
  forcedView?: 'digital_logins' | 'game_catalog' | 'hardware_inventory';
}

export default function InventoryModule({
  accounts,
  products,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onBulkUpdateStatus,
  onBulkImport,
  onLogActivity,
  showToast,
  userRole,
  onRefreshData,
  forcedView
}: InventoryModuleProps) {
  const { taxonomies } = useAuth();
  // Dual-Tab selection: "accounts" vs "catalog"
  const [subTab, setSubTab] = useState<'accounts' | 'catalog'>('accounts');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('');
  const [selectedSlotStatusFilter, setSelectedSlotStatusFilter] = useState<string>('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showCredentials, setShowCredentials] = useState<{ [key: string]: boolean }>({});
  
  // Isolated Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<DigitalAccount | null>(null);

  // Bulk account allocations
  const [bulkSlotType, setBulkSlotType] = useState<SlotType>('PS4_PRIMARY');
  const [bulkStatus, setBulkStatus] = useState<SlotStatus>('AVAILABLE');

  // CSV Import states
  const [importCsvText, setImportCsvText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // --- CATALOG SUB-TAB STATES ---
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [deleteProductTarget, setDeleteProductTarget] = useState<{ id: string, name: string } | null>(null);
  
  // Isolated Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productModalDefaultCategory, setProductModalDefaultCategory] = useState<string>('Games');

  // Bulk Game operations states
  const [bulkMultiplier, setBulkMultiplier] = useState('1.00');
  const [bulkGameCategory, setBulkGameCategory] = useState('');
  const [bulkGameStock, setBulkGameStock] = useState('');

  // Settle active regions lists (memoized)
  const regions = useMemo(() => Array.from(new Set(accounts.map(a => a.region || 'EG'))), [accounts]);

  const toggleEye = (accId: string) => {
    setShowCredentials(prev => ({ ...prev, [accId]: !prev[accId] }));
  };

  // 1. FILTER ACCOUNTS (memoized)
  const filteredAccounts = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    return accounts.filter(acc => {
      const linkedProd = products.find(p => p.id === acc.productId);
      if (linkedProd?.category === 'Hardware') return false;

      const matchesSearch = !term ||
        (acc.email || '').toLowerCase().includes(term) ||
        (acc.productName || '').toLowerCase().includes(term) ||
        (acc.notes && acc.notes.toLowerCase().includes(term));
      
      const matchesProduct = selectedProductFilter ? acc.productId === selectedProductFilter : true;
      const matchesRegion = selectedRegionFilter ? acc.region === selectedRegionFilter : true;
      
      const matchesSlotStatus = selectedSlotStatusFilter 
        ? acc.slots.some(s => s.status === selectedSlotStatusFilter)
        : true;

      return matchesSearch && matchesProduct && matchesRegion && matchesSlotStatus;
    });
  }, [accounts, products, searchQuery, selectedProductFilter, selectedRegionFilter, selectedSlotStatusFilter]);

  // 2. FILTER PRODUCTS/GAMES (memoized)
  const filteredProducts = useMemo(() => {
    const viewMode = forcedView || (subTab === 'accounts' ? 'digital_logins' : 'game_catalog');
    const term = productSearch.toLowerCase().trim();

    return products.filter(p => {
      if (p.isDeleted) return false;

      if (viewMode === 'hardware_inventory') {
        if (p.category !== 'Hardware') return false;
      } else {
        if (p.category === 'Hardware') return false;
      }

      if (!term) return true;
      return (p.name || '').toLowerCase().includes(term) ||
             (p.category || '').toLowerCase().includes(term) ||
             (p.subcategory || '').toLowerCase().includes(term) ||
             (p.platform || '').toLowerCase().includes(term);
    });
  }, [products, forcedView, subTab, productSearch]);

  const getSlotColorClass = (status: SlotStatus) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500 text-green-950 font-black shadow-[0_0_10px_rgba(34,197,94,0.3)]';
      case 'RESERVED': return 'bg-amber-500 text-amber-950 font-black';
      case 'SOLD': return 'bg-[#00F0FF] text-[#0B0B0F] font-black shadow-[0_0_10px_rgba(0,240,255,0.3)]';
      case 'BLOCKED': return 'bg-gray-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleEditClick = (acc: DigitalAccount) => {
    setAccountToEdit(acc);
    setIsAccountModalOpen(true);
  };

  const handleTriggerEditProduct = (p: Product) => {
    setProductToEdit(p);
    setProductModalDefaultCategory(p.category || 'Games');
    setIsProductModalOpen(true);
  };

  const toggleSelectAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAccounts.length === filteredAccounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(filteredAccounts.map(a => a.id));
    }
  };

  const triggerBulkUpdate = () => {
    if (selectedAccounts.length === 0) {
      showToast('No accounts selected for bulk action');
      return;
    }
    onBulkUpdateStatus(selectedAccounts, bulkSlotType, bulkStatus);
    setSelectedAccounts([]);
    showToast(`Bulk state adjusted on ${selectedAccounts.length} slots`);
    onLogActivity('Bulk Modified', 'Console Channels', `Modified ${selectedAccounts.length} profiles to status: ${bulkStatus}`);
  };

  const handleCsvImport = () => {
    if (!importCsvText.trim()) {
      showToast('CSV database input empty');
      return;
    }

    try {
      const lines = importCsvText.trim().split('\n');
      const header = lines[0].split(',');
      const importedList: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const cols = lines[i].split(',');
        const accRow: any = {};
        header.forEach((h, j) => {
          accRow[h.trim()] = cols[j]?.replace(/["'\r]/g, '').trim();
        });
        importedList.push(accRow);
      }

      onBulkImport(importedList);
      setShowImportDialog(false);
      setImportCsvText('');
      showToast(`Database synchronized with ${importedList.length} slots`);
      onLogActivity('CSV Imported', 'Digital Terminals', `Bulk import loaded ${importedList.length} items`);
    } catch (e) {
      showToast('Error parsing CSV attributes');
    }
  };

  const handleCsvExport = () => {
    try {
      const headers = ['id', 'email', 'productId', 'productName', 'region', 'recoveryEmail', 'recoveryPhone', 'notes'];
      const csvRows = [headers.join(',')];

      accounts.forEach(acc => {
        const values = [
          acc.id,
          acc.email,
          acc.productId,
          acc.productName,
          acc.region,
          acc.recoveryEmail || '',
          acc.recoveryPhone || '',
          (acc.notes || '').replace(/,/g, ' ')
        ];
        csvRows.push(values.join(','));
      });

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Zerolag_ERP_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Store inventory exported to spreadsheet");
    } catch (err) {
      showToast("CSV Export failed");
    }
  };

  const handleDuplicateProduct = async (p: Product) => {
    try {
      const slotPrices = [
        Number(p.pricePS4Primary) || 0,
        Number(p.pricePS5Primary) || 0,
        Number(p.priceSecondary) || 0
      ].filter(x => x > 0);
      const computedPrice = slotPrices.length > 0 ? Math.min(...slotPrices) : 0;

      const isHardware = p.category === 'Hardware';
      const finalComputingPrice = isHardware ? (Number(p.price) || 0) : computedPrice;

      const norm = normalizeProductConfig(p);

      const rawPayload: any = {
        name: `${p.name} (Copy)`,
        description: p.description || '',
        shortDescription: p.shortDescription || '',
        platform: p.platform || 'PS5',
        category: p.category || 'Games',
        subcategory: p.subcategory || '',
        genre: p.genre || '',
        tags: p.tags || [],
        discount: p.discount || 0,
        price: finalComputingPrice,
        pricePS4Primary: p.pricePS4Primary || 0,
        pricePS5Primary: p.pricePS5Primary || 0,
        priceSecondary: p.priceSecondary || 0,
        ps4PrimaryStock: p.ps4PrimaryStock || 0,
        ps5PrimaryStock: p.ps5PrimaryStock || 0,
        secondaryStock: p.secondaryStock || 0,
        stockStatus: p.stockStatus || 'In Stock',
        imageUrl: p.imageUrl || '',
        galleryImages: p.galleryImages || [],
        featured: !!p.featured,
        trending: !!p.trending,
        recommended: !!p.recommended,
        isDeleted: false,
        createdAt: new Date().toISOString()
      };

      if (isHardware && norm.hardwareConfig) {
        rawPayload.hardwareConfig = norm.hardwareConfig;
      }
      if (norm.topUpPackages && norm.topUpPackages.length > 0) {
        rawPayload.topUpPackages = norm.topUpPackages;
      }
      if (norm.subscriptionPlans && norm.subscriptionPlans.length > 0) {
        rawPayload.subscriptionPlans = norm.subscriptionPlans;
      }
      if (norm.gameConfig) {
        rawPayload.platformsConfig = norm.gameConfig;
      }

      const payload = cleanFirestoreData(rawPayload);

      await safeAddDoc(collection(db, 'products'), payload);
      showToast(`Cloned master catalog game: ${p.name}`);
      onLogActivity('Duplicate Game', 'Catalog', `Cloned game product: ${p.name}`);
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products/clone');
    }
  };

  const handleToggleField = async (p: Product, field: 'featured' | 'isHidden' | 'isArchived') => {
    try {
      const newVal = !p[field];
      await updateDoc(doc(db, 'products', p.id), {
        [field]: newVal,
        updatedAt: new Date().toISOString()
      });
      showToast(`SUCCESS: ${field} toggled to ${newVal}`);
      if (onLogActivity) {
        onLogActivity('Toggle Product Status', 'Catalog', `Set ${field} to ${newVal} for game ${p.name}`);
      }
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${p.id}`);
    }
  };

  const handleDeleteProduct = (prodId: string, name: string) => {
    // Triggers custom beautiful soft-delete/permanent-delete prompt overlay
    setDeleteProductTarget({ id: prodId, name });
  };

  // --- BULK CATALOG OPERATIONS ---

  const handleProductsSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleProductSelection = (pId: string) => {
    setSelectedProducts(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const handleBulkApplyMultiplier = async () => {
    if (selectedProducts.length === 0) {
      showToast("No games selected");
      return;
    }
    const factor = Number(bulkMultiplier);
    if (!factor || factor <= 0) {
      showToast("Invalid multiplier scale value");
      return;
    }

    try {
      let count = 0;
      for (const pId of selectedProducts) {
        const prodObj = products.find(p => p.id === pId);
        if (prodObj) {
          const newPS4 = Math.round((prodObj.pricePS4Primary || 0) * factor);
          const newPS5 = Math.round((prodObj.pricePS5Primary || 0) * factor);
          const newSec = Math.round((prodObj.priceSecondary || 0) * factor);

          await updateDoc(doc(db, 'products', pId), {
            pricePS4Primary: newPS4,
            pricePS5Primary: newPS5,
            priceSecondary: newSec
          });
          count++;
        }
      }

      showToast(`Bulk adjusting prices on ${count} games complete`);
      onLogActivity('Bulk Multiplier', 'Catalog', `Applied price factor ${factor}x on ${count} platform entries`);
      setSelectedProducts([]);
      onRefreshData();
    } catch (err) {
      showToast("Bulk multiplier crash");
    }
  };

  const handleBulkChangeCategory = async () => {
    if (selectedProducts.length === 0 || !bulkGameCategory) {
      showToast("Select games and target category");
      return;
    }

    try {
      let count = 0;
      for (const pId of selectedProducts) {
        await updateDoc(doc(db, 'products', pId), {
          category: bulkGameCategory
        });
        count++;
      }
      showToast(`Bulk reassigned category to ${bulkGameCategory} across ${count} entries`);
      onLogActivity('Bulk Category', 'Catalog', `Reassigned group classification to ${bulkGameCategory} for ${count} keys`);
      setSelectedProducts([]);
      onRefreshData();
    } catch (err) {
      showToast("Bulk category move failed");
    }
  };

  const handleBulkChangeStock = async () => {
    if (selectedProducts.length === 0 || !bulkGameStock) {
      showToast("Select games and target status");
      return;
    }

    try {
      let count = 0;
      for (const pId of selectedProducts) {
        await updateDoc(doc(db, 'products', pId), {
          stockStatus: bulkGameStock
        });
        count++;
      }
      showToast(`Bulk updated stock status is now ${bulkGameStock} on ${count} games`);
      onLogActivity('Bulk Stock', 'Catalog', `Modified availability index to ${bulkGameStock} on ${count} nodes`);
      setSelectedProducts([]);
      onRefreshData();
    } catch (err) {
      showToast("Bulk stock change failed");
    }
  };


  const viewMode = forcedView || (subTab === 'accounts' ? 'digital_logins' : 'game_catalog');

  return (
    <div className="space-y-6">
      {/* Tab navigation within ERP Stock Module */}
      {!forcedView && (
        <div className="border-b border-white/5 pb-2 flex items-center gap-4">
          <button 
            onClick={() => setSubTab('accounts')}
            className={`px-4 py-2 font-black uppercase text-xs tracking-wider rounded-lg flex items-center gap-2 transition-all ${subTab === 'accounts' ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/25' : 'text-gray-400 hover:text-white'}`}
          >
            <Layers size={14} /> Digital Logins & Slots (Terminals)
          </button>
          <button 
            onClick={() => setSubTab('catalog')}
            className={`px-4 py-2 font-black uppercase text-xs tracking-wider rounded-lg flex items-center gap-2 transition-all ${subTab === 'catalog' ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/25' : 'text-gray-400 hover:text-white'}`}
          >
            <Gamepad size={14} /> Games Master Catalog ({products.length})
          </button>
        </div>
      )}

      {viewMode === 'digital_logins' ? (
        // --- VIEW 1: DIGITAL LOGINS & CONSOLE SLOTS ---
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Managed Accounts', value: accounts.length, color: 'text-[#00F0FF]' },
              { label: 'Active Games Linked', value: Array.from(new Set(accounts.map(a => a.productId))).length, color: 'text-[#6C5CE7]' },
              { label: 'Registered Egyptian Slots', value: accounts.filter(a => a.region === 'EG').length, color: 'text-green-400' },
              { label: 'Unassigned Accounts', value: accounts.filter(a => !a.productId).length, color: 'text-yellow-500' }
            ].map((item, id) => (
              <div key={id} className="p-4 bg-[#151619] rounded-xl border border-white/5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{item.label}</div>
                <div className={`text-xl font-black ${item.color} mt-1`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full lg:w-auto flex-1">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search email, console keys..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white"
                  />
                  <Search className="absolute left-3 top-3 text-gray-500" size={14} />
                </div>

                <select
                  value={selectedProductFilter}
                  onChange={e => setSelectedProductFilter(e.target.value)}
                  className="py-2.5 px-3 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-gray-300"
                >
                  <option value="">Filter Game/Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <select
                  value={selectedRegionFilter}
                  onChange={e => setSelectedRegionFilter(e.target.value)}
                  className="py-2.5 px-3 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-gray-300"
                >
                  <option value="">Filter Region</option>
                  {regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <select
                  value={selectedSlotStatusFilter}
                  onChange={e => setSelectedSlotStatusFilter(e.target.value)}
                  className="py-2.5 px-3 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-gray-300"
                >
                  <option value="">With Slot Status</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="SOLD">SOLD</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>

              <div className="flex gap-2 w-full lg:w-auto shrink-0 justify-end">
                <button 
                  onClick={() => { setAccountToEdit(null); setIsAccountModalOpen(true); }}
                  className="px-4 py-2.5 bg-[#00F0FF] text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <Plus size={14} /> Add Account
                </button>
                <button 
                  onClick={() => setShowImportDialog(true)}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                >
                  <FileSpreadsheet size={16} className="text-green-400" /> Import
                </button>
                <button 
                  onClick={handleCsvExport}
                  className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                >
                  <Download size={16} className="text-[#00F0FF]" /> Export
                </button>
              </div>
            </div>

            {selectedAccounts.length > 0 && (
              <div className="p-4 bg-[#00F0FF]/10 rounded-xl border border-[#00F0FF]/25 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-[#00F0FF]">{selectedAccounts.length} Account(s) Selected</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <select 
                    value={bulkSlotType}
                    onChange={e => setBulkSlotType(e.target.value as SlotType)}
                    className="py-1.5 px-3 bg-[#0B0B0F] border border-white/10 rounded-lg text-[10px] font-bold text-white uppercase"
                  >
                    <option value="PS4_PRIMARY">PS4 PRIMARY</option>
                    <option value="PS5_PRIMARY">PS5 PRIMARY</option>
                    <option value="SECONDARY">SECONDARY SLOTS</option>
                  </select>

                  <select 
                    value={bulkStatus}
                    onChange={e => setBulkStatus(e.target.value as SlotStatus)}
                    className="py-1.5 px-3 bg-[#0B0B0F] border border-white/10 rounded-lg text-[10px] font-bold text-white uppercase"
                  >
                    <option value="AVAILABLE">SET AVAILABLE</option>
                    <option value="RESERVED">SET RESERVED</option>
                    <option value="SOLD">SET SOLD</option>
                    <option value="BLOCKED">SET BLOCKED</option>
                  </select>

                  <button 
                    onClick={triggerBulkUpdate}
                    className="px-4 py-1.5 bg-[#00F0FF] text-black font-black uppercase text-[10px] rounded-lg tracking-widest hover:scale-105 transition-transform"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
            {/* Desktop Table: Hidden on mobile screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                    <th className="py-4 pl-4">
                      <input 
                        type="checkbox" 
                        checked={selectedAccounts.length > 0 && selectedAccounts.length === filteredAccounts.length}
                        onChange={toggleSelectAll}
                        className="accent-[#00F0FF]"
                      />
                    </th>
                    <th className="py-4">Digital Account Profile</th>
                    <th className="py-4">Secured Credentials</th>
                    <th className="py-4 text-center">PS4 Primary</th>
                    <th className="py-4 text-center">PS5 Primary</th>
                    <th className="py-4 text-center">Secondary Slot</th>
                    <th className="py-4 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-5 pl-4">
                          <input 
                            type="checkbox"
                            checked={selectedAccounts.includes(acc.id)}
                            onChange={() => toggleSelectAccount(acc.id)}
                            className="accent-[#00F0FF]"
                          />
                        </td>

                        <td className="py-5">
                          <div className="space-y-1 max-w-[220px]">
                            <div className="font-bold text-white truncate">{acc.email}</div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                              <span className="text-[#6C5CE7]">{acc.productName}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 bg-white/10 rounded text-gray-300">{acc.region}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-5">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleEye(acc.id)}
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              {showCredentials[acc.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <div className="font-mono text-xs text-gray-400">
                              {showCredentials[acc.id] ? (
                                <span className="bg-[#0B0B0F] px-2 py-1 rounded border border-white/5 break-all max-w-[200px] inline-block">
                                  Pw: {acc.password || 'none'}
                                </span>
                              ) : (
                                <span>•••••••••</span>
                              )}
                              <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">
                                {acc.recoveryEmail ? `Recovery: ${acc.recoveryEmail}` : 'No recovery info'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {[
                          acc.slots?.find(s => s.slotType === 'PS4_PRIMARY'),
                          acc.slots?.find(s => s.slotType === 'PS5_PRIMARY'),
                          acc.slots?.find(s => s.slotType === 'SECONDARY')
                        ].map((slot, sIdx) => (
                          <td key={sIdx} className="py-5 text-center">
                            {slot ? (
                              <div className="inline-flex flex-col items-center">
                                <span className={`px-2 py-1 rounded text-[8px] uppercase tracking-widest leading-none ${getSlotColorClass(slot.status)}`}>
                                  {slot.status}
                                </span>
                                <span className="text-[9px] font-bold font-mono text-gray-500 mt-1">{slot.currentPrice ? formatPrice(slot.currentPrice) : 'Default'}</span>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-[10px]">--</span>
                            )}
                          </td>
                        ))}

                        <td className="py-5 pr-4 text-right">
                          <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditClick(acc)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                              title="Edit terminal variables"
                            >
                              <Edit2 size={13} />
                            </button>
                            {userRole !== 'EMPLOYEE' && (
                              <button 
                                onClick={() => { if (confirm('Purge ledger credentials?')) onDeleteAccount(acc.id); }}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg"
                                title="Delete node"
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
                      <td colSpan={7} className="py-12 text-center text-gray-500 text-xs uppercase tracking-wider">
                        No active allocations matching filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View stacked layout */}
            <div className="md:hidden space-y-4">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc) => (
                  <div key={acc.id} className="bg-[#1A1C20]/80 rounded-2xl border border-white/5 p-4 space-y-4 shadow-lg">
                    {/* Header: Select bar and email profile */}
                    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <input 
                          type="checkbox"
                          checked={selectedAccounts.includes(acc.id)}
                          onChange={() => toggleSelectAccount(acc.id)}
                          className="accent-[#00F0FF] mt-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-white break-all">{acc.email}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-black uppercase text-[#6C5CE7]">{acc.productName}</span>
                            <span className="text-gray-600">•</span>
                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-bold text-gray-300 border border-white/10">{acc.region}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Interactive Eye Button */}
                      <button 
                        onClick={() => toggleEye(acc.id)}
                        className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white active:scale-95 transition-all shrink-0 w-11 h-11 flex items-center justify-center select-none"
                      >
                        {showCredentials[acc.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Credentials Section */}
                    <div className="space-y-1.5 text-xs">
                      <div className="bg-black/30 px-3 py-2.5 rounded-xl border border-white/5 font-mono text-gray-300 break-all">
                        <span className="text-gray-500 font-bold uppercase text-[9px] font-sans tracking-wide block mb-0.5">Password Credentials</span>
                        {showCredentials[acc.id] ? (
                          <span className="text-[#00F0FF] font-black">{acc.password || 'none'}</span>
                        ) : (
                          <span className="tracking-widest">•••••••••</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase px-1">
                        Recovery Info: <span className="text-gray-400 lowercase font-mono">{acc.recoveryEmail || 'none'}</span>
                      </div>
                    </div>

                    {/* Slots Breakdown Container */}
                    <div className="bg-black/35 rounded-xl px-3 py-2.5 border border-white/5 grid grid-cols-3 gap-2 text-center divide-x divide-white/5">
                      {[
                        { title: 'PS4 Prim', slot: acc.slots?.find(s => s.slotType === 'PS4_PRIMARY') },
                        { title: 'PS5 Prim', slot: acc.slots?.find(s => s.slotType === 'PS5_PRIMARY') },
                        { title: 'Secondary', slot: acc.slots?.find(s => s.slotType === 'SECONDARY') }
                      ].map((item, idx) => (
                        <div key={idx} className={idx > 0 ? "pl-2" : ""}>
                          <span className="text-[8px] text-gray-500 block uppercase font-black tracking-wider mb-1">{item.title}</span>
                          {item.slot ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-1.5 py-0.5 rounded-[5px] text-[8px] uppercase tracking-wider font-extrabold leading-none ${getSlotColorClass(item.slot.status)}`}>
                                {item.slot.status}
                              </span>
                              <span className="text-[9px] font-bold font-mono text-gray-400 mt-1">
                                {item.slot.currentPrice ? formatPrice(item.slot.currentPrice) : 'Default'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-600 font-mono text-[9px]">--</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions Panel */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => handleEditClick(acc)}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 flex-1 max-w-[120px] border border-white/10"
                      >
                        <Edit2 size={14} className="text-[#00F0FF]" />
                        <span>Edit</span>
                      </button>
                      {userRole !== 'EMPLOYEE' && (
                        <button 
                          onClick={() => { if (confirm('Purge ledger credentials?')) onDeleteAccount(acc.id); }}
                          className="px-4 py-2.5 bg-red-400/10 hover:bg-red-400/20 text-red-400 border border-red-400/25 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 flex-1 max-w-[120px]"
                        >
                          <Trash2 size={14} />
                          <span>Purge</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 bg-[#1A1C20]/40 rounded-2xl border border-white/5 text-center text-gray-500 text-xs uppercase tracking-widest">
                  No allocations matching criteria
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // --- VIEW 2: GAMES CARD / HARDWARE CATALOG (With Product CRUD & Bulk operations) ---
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {(viewMode === 'hardware_inventory' ? [
              { label: 'Total Hardware Items', value: products.filter(p => p.category === 'Hardware').length, color: 'text-[#00F0FF]' },
              { label: 'In Stock Units', value: products.filter(p => p.category === 'Hardware' && p.stockStatus === 'In Stock').length, color: 'text-green-400' },
              { label: 'Out of Stock Pieces', value: products.filter(p => p.category === 'Hardware' && p.stockStatus === 'Out of Stock').length, color: 'text-red-400' },
              { label: 'Dynamic Subcategories', value: Array.from(new Set(products.filter(p => p.category === 'Hardware' && p.subcategory).map(p => p.subcategory))).filter(Boolean).length, color: 'text-indigo-400' }
            ] : [
              { label: 'Total Catalog Games', value: products.filter(p => p.category !== 'Hardware').length, color: 'text-[#00F0FF]' },
              { label: 'Platforms Tracked', value: Array.from(new Set(products.filter(p => p.category !== 'Hardware').map(p => p.platform))).filter(Boolean).slice(0, 3).join(' • '), color: 'text-[#6C5CE7]' },
              { label: 'Out of Stock Licenses', value: products.filter(p => p.stockStatus === 'Out of Stock' && p.category !== 'Hardware').length, color: 'text-red-400' },
              { label: 'Action & RPG Catalog', value: products.filter(p => (((p.category as string) === 'Action' || (p.category as string) === 'RPG' || (p.category as string) === 'Games') && p.category !== 'Hardware')).length, color: 'text-green-400' }
            ]).map((item, id) => (
              <div key={id} className="p-4 bg-[#151619] rounded-xl border border-white/5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{item.label}</div>
                <div className={`text-sm font-black truncate ${item.color} mt-1`}>{item.value}</div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              <div className="relative flex-1 max-w-md w-full">
                <input 
                  type="text" 
                  placeholder={viewMode === 'hardware_inventory' ? "Quick lookup hardware catalog, model, subcategory..." : "Quick lookup title, platform, category..."}
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B0B0F] border border-white/10 rounded-xl text-xs text-white"
                />
                <Search className="absolute left-3 top-3 text-gray-500" size={14} />
              </div>

              <button 
                onClick={() => {
                  setProductToEdit(null);
                  setProductModalDefaultCategory(viewMode === 'hardware_inventory' ? 'Hardware' : 'Games');
                  setIsProductModalOpen(true);
                }}
                className="px-6 py-2.5 bg-[#00F0FF] text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus size={14} /> {viewMode === 'hardware_inventory' ? 'Create Hardware Piece' : 'Create Game Product'}
              </button>
            </div>

            {/* BULK PRODUCT OPERATIONS WORKBENCH */}
            {selectedProducts.length > 0 && (
              <div className="p-5 bg-[#6C5CE7]/10 rounded-2xl border border-[#6C5CE7]/20 space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="w-2.5 h-2.5 bg-[#00F0FF] rounded-full animate-pulse shadow-[0_0_10px_#00F0FF]"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    BULK OPERATIONS WORKBENCH — {selectedProducts.length} GAMES SELECTED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                  {/* Multiplying */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Bulk Pricing Multiplier</label>
                    <div className="flex gap-2">
                      <select 
                        value={bulkMultiplier}
                        onChange={e => setBulkMultiplier(e.target.value)}
                        className="py-1.5 px-3 bg-[#0B0B0F] border border-white/10 rounded-lg text-xs text-white"
                      >
                        <option value="1.05">+5% Premium</option>
                        <option value="1.10">+10% Premium</option>
                        <option value="1.20">+20% Core Spike</option>
                        <option value="0.90">-10% Discount</option>
                        <option value="0.80">-20% Massive Sale</option>
                      </select>
                      <button 
                        onClick={handleBulkApplyMultiplier}
                        className="px-4 py-1.5 bg-[#00F0FF] text-black font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-cyan-400"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Move Category */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Reassign Category</label>
                    <div className="flex gap-2">
                      <select 
                        value={bulkGameCategory}
                        onChange={e => setBulkGameCategory(e.target.value)}
                        className="py-1.5 px-3 bg-[#0B0B0F] border border-[#00F0FF]/15 rounded-lg text-xs text-white"
                      >
                        <option value="">Select Category</option>
                        <option value="Action">Action</option>
                        <option value="RPG">RPG</option>
                        <option value="Sports">Sports</option>
                        <option value="Indie">Indie</option>
                        <option value="Shooter">Shooter</option>
                        <option value="Adventure">Adventure</option>
                      </select>
                      <button 
                        onClick={handleBulkChangeCategory}
                        className="px-4 py-1.5 bg-[#00F0FF] text-black font-black uppercase text-[10px] tracking-widest rounded-lg"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Stock Levels */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Force Stock Status</label>
                    <div className="flex gap-2">
                      <select 
                        value={bulkGameStock}
                        onChange={e => setBulkGameStock(e.target.value)}
                        className="py-1.5 px-3 bg-[#0B0B0F] border border-white/15 rounded-lg text-xs text-white"
                      >
                        <option value="">Select Status</option>
                        <option value="In Stock">In Stock (Available)</option>
                        <option value="Low Stock">Low Stock Limits</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                      <button 
                        onClick={handleBulkChangeStock}
                        className="px-4 py-1.5 bg-[#00F0FF] text-black font-black uppercase text-[10px] tracking-widest rounded-lg"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MASTER CATALOG TABLE */}
          <div className="p-4 sm:p-6 bg-[#151619] rounded-[2rem] border border-white/5 overflow-hidden">
            
            {/* Desktop Table: Sizable, Clean layout for scanning on screens >= 768px */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                    <th className="py-4 pl-4 w-12">
                      <input 
                        type="checkbox"
                        checked={selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                        onChange={handleProductsSelectAll}
                        className="accent-[#00F0FF] cursor-pointer"
                      />
                    </th>
                    <th className="py-4 pl-2 min-w-[280px] w-[35%]">{viewMode === 'hardware_inventory' ? 'Hardware Item & Model' : 'Game Product Cover / Core Title'}</th>
                    <th className="py-4 w-[15%]">Classification</th>
                    {viewMode === 'hardware_inventory' ? (
                      <th className="py-4 text-center w-[15%]">Retail Price</th>
                    ) : (
                      <>
                        <th className="py-4 text-center w-[12%]">PS4 Primary</th>
                        <th className="py-4 text-center w-[12%]">PS5 Primary</th>
                        <th className="py-4 text-center w-[12%]">Secondary</th>
                      </>
                    )}
                    <th className="py-4 text-center w-[15%]">Stock Index</th>
                    <th className="py-4 pr-4 text-right w-[18%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]/80 transition-colors group">
                        <td className="py-5 pl-4">
                          <input 
                            type="checkbox"
                            checked={selectedProducts.includes(p.id)}
                            onChange={() => handleToggleProductSelection(p.id)}
                            className="accent-[#00F0FF] cursor-pointer"
                          />
                        </td>
                        
                        <td className="py-5 pl-2">
                          <div className="flex items-center gap-4">
                            <img 
                              src={p.imageUrl || "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=150"} 
                              alt={p.name} 
                              className="w-12 h-15 object-cover rounded-xl bg-[#0b0b0f] border border-white/10 shrink-0 shadow-lg"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 pr-2">
                              <div className="font-extrabold text-white text-[13px] md:text-sm tracking-tight leading-snug uppercase break-words hover:text-[#00F0FF] transition-colors" title={p.name}>
                                {p.name}
                              </div>
                              <div className="flex flex-wrap gap-1 items-center mt-1.5">
                                {viewMode === 'hardware_inventory' ? (
                                  <span className="text-[9px] text-[#00F0FF] uppercase font-black tracking-wider bg-[#00F0FF]/10 px-1.5 py-0.5 rounded">Specs Configured</span>
                                ) : (
                                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider bg-white/5 px-1.5 py-0.5 rounded">{p.platform} Platform</span>
                                )}
                                {p.featured && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[8px] font-black uppercase tracking-wider">
                                    ★ FEATURED
                                  </span>
                                )}
                                {p.isHidden && (
                                  <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[8px] font-black uppercase tracking-wider">
                                    Ø HIDDEN
                                  </span>
                                )}
                                {p.isArchived && (
                                  <span className="px-1.5 py-0.5 bg-purple-500/10 text-[#6C5CE7] rounded text-[8px] font-black uppercase tracking-wider">
                                    ■ ARCHIVED
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-5">
                          <span className="px-3 py-1.5 rounded-full bg-[#6C5CE7]/10 text-indigo-300 border border-[#6C5CE7]/20 text-[10px] font-black uppercase tracking-wider inline-block">
                            {viewMode === 'hardware_inventory' ? (p.subcategory || 'Hardware') : (p.category || 'Games')}
                          </span>
                        </td>

                        {viewMode === 'hardware_inventory' ? (
                          <td className="py-5 font-mono text-center">
                            <span className="inline-block px-3 py-1 bg-[#1A1C20] border border-white/5 rounded-lg text-xs font-bold text-[#00F0FF]">
                              {formatPrice(p.price || 0)}
                            </span>
                          </td>
                        ) : (
                          <>
                            <td className="py-5 font-mono text-center">
                              <span className="inline-block px-2.5 py-1 bg-[#1A1C20] border border-white/5 rounded-lg text-[11px] font-black text-green-400">
                                {formatPrice(p.pricePS4Primary || 0)}
                              </span>
                            </td>

                            <td className="py-5 font-mono text-center">
                              <span className="inline-block px-2.5 py-1 bg-[#1A1C20] border border-white/5 rounded-lg text-[11px] font-black text-[#00F0FF]">
                                {formatPrice(p.pricePS5Primary || 0)}
                              </span>
                            </td>

                            <td className="py-5 font-mono text-center">
                              <span className="inline-block px-2.5 py-1 bg-[#1A1C20] border border-white/5 rounded-lg text-[11px] font-black text-pink-400">
                                {formatPrice(p.priceSecondary || 0)}
                              </span>
                            </td>
                          </>
                        )}

                        <td className="py-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            p.stockStatus === 'In Stock' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            p.stockStatus === 'Low Stock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.stockStatus === 'In Stock' ? 'bg-green-400' :
                              p.stockStatus === 'Low Stock' ? 'bg-amber-400 animate-pulse' :
                              'bg-red-500'
                            }`} />
                            {p.stockStatus || 'In Stock'}
                          </span>
                        </td>

                        <td className="py-5 pr-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => handleToggleField(p, 'featured')}
                              className={`p-2 rounded-xl transition-all ${p.featured ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                              title={p.featured ? "Remove Featured Highlight" : "Highlight as Featured"}
                            >
                              <Sparkles size={14} />
                            </button>
                            <button 
                              onClick={() => handleToggleField(p, 'isHidden')}
                              className={`p-2 rounded-xl transition-all ${p.isHidden ? 'text-orange-400 bg-orange-400/10 border border-orange-400/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                              title={p.isHidden ? "Unhide Product from Shop" : "Hide Product from Shop"}
                            >
                              {p.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button 
                              onClick={() => handleToggleField(p, 'isArchived')}
                              className={`p-2 rounded-xl transition-all ${p.isArchived ? 'text-[#6C5CE7] bg-[#6C5CE7]/10 border border-[#6C5CE7]/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                              title={p.isArchived ? "Restore Game from Archive" : "Archive Game"}
                            >
                              <Archive size={14} />
                            </button>
                            <button 
                              onClick={() => handleDuplicateProduct(p)}
                              className="p-2 text-gray-400 hover:text-[#00F0FF] hover:bg-white/5 border border-transparent rounded-xl transition-all"
                              title="Duplicate Game"
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              onClick={() => handleTriggerEditProduct(p)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent rounded-xl transition-all"
                              title="Edit Game values"
                            >
                              <Edit2 size={14} />
                            </button>
                            {auth.currentUser?.email === 'zerolag0000@gmail.com' ? (
                              <button 
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/20 border border-transparent rounded-xl transition-all"
                                title="Purge Game (Perm)"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <span 
                                className="p-2 text-gray-600 cursor-not-allowed flex items-center justify-center opacity-30 border border-transparent" 
                                title="Deleting requires SUPER ADMIN privileges"
                              >
                                <div className="w-3.5 h-3.5 text-red-500">
                                  🔒
                                </div>
                              </span>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-500 text-xs uppercase tracking-widest">
                        Catalog empty or no matches found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Dynamic stacked cards optimized for finger touch and reading ergonomics */}
            <div className="md:hidden space-y-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <div key={p.id} className="bg-[#1A1C20]/80 rounded-2xl border border-white/5 p-4 space-y-4">
                    <div className="flex gap-4">
                      <div className="relative shrink-0">
                        <img 
                          src={p.imageUrl || "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=150"} 
                          alt={p.name} 
                          className="w-16 h-20 object-cover rounded-xl bg-[#0b0b0f] border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] text-[#00F0FF] uppercase tracking-wide font-black">
                            {p.platform || 'General'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            p.stockStatus === 'In Stock' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            p.stockStatus === 'Low Stock' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {p.stockStatus || 'In Stock'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-sm leading-snug uppercase break-words" title={p.name}>
                          {p.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5 items-center mt-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#6C5CE7]/10 text-indigo-300 border border-[#6C5CE7]/20 text-[8px] font-black uppercase">
                            {viewMode === 'hardware_inventory' ? (p.subcategory || 'Hardware') : (p.category || 'Games')}
                          </span>
                          {p.featured && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[8px] font-black uppercase">★ FEATURED</span>}
                          {p.isHidden && <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[8px] font-black uppercase">Ø HIDDEN</span>}
                          {p.isArchived && <span className="px-1.5 py-0.5 bg-purple-500/10 text-[#6C5CE7] rounded text-[8px] font-black uppercase">■ ARCHIVED</span>}
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/35 rounded-xl p-3 grid grid-cols-3 gap-2 border border-white/5 text-center">
                      {viewMode === 'hardware_inventory' ? (
                        <div className="col-span-3 text-center">
                          <span className="text-[8px] text-gray-500 block uppercase font-bold tracking-wider">Retail Price</span>
                          <span className="text-xs sm:text-sm font-mono font-black text-[#00F0FF]">{formatPrice(p.price || 0)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="border-r border-white/5 pr-1">
                            <span className="text-[8px] text-gray-500 block uppercase font-extrabold tracking-wider mb-0.5">PS4 Prim</span>
                            <span className="text-xs font-mono font-black text-green-400 block">{formatPrice(p.pricePS4Primary || 0)}</span>
                          </div>
                          <div className="border-r border-white/5 px-1">
                            <span className="text-[8px] text-gray-500 block uppercase font-extrabold tracking-wider mb-0.5">PS5 Prim</span>
                            <span className="text-xs font-mono font-black text-[#00F0FF] block">{formatPrice(p.pricePS5Primary || 0)}</span>
                          </div>
                          <div className="pl-1">
                            <span className="text-[8px] text-gray-500 block uppercase font-extrabold tracking-wider mb-0.5">PSN Sec</span>
                            <span className="text-xs font-mono font-black text-pink-400 block">{formatPrice(p.priceSecondary || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => handleToggleField(p, 'featured')}
                        className={`p-2.5 rounded-xl transition-all ${p.featured ? 'text-amber-400 bg-amber-400/15 border border-amber-400/25' : 'text-gray-400 bg-white/5 border border-transparent'}`}
                        title="Toggle Highlight"
                      >
                        <Sparkles size={15} />
                      </button>
                      <button 
                        onClick={() => handleToggleField(p, 'isHidden')}
                        className={`p-2.5 rounded-xl transition-all ${p.isHidden ? 'text-orange-400 bg-orange-400/15 border border-orange-400/25' : 'text-gray-400 bg-white/5 border border-transparent'}`}
                        title="Toggle Hidden status"
                      >
                        {p.isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button 
                        onClick={() => handleToggleField(p, 'isArchived')}
                        className={`p-2.5 rounded-xl transition-all ${p.isArchived ? 'text-[#6C5CE7] bg-[#6C5CE7]/15 border border-[#6C5CE7]/25' : 'text-gray-400 bg-white/5 border border-transparent'}`}
                        title="Toggle Archived status"
                      >
                        <Archive size={15} />
                      </button>
                      <button 
                        onClick={() => handleDuplicateProduct(p)}
                        className="p-2.5 text-gray-400 bg-white/5 hover:text-[#00F0FF] rounded-xl"
                        title="Clone Product"
                      >
                        <Copy size={15} />
                      </button>
                      <button 
                        onClick={() => handleTriggerEditProduct(p)}
                        className="p-2.5 text-gray-400 bg-white/5 hover:text-white rounded-xl"
                        title="Edit Details"
                      >
                        <Edit2 size={15} />
                      </button>
                      {auth.currentUser?.email === 'zerolag0000@gmail.com' ? (
                        <button 
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-2.5 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-xl"
                          title="Purge"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span className="p-2.5 text-gray-600 bg-white/5 opacity-40 cursor-not-allowed rounded-xl" title="Requires Super Admin">
                          <X size={15} />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs uppercase tracking-widest bg-[#1A1C20]/40 rounded-2xl border border-white/5">
                  No matches discovered
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- ADD/EDIT DIGITAL TERMINAL FORM OVERLAY --- */}
      {isAccountModalOpen && (
        <AccountFormModal
          account={accountToEdit}
          products={products}
          onClose={() => {
            setIsAccountModalOpen(false);
            setAccountToEdit(null);
          }}
          onSave={(resolvedAccount, editingId) => {
            if (editingId) {
              onEditAccount(editingId, resolvedAccount);
              showToast('Digital account terminal modified in DB');
              onLogActivity('Modified', 'Digital Account', `Altered console credentials: ${resolvedAccount.email}`);
            } else {
              onAddAccount(resolvedAccount);
              showToast('New digital account initialized');
              onLogActivity('Created', 'Digital Account', `Injected credentials database: ${resolvedAccount.email}`);
            }
            setIsAccountModalOpen(false);
            setAccountToEdit(null);
          }}
          showToast={showToast}
        />
      )}

      {/* --- ADD/EDIT GAME PRODUCT FORM OVERLAY --- */}
      {isProductModalOpen && (
        <ProductFormModal
          product={productToEdit}
          defaultCategory={productModalDefaultCategory}
          onClose={() => {
            setIsProductModalOpen(false);
            setProductToEdit(null);
          }}
          onSaveSuccess={() => {
            setIsProductModalOpen(false);
            setProductToEdit(null);
            onRefreshData();
          }}
          showToast={showToast}
          onLogActivity={onLogActivity}
        />
      )}

      {/* --- RECOVERY SAFETY CONFIRMATION DELETE DROPDOWN OVERLAY (SOFT VS PERMANENT DELETE) --- */}
      {deleteProductTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#151619] border border-[#ffffff15] rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 space-y-5 sm:space-y-6"
          >
            <div className="flex items-center gap-3 text-red-500 border-b border-white/5 pb-4">
              <AlertTriangle size={24} className="animate-pulse" />
              <h3 className="text-base font-black uppercase tracking-tight">CONFIRM PURGE DIRECTIVE</h3>
            </div>
            <p className="text-xs text-gray-400 font-semibold uppercase leading-relaxed">
              YOU ARE SECURELY ATTEMPTING TO DELETE INVENTORY LEVEL GAME <span className="text-[#00F0FF] font-black">"{deleteProductTarget.name}"</span>. 
              THIS WILL PERMANENTLY REMOVE THE GAME FROM THE FIRESTORE CATALOG AND ACCORDINGLY ERASE ALL OF ITS IMAGE MEDIA FROM FIREBASE STORAGE.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    console.log("[DELETE SERVICE] Starting permanent catalog purge for: ", deleteProductTarget.name);
                    const pData = products.find(p => p.id === deleteProductTarget.id);
                    
                    // Delete from Firestore
                    await deleteDoc(doc(db, 'products', deleteProductTarget.id));
                    console.log("[DELETE SERVICE] Firestore document deleted successfully.");
                    
                    showToast("SUCCESS: Changes saved successfully.");
                    onLogActivity('Permanent Delete Game', 'Catalog', `Permanently purged game product title: ${deleteProductTarget.name}`);
                    setDeleteProductTarget(null);
                    onRefreshData();

                    // Clean up associated media files in Storage
                    if (pData) {
                      if (pData.imageUrl) {
                        console.log("[DELETE SERVICE] Deleting product main image: ", pData.imageUrl);
                        await deleteImageHelper(pData.imageUrl);
                      }
                      if (Array.isArray(pData.galleryImages)) {
                        for (const url of pData.galleryImages) {
                          if (url) {
                            console.log("[DELETE SERVICE] Deleting gallery image: ", url);
                            await deleteImageHelper(url);
                          }
                        }
                      }
                    }
                  } catch (err: any) {
                    console.error("[DELETE SERVICE] ERROR during product deletion: ", err);
                    showToast(`ERROR: ${err?.message || err}`);
                  }
                }}
                className="w-full py-3 bg-red-650/10 border border-red-650/25 text-red-500 font-black uppercase text-xs rounded-xl hover:bg-red-600 hover:text-white transition-all cursor-pointer"
              >
                Confirm Destructive Purge
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDeleteProductTarget(null)}
              className="w-full py-3 bg-white/5 text-gray-400 font-extrabold uppercase text-xs rounded-xl hover:bg-white/10 cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      {/* --- CSV IMPORT DIALOG CORE --- */}
      {showImportDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0B0B0F]/90 backdrop-blur-md animate-fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#151619] border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 space-y-5 sm:space-y-6"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-[#00F0FF]">CSV IMPORT TERMINALS MATRIX</h2>
              <button onClick={() => setShowImportDialog(false)} className="text-gray-400 hover:text-white font-extrabold text-xs">CANCEL</button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-[#00F0FF]/15 border border-[#00F0FF]/20 rounded-xl text-xs text-[#00F0FF] leading-relaxed uppercase font-black">
                Header Row format guide:
                <div className="font-mono text-[10px] select-all bg-black/60 p-2 rounded border border-white/10 mt-2 text-white lowercase">
                  email,password,productId,region,recoveryEmail,recoveryPhone
                </div>
              </div>

              <textarea 
                rows={6}
                value={importCsvText}
                onChange={e => setImportCsvText(e.target.value)}
                placeholder="psnmail@yahoo.com,pass123,prodId,EG,recovery@mail.com,+201211..."
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl p-4 font-mono text-xs text-white"
              />

              <button 
                onClick={handleCsvImport}
                className="w-full py-4 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-widest rounded-xl"
              >
                LAUNCH SYNTHESIZER IMPORT
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
