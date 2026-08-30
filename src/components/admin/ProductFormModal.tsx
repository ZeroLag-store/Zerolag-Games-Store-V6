import React, { useState } from 'react';
import { 
  X, Save, UploadCloud, Plus, Trash2, ArrowLeft, ArrowRight, 
  Gamepad, Gamepad2, Monitor, Layers 
} from 'lucide-react';
import { collection, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Product } from '../../types';
import { useAuth } from '../../App';
import { motion } from 'framer-motion';
import { uploadMedia } from '../../lib/storageHelper';
import { normalizeProductConfig } from '../../lib/productNormalizer';
import { safeAddDoc, safeUpdateDoc, cleanFirestoreData } from '../../lib/firestoreUtils';

interface ProductFormModalProps {
  product: Product | null; // null if creating new
  defaultCategory?: string;
  onClose: () => void;
  onSaveSuccess: (productName: string, isEdit: boolean) => void;
  showToast: (msg: string) => void;
  onLogActivity: (action: string, entity: string, details: string) => void;
}

export default function ProductFormModal({
  product,
  defaultCategory = 'Games',
  onClose,
  onSaveSuccess,
  showToast,
  onLogActivity
}: ProductFormModalProps) {
  const { taxonomies } = useAuth();
  const editingProductId = product?.id || null;

  // Initialize form state once from product prop
  const [formProduct, setFormProduct] = useState(() => {
    if (product) {
      const norm = normalizeProductConfig(product);
      return {
        name: product.name || '',
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        platform: product.platform || 'PS5',
        category: product.category || 'Games',
        genre: product.genre || '',
        tags: product.tags || [],
        discount: product.discount || 0,
        stockStatus: product.stockStatus || 'In Stock',
        imageUrl: product.imageUrl || '',
        galleryImages: product.galleryImages || [],
        featured: !!product.featured,
        trending: !!product.trending,
        recommended: !!product.recommended,
        subcategory: product.subcategory || '',
        price: product.price || 0,
        platformsConfig: norm.gameConfig,
        topUpPackages: norm.topUpPackages || [],
        subscriptionPlans: norm.subscriptionPlans || [],
        hardwareConfig: {
          condition: (norm.hardwareConfig?.condition || 'New') as 'New' | 'Open Box' | 'Refurbished',
          warranty: norm.hardwareConfig?.warranty || '1 Year Official Agency Warranty',
          specs: norm.hardwareConfig?.specs || '',
          stock: norm.hardwareConfig?.stock ?? 10,
          price: norm.hardwareConfig?.price ?? (product.price || 0)
        },
        pricePS4Primary: product.pricePS4Primary || 0,
        pricePS5Primary: product.pricePS5Primary || 0,
        priceSecondary: product.priceSecondary || 0,
        ps4PrimaryStock: product.ps4PrimaryStock || 0,
        ps5PrimaryStock: product.ps5PrimaryStock || 0,
        secondaryStock: product.secondaryStock || 0
      };
    }

    const isHardware = defaultCategory === 'Hardware';
    return {
      name: '',
      description: '',
      shortDescription: '',
      platform: isHardware ? 'Physical' : 'PS5',
      category: defaultCategory,
      genre: '',
      tags: [] as string[],
      discount: 0,
      pricePS4Primary: 0,
      pricePS5Primary: 0,
      priceSecondary: 0,
      ps4PrimaryStock: 0,
      ps5PrimaryStock: 0,
      secondaryStock: 0,
      stockStatus: 'In Stock',
      imageUrl: '',
      galleryImages: [] as string[],
      featured: false,
      trending: false,
      recommended: false,
      subcategory: '',
      price: 0,
      platformsConfig: {
        playstation: {
          enabled: !isHardware,
          ps5: {
            enabled: !isHardware,
            primary: { enabled: !isHardware, price: 0, stock: 999 },
            secondary: { enabled: !isHardware, price: 0, stock: 999 }
          },
          ps4: {
            enabled: !isHardware,
            primary: { enabled: !isHardware, price: 0, stock: 999 },
            secondary: { enabled: !isHardware, price: 0, stock: 999 }
          }
        },
        pc: {
          enabled: false,
          editions: [] as Array<{ id: string; name: string; price: number; stock: number; region?: string; type?: string }>
        },
        xbox: {
          enabled: false,
          editions: [] as Array<{ id: string; name: string; price: number; stock: number; generation?: string; type?: string }>
        }
      },
      topUpPackages: [] as Array<{ id: string; name: string; price: number; bonus?: string; stock?: number; region?: string }>,
      subscriptionPlans: [] as Array<{ id: string; name: string; duration: string; price: number; stock: number; region?: string }>,
      hardwareConfig: {
        condition: 'New' as 'New' | 'Open Box' | 'Refurbished',
        warranty: '1 Year Official Agency Warranty',
        specs: '',
        stock: 10,
        price: 0
      }
    };
  });

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);
  const [galleryProgress, setGalleryProgress] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [saveProductError, setSaveProductError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.name.trim()) {
      showToast('Game/Product title is required');
      return;
    }

    setIsSavingProduct(true);
    setSaveProductError(null);

    try {
      const rawCat = formProduct.category || 'Games';
      const isHardware = rawCat === 'Hardware';
      const isTopUp = rawCat === 'Top Up' || rawCat === 'Gift Cards';
      const isSubscription = rawCat === 'Subscriptions' || rawCat === 'Subscription';

      // 1. Calculate prices & stock across all configured platforms/variants
      const psConfig = formProduct.platformsConfig.playstation;
      const pcConfig = formProduct.platformsConfig.pc;
      const xboxConfig = formProduct.platformsConfig.xbox;

      const ps4PrimPrice = (psConfig.enabled && psConfig.ps4.enabled && psConfig.ps4.primary.enabled) ? Number(psConfig.ps4.primary.price) : 0;
      const ps5PrimPrice = (psConfig.enabled && psConfig.ps5.enabled && psConfig.ps5.primary.enabled) ? Number(psConfig.ps5.primary.price) : 0;
      const ps4SecPrice = (psConfig.enabled && psConfig.ps4.enabled && psConfig.ps4.secondary.enabled) ? Number(psConfig.ps4.secondary.price) : 0;
      const ps5SecPrice = (psConfig.enabled && psConfig.ps5.enabled && psConfig.ps5.secondary.enabled) ? Number(psConfig.ps5.secondary.price) : 0;
      const secondaryPrice = ps5SecPrice > 0 ? ps5SecPrice : ps4SecPrice;

      const ps4PrimStock = (psConfig.enabled && psConfig.ps4.enabled && psConfig.ps4.primary.enabled) ? Number(psConfig.ps4.primary.stock) : 0;
      const ps5PrimStock = (psConfig.enabled && psConfig.ps5.enabled && psConfig.ps5.primary.enabled) ? Number(psConfig.ps5.primary.stock) : 0;
      const ps4SecStock = (psConfig.enabled && psConfig.ps4.enabled && psConfig.ps4.secondary.enabled) ? Number(psConfig.ps4.secondary.stock) : 0;
      const ps5SecStock = (psConfig.enabled && psConfig.ps5.enabled && psConfig.ps5.secondary.enabled) ? Number(psConfig.ps5.secondary.stock) : 0;
      const secStock = ps5SecStock > 0 ? ps5SecStock : ps4SecStock;

      // Collect all possible variant prices to find base catalog price
      const allPrices: number[] = [];
      if (ps4PrimPrice > 0) allPrices.push(ps4PrimPrice);
      if (ps5PrimPrice > 0) allPrices.push(ps5PrimPrice);
      if (secondaryPrice > 0) allPrices.push(secondaryPrice);
      if (pcConfig.enabled) {
        pcConfig.editions.forEach(ed => {
          if (ed.price > 0) allPrices.push(Number(ed.price));
        });
      }
      if (xboxConfig.enabled) {
        xboxConfig.editions.forEach(ed => {
          if (ed.price > 0) allPrices.push(Number(ed.price));
        });
      }
      if (formProduct.topUpPackages.length > 0) {
        formProduct.topUpPackages.forEach(p => {
          if (p.price > 0) allPrices.push(Number(p.price));
        });
      }
      if (formProduct.subscriptionPlans.length > 0) {
        formProduct.subscriptionPlans.forEach(s => {
          if (s.price > 0) allPrices.push(Number(s.price));
        });
      }
      if (isHardware && formProduct.hardwareConfig.price > 0) {
        allPrices.push(Number(formProduct.hardwareConfig.price));
      }

      let computedBasePrice = allPrices.length > 0 ? Math.min(...allPrices) : (Number(formProduct.price) || 0);

      // Determine platform string
      let activePlatformName = formProduct.platform || 'PS5';
      if (isHardware) {
        activePlatformName = 'Hardware';
      } else if (isTopUp) {
        activePlatformName = 'Top Up';
      } else if (isSubscription) {
        activePlatformName = 'Subscription';
      } else {
        const activePlatformsList: string[] = [];
        if (psConfig.enabled) activePlatformsList.push('PlayStation');
        if (pcConfig.enabled) activePlatformsList.push('PC');
        if (xboxConfig.enabled) activePlatformsList.push('Xbox');
        if (activePlatformsList.length > 0) {
          activePlatformName = activePlatformsList.join(' / ');
        }
      }

      // Stock status resolution
      let totalVariantStock = 0;
      if (isHardware) {
        totalVariantStock = Number(formProduct.hardwareConfig.stock) || 0;
      } else if (isTopUp) {
        totalVariantStock = formProduct.topUpPackages.reduce((acc, p) => acc + (p.stock || 999), 0);
      } else if (isSubscription) {
        totalVariantStock = formProduct.subscriptionPlans.reduce((acc, s) => acc + (s.stock || 10), 0);
      } else {
        totalVariantStock = ps4PrimStock + ps5PrimStock + ps4SecStock + ps5SecStock;
        if (pcConfig.enabled) {
          totalVariantStock += pcConfig.editions.reduce((acc, ed) => acc + (ed.stock || 0), 0);
        }
        if (xboxConfig.enabled) {
          totalVariantStock += xboxConfig.editions.reduce((acc, ed) => acc + (ed.stock || 0), 0);
        }
      }

      let resolvedStockStatus = formProduct.stockStatus;
      if (totalVariantStock <= 0) {
        resolvedStockStatus = 'Out of Stock';
      } else if (resolvedStockStatus === 'Out of Stock' && totalVariantStock > 0) {
        resolvedStockStatus = 'In Stock';
      }

      const rawPayload: any = {
        name: formProduct.name.trim(),
        description: formProduct.description || '',
        shortDescription: formProduct.shortDescription || '',
        platform: activePlatformName,
        category: formProduct.category,
        genre: formProduct.genre || '',
        tags: formProduct.tags || [],
        discount: Number(formProduct.discount) || 0,
        price: computedBasePrice,
        stockStatus: resolvedStockStatus,
        imageUrl: formProduct.imageUrl || "https://images.unsplash.com/photo-1627856013091-fed6e4e30025?q=80&w=400",
        galleryImages: formProduct.galleryImages || [],
        featured: !!formProduct.featured,
        trending: !!formProduct.trending,
        recommended: !!formProduct.recommended,
        isDeleted: false,
        updatedAt: new Date().toISOString()
      };

      if (!editingProductId) {
        rawPayload.createdAt = new Date().toISOString();
      }

      // Category-specific structured configurations
      if (isHardware) {
        rawPayload.subcategory = formProduct.subcategory || '';
        rawPayload.hardwareConfig = {
          condition: formProduct.hardwareConfig?.condition || 'New',
          warranty: formProduct.hardwareConfig?.warranty || '1 Year Official Agency Warranty',
          specs: formProduct.hardwareConfig?.specs || '',
          stock: Number(formProduct.hardwareConfig?.stock) || 0,
          price: Number(formProduct.hardwareConfig?.price) || computedBasePrice
        };
        rawPayload.ps4PrimaryStock = Number(formProduct.hardwareConfig?.stock) || 0;
        rawPayload.slotsAvailable = Number(formProduct.hardwareConfig?.stock) || 0;
      } else if (isTopUp) {
        rawPayload.topUpPackages = formProduct.topUpPackages || [];
        rawPayload.slotsAvailable = totalVariantStock;
      } else if (isSubscription) {
        rawPayload.subscriptionPlans = formProduct.subscriptionPlans || [];
        rawPayload.slotsAvailable = totalVariantStock;
      } else {
        // Game Catalog
        rawPayload.platformsConfig = formProduct.platformsConfig;
        rawPayload.pricePS4Primary = ps4PrimPrice;
        rawPayload.pricePS5Primary = ps5PrimPrice;
        rawPayload.priceSecondary = secondaryPrice;
        rawPayload.ps4PrimaryStock = ps4PrimStock;
        rawPayload.ps5PrimaryStock = ps5PrimStock;
        rawPayload.secondaryStock = secStock;
        rawPayload.slotsAvailable = totalVariantStock;
      }

      const payload = cleanFirestoreData(rawPayload);

      if (editingProductId) {
        await safeUpdateDoc(doc(db, 'products', editingProductId), payload);
        showToast("SUCCESS: Changes saved successfully.");
        onLogActivity('Edit Game', 'Catalog', `Altered product metadata: ${formProduct.name}`);
        onSaveSuccess(formProduct.name, true);
      } else {
        await safeAddDoc(collection(db, 'products'), payload);
        showToast("SUCCESS: Changes saved successfully.");
        onLogActivity('Create Game', 'Catalog', `Listed new platform master catalog: ${formProduct.name}`);
        onSaveSuccess(formProduct.name, false);
      }
    } catch (err: any) {
      console.error(err);
      const errMessage = err?.message || String(err);
      setSaveProductError(`FIRESTORE WRITE ERROR: ${errMessage}`);
      if (editingProductId) {
        handleFirestoreError(err, OperationType.UPDATE, `products/${editingProductId}`);
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'products');
      }
    } finally {
      setIsSavingProduct(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0B0B0F]/95 backdrop-blur-md animate-fade-in overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-[#151619] border border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 space-y-5 sm:space-y-6 my-4 sm:my-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-[#00F0FF]">
            {editingProductId ? 'EDIT MASTER PRODUCT CATALOG' : 'REGISTER NEW PRODUCT'}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-white font-black text-xs uppercase tracking-wider"
          >
            CANCEL
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Row 1: Title & Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Official Game Title</label>
              <input 
                type="text" 
                required 
                value={formProduct.name} 
                onChange={e => setFormProduct(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Grand Theft Auto VI"
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white uppercase font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Platform Device</label>
              {formProduct.category === 'Hardware' ? (
                <input 
                  type="text"
                  disabled
                  value="Physical Gear / Accessories"
                  className="w-full bg-[#0B0B0F]/50 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-gray-400 font-mono"
                />
              ) : (
                <select 
                  value={formProduct.platform}
                  onChange={e => setFormProduct(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white"
                >
                  {((taxonomies?.platforms && taxonomies.platforms.length > 0)
                    ? taxonomies.platforms.filter((p: any) => !p.isHidden)
                    : [
                        { id: 'PS5', name: 'PlayStation 5' },
                        { id: 'PS4', name: 'PlayStation 4' },
                        { id: 'Switch', name: 'Nintendo Switch' },
                        { id: 'PC', name: 'Steam / PC' },
                        { id: 'Xbox', name: 'Xbox Series X/S' }
                      ]
                  ).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Row 2: Category, Genre & Stock Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Product Category Class</label>
              <select 
                value={formProduct.category}
                onChange={e => setFormProduct(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white"
              >
                {((taxonomies?.categories && taxonomies.categories.length > 0)
                  ? taxonomies.categories.filter((c: any) => !c.isHidden)
                  : [
                      { id: 'Games', name: 'Games' },
                      { id: 'Subscriptions', name: 'Subscriptions' },
                      { id: 'Gift Cards', name: 'Gift Cards' },
                      { id: 'Top Up', name: 'Top Up' },
                      { id: 'Hardware', name: 'Hardware' },
                      { id: 'Services', name: 'Services' }
                    ]
                ).map((c: any) => (
                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            {formProduct.category === 'Hardware' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Hardware Subcategory</label>
                <select 
                  value={formProduct.subcategory}
                  onChange={e => setFormProduct(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full bg-[#0B0B0F] border border-[#00F0FF]/30 rounded-xl py-2.5 px-3 text-xs text-white shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                >
                  <option value="">Select subcategory...</option>
                  {(taxonomies?.categories?.find((c: any) => c.id === 'hardware' || c.name === 'Hardware')?.subcategories || [
                    'Mouse', 'Keyboard', 'Headset', 'Mouse Pad', 'Controller', 'Microphone', 'Webcam', 'Gaming Chair', 'Desk', 'Monitor', 'SSD', 'HDD', 'RAM', 'GPU', 'CPU', 'Motherboard', 'Power Supply', 'Cooling', 'Laptop', 'Accessories'
                  ]).map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Sub-genre</label>
                <input 
                  type="text"
                  value={formProduct.genre || ''}
                  onChange={e => setFormProduct(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="Open World, Action"
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Inventory Stock Status</label>
              <select 
                value={formProduct.stockStatus}
                onChange={e => setFormProduct(prev => ({ ...prev, stockStatus: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white"
              >
                <option value="In Stock">In Stock (Normal)</option>
                <option value="Low Stock">Low Stock Limits</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Row 3: Descriptions */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Short Catchy Teaser Description (Short Synopsis)</label>
              <input 
                type="text"
                value={formProduct.shortDescription || ''}
                onChange={e => setFormProduct(prev => ({ ...prev, shortDescription: e.target.value }))}
                placeholder="Enter short tagline of the game..."
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Extended Long Synopsis Details</label>
              <textarea 
                value={formProduct.description || ''} 
                onChange={e => setFormProduct(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white leading-relaxed"
                rows={2}
                placeholder="Provide full details, editions specifications, legal terms..."
              />
            </div>
          </div>

          {/* Row 4: Client Pricing Matrix */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Discount % (Optional)</label>
              <input 
                type="number"
                value={formProduct.discount || ''}
                onChange={e => setFormProduct(prev => ({ ...prev, discount: Number(e.target.value) || 0 }))}
                placeholder="Discount % (e.g. 10)"
                className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs font-mono text-cyan-400"
              />
            </div>
          </div>

          {/* Row 5: Dynamic Category-Specific Pricing & Platform Matrix */}
          {formProduct.category === 'Hardware' ? (
            <div className="p-4 bg-cyan-500/[0.03] border border-cyan-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest block font-bold flex items-center gap-2">
                  <Layers size={14} /> PHYSICAL HARDWARE SPECIFICATION & INVENTORY
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Condition</label>
                  <select
                    value={formProduct.hardwareConfig.condition}
                    onChange={e => setFormProduct(prev => ({
                      ...prev,
                      hardwareConfig: { ...prev.hardwareConfig, condition: e.target.value as any }
                    }))}
                    className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="New">Brand New (Sealed)</option>
                    <option value="Open Box">Open Box</option>
                    <option value="Refurbished">Refurbished / Certified</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Warranty Terms</label>
                  <input
                    type="text"
                    value={formProduct.hardwareConfig.warranty || ''}
                    onChange={e => setFormProduct(prev => ({
                      ...prev,
                      hardwareConfig: { ...prev.hardwareConfig, warranty: e.target.value }
                    }))}
                    placeholder="e.g. 1 Year Official Agency Warranty"
                    className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Retail Sales Price (EGP)</label>
                  <input 
                    type="number"
                    value={formProduct.hardwareConfig.price || ''}
                    onChange={e => {
                      const val = Number(e.target.value) || 0;
                      setFormProduct(prev => ({
                        ...prev,
                        price: val,
                        hardwareConfig: { ...prev.hardwareConfig, price: val }
                      }));
                    }}
                    placeholder="Retail price..."
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-xl p-2.5 text-xs font-mono text-[#00F0FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Physical Stock Units Available</label>
                  <input 
                    type="number"
                    value={formProduct.hardwareConfig.stock || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormProduct(prev => ({
                        ...prev,
                        ps4PrimaryStock: val,
                        stockStatus: val > 0 ? 'In Stock' : 'Out of Stock',
                        hardwareConfig: { ...prev.hardwareConfig, stock: val }
                      }));
                    }}
                    placeholder="e.g., 5"
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-xl p-2.5 text-xs font-mono text-[#00F0FF]"
                  />
                </div>
              </div>
            </div>
          ) : (formProduct.category === 'Top Up' || formProduct.category === 'Gift Cards') ? (
            <div className="p-4 bg-cyan-500/[0.03] border border-cyan-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#00F0FF] tracking-widest block font-bold">TOP-UP PACKAGES & DENOMINATIONS</span>
                  <span className="text-[10px] text-gray-500">Configure denomination cards for customer in-game recharges</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPkg = {
                      id: `pkg_${Date.now()}`,
                      name: '1,000 Points / Coins',
                      price: 250,
                      bonus: 'Instant Delivery',
                      stock: 999,
                      region: 'Global'
                    };
                    setFormProduct(prev => ({
                      ...prev,
                      topUpPackages: [...prev.topUpPackages, newPkg]
                    }));
                  }}
                  className="px-3 py-1.5 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black border border-[#00F0FF]/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                >
                  <Plus size={12} /> Add Package
                </button>
              </div>

              {formProduct.topUpPackages.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl space-y-2">
                  <p className="text-xs text-gray-400">No Top-Up packages added yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const initialPackages = [
                        { id: `pkg_${Date.now()}_1`, name: '500 Points / Coins', price: 150, bonus: '', stock: 999, region: 'Global' },
                        { id: `pkg_${Date.now()}_2`, name: '1,050 Points / Coins', price: 290, bonus: '+50 Bonus', stock: 999, region: 'Global' },
                        { id: `pkg_${Date.now()}_3`, name: '2,200 Points / Coins', price: 580, bonus: '+200 Bonus', stock: 999, region: 'Global' }
                      ];
                      setFormProduct(prev => ({ ...prev, topUpPackages: initialPackages }));
                    }}
                    className="text-[10px] text-[#00F0FF] font-bold uppercase underline"
                  >
                    Add Default Denomination Presets
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formProduct.topUpPackages.map((pkg, pIdx) => (
                    <div key={pkg.id || pIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-500">Package Name</label>
                        <input 
                          type="text"
                          value={pkg.name}
                          onChange={e => {
                            const updated = [...formProduct.topUpPackages];
                            updated[pIdx].name = e.target.value;
                            setFormProduct(prev => ({ ...prev, topUpPackages: updated }));
                          }}
                          placeholder="e.g. 1000 FIFA Points"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-500">Price (EGP)</label>
                        <input 
                          type="number"
                          value={pkg.price || ''}
                          onChange={e => {
                            const updated = [...formProduct.topUpPackages];
                            updated[pIdx].price = Number(e.target.value) || 0;
                            setFormProduct(prev => ({ ...prev, topUpPackages: updated }));
                          }}
                          placeholder="EGP Price"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs font-mono text-[#00F0FF]"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-500">Badge / Bonus</label>
                        <input 
                          type="text"
                          value={pkg.bonus || ''}
                          onChange={e => {
                            const updated = [...formProduct.topUpPackages];
                            updated[pIdx].bonus = e.target.value;
                            setFormProduct(prev => ({ ...prev, topUpPackages: updated }));
                          }}
                          placeholder="e.g. +100 Extra"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs text-emerald-400"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 sm:pt-0">
                        <input
                          type="number"
                          value={pkg.stock ?? 999}
                          onChange={e => {
                            const updated = [...formProduct.topUpPackages];
                            updated[pIdx].stock = Number(e.target.value) || 0;
                            setFormProduct(prev => ({ ...prev, topUpPackages: updated }));
                          }}
                          placeholder="Stock"
                          title="Available stock"
                          className="w-16 bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs font-mono text-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formProduct.topUpPackages.filter((_, idx) => idx !== pIdx);
                            setFormProduct(prev => ({ ...prev, topUpPackages: updated }));
                          }}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : formProduct.category === 'Subscriptions' ? (
            <div className="p-4 bg-purple-500/[0.03] border border-purple-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block font-bold">SUBSCRIPTION PLANS & DURATIONS</span>
                  <span className="text-[10px] text-gray-500">Configure monthly / quarterly / annual subscription options</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPlan = {
                      id: `sub_${Date.now()}`,
                      name: '1 Month Membership',
                      duration: '1 Month',
                      price: 200,
                      stock: 999,
                      region: 'Global'
                    };
                    setFormProduct(prev => ({
                      ...prev,
                      subscriptionPlans: [...prev.subscriptionPlans, newPlan]
                    }));
                  }}
                  className="px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                >
                  <Plus size={12} /> Add Duration Plan
                </button>
              </div>

              {formProduct.subscriptionPlans.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl space-y-2">
                  <p className="text-xs text-gray-400">No subscription plans added yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const initialPlans = [
                        { id: `sub_${Date.now()}_1`, name: '1 Month Plan', duration: '1 Month', price: 220, stock: 999, region: 'Global' },
                        { id: `sub_${Date.now()}_2`, name: '3 Months Plan', duration: '3 Months', price: 580, stock: 999, region: 'Global' },
                        { id: `sub_${Date.now()}_3`, name: '12 Months Plan', duration: '12 Months', price: 1850, stock: 999, region: 'Global' }
                      ];
                      setFormProduct(prev => ({ ...prev, subscriptionPlans: initialPlans }));
                    }}
                    className="text-[10px] text-purple-400 font-bold uppercase underline"
                  >
                    Add Standard 1M / 3M / 12M Plans
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formProduct.subscriptionPlans.map((plan, sIdx) => (
                    <div key={plan.id || sIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 items-center">
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-500">Plan Title</label>
                        <input 
                          type="text"
                          value={plan.name}
                          onChange={e => {
                            const updated = [...formProduct.subscriptionPlans];
                            updated[sIdx].name = e.target.value;
                            setFormProduct(prev => ({ ...prev, subscriptionPlans: updated }));
                          }}
                          placeholder="e.g. PlayStation Plus Deluxe 12M"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-500">Duration Tag</label>
                        <input 
                          type="text"
                          value={plan.duration}
                          onChange={e => {
                            const updated = [...formProduct.subscriptionPlans];
                            updated[sIdx].duration = e.target.value;
                            setFormProduct(prev => ({ ...prev, subscriptionPlans: updated }));
                          }}
                          placeholder="1 Month, 12 Months"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs text-purple-300"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-500">Price (EGP)</label>
                        <input 
                          type="number"
                          value={plan.price || ''}
                          onChange={e => {
                            const updated = [...formProduct.subscriptionPlans];
                            updated[sIdx].price = Number(e.target.value) || 0;
                            setFormProduct(prev => ({ ...prev, subscriptionPlans: updated }));
                          }}
                          placeholder="EGP"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs font-mono text-purple-300"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 sm:pt-0">
                        <input
                          type="number"
                          value={plan.stock ?? 999}
                          onChange={e => {
                            const updated = [...formProduct.subscriptionPlans];
                            updated[sIdx].stock = Number(e.target.value) || 0;
                            setFormProduct(prev => ({ ...prev, subscriptionPlans: updated }));
                          }}
                          placeholder="Stock"
                          title="Available stock"
                          className="w-16 bg-[#0B0B0F] border border-white/10 rounded-lg p-1.5 text-xs font-mono text-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formProduct.subscriptionPlans.filter((_, idx) => idx !== sIdx);
                            setFormProduct(prev => ({ ...prev, subscriptionPlans: updated }));
                          }}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* GAME PRODUCT: MULTI-PLATFORM & GENERATION CONFIGURATION */
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase text-[#00F0FF] tracking-wider block">
                    GAME PLATFORMS & GENERATIONS CONFIGURATION
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Configure PlayStation, PC, and Xbox platforms inside this single game product
                  </span>
                </div>
              </div>

              {/* 1. PLAYSTATION PLATFORM */}
              <div className={`p-4 rounded-2xl border transition-all ${
                formProduct.platformsConfig.playstation.enabled
                  ? 'bg-blue-500/[0.04] border-blue-500/30'
                  : 'bg-white/[0.02] border-white/10 opacity-70'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formProduct.platformsConfig.playstation.enabled}
                      onChange={e => setFormProduct(prev => ({
                        ...prev,
                        platformsConfig: {
                          ...prev.platformsConfig,
                          playstation: {
                            ...prev.platformsConfig.playstation,
                            enabled: e.target.checked
                          }
                        }
                      }))}
                      className="w-4 h-4 rounded text-blue-500 focus:ring-0 focus:outline-none bg-black/60 border-white/20"
                    />
                    <div className="flex items-center gap-2">
                      <Gamepad size={16} className="text-blue-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        PlayStation Platform
                      </span>
                    </div>
                  </label>
                  <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">
                    {formProduct.platformsConfig.playstation.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {formProduct.platformsConfig.playstation.enabled && (
                  <div className="space-y-4 pt-4">
                    {/* PS5 Generation */}
                    <div className="p-3.5 bg-black/40 border border-blue-500/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formProduct.platformsConfig.playstation.ps5.enabled}
                            onChange={e => setFormProduct(prev => ({
                              ...prev,
                              platformsConfig: {
                                ...prev.platformsConfig,
                                playstation: {
                                  ...prev.platformsConfig.playstation,
                                  ps5: {
                                    ...prev.platformsConfig.playstation.ps5,
                                    enabled: e.target.checked
                                  }
                                }
                              }
                            }))}
                            className="w-3.5 h-3.5 rounded text-blue-400 bg-black/60 border-white/20"
                          />
                          <span className="text-xs font-black uppercase text-blue-300">
                            PlayStation 5 (PS5) Generation
                          </span>
                        </label>
                      </div>

                      {formProduct.platformsConfig.playstation.ps5.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* PS5 Primary */}
                          <div className="p-2.5 bg-blue-500/[0.05] border border-blue-500/20 rounded-lg space-y-2">
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-[10px] font-black uppercase text-[#00F0FF]">PS5 Primary Slot</span>
                              <input
                                type="checkbox"
                                checked={formProduct.platformsConfig.playstation.ps5.primary.enabled}
                                onChange={e => setFormProduct(prev => ({
                                  ...prev,
                                  platformsConfig: {
                                    ...prev.platformsConfig,
                                    playstation: {
                                      ...prev.platformsConfig.playstation,
                                      ps5: {
                                        ...prev.platformsConfig.playstation.ps5,
                                        primary: {
                                          ...prev.platformsConfig.playstation.ps5.primary,
                                          enabled: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                }))}
                                className="w-3 h-3 rounded text-cyan-400 bg-black"
                              />
                            </label>
                            {formProduct.platformsConfig.playstation.ps5.primary.enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Price (EGP)</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps5.primary.price || ''}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        pricePS5Primary: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps5: {
                                              ...prev.platformsConfig.playstation.ps5,
                                              primary: {
                                                ...prev.platformsConfig.playstation.ps5.primary,
                                                price: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Price"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-cyan-300"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Stock</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps5.primary.stock ?? 999}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        ps5PrimaryStock: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps5: {
                                              ...prev.platformsConfig.playstation.ps5,
                                              primary: {
                                                ...prev.platformsConfig.playstation.ps5.primary,
                                                stock: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Stock"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-cyan-300"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* PS5 Secondary */}
                          <div className="p-2.5 bg-pink-500/[0.05] border border-pink-500/20 rounded-lg space-y-2">
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-[10px] font-black uppercase text-pink-400">PS5 Secondary Slot</span>
                              <input
                                type="checkbox"
                                checked={formProduct.platformsConfig.playstation.ps5.secondary.enabled}
                                onChange={e => setFormProduct(prev => ({
                                  ...prev,
                                  platformsConfig: {
                                    ...prev.platformsConfig,
                                    playstation: {
                                      ...prev.platformsConfig.playstation,
                                      ps5: {
                                        ...prev.platformsConfig.playstation.ps5,
                                        secondary: {
                                          ...prev.platformsConfig.playstation.ps5.secondary,
                                          enabled: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                }))}
                                className="w-3 h-3 rounded text-pink-400 bg-black"
                              />
                            </label>
                            {formProduct.platformsConfig.playstation.ps5.secondary.enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Price (EGP)</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps5.secondary.price || ''}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        priceSecondary: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps5: {
                                              ...prev.platformsConfig.playstation.ps5,
                                              secondary: {
                                                ...prev.platformsConfig.playstation.ps5.secondary,
                                                price: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Price"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-pink-300"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Stock</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps5.secondary.stock ?? 999}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        secondaryStock: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps5: {
                                              ...prev.platformsConfig.playstation.ps5,
                                              secondary: {
                                                ...prev.platformsConfig.playstation.ps5.secondary,
                                                stock: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Stock"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-pink-300"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PS4 Generation */}
                    <div className="p-3.5 bg-black/40 border border-emerald-500/20 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formProduct.platformsConfig.playstation.ps4.enabled}
                            onChange={e => setFormProduct(prev => ({
                              ...prev,
                              platformsConfig: {
                                ...prev.platformsConfig,
                                playstation: {
                                  ...prev.platformsConfig.playstation,
                                  ps4: {
                                    ...prev.platformsConfig.playstation.ps4,
                                    enabled: e.target.checked
                                  }
                                }
                              }
                            }))}
                            className="w-3.5 h-3.5 rounded text-emerald-400 bg-black/60 border-white/20"
                          />
                          <span className="text-xs font-black uppercase text-emerald-300">
                            PlayStation 4 (PS4) Generation
                          </span>
                        </label>
                      </div>

                      {formProduct.platformsConfig.playstation.ps4.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* PS4 Primary */}
                          <div className="p-2.5 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-lg space-y-2">
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-[10px] font-black uppercase text-emerald-400">PS4 Primary Slot</span>
                              <input
                                type="checkbox"
                                checked={formProduct.platformsConfig.playstation.ps4.primary.enabled}
                                onChange={e => setFormProduct(prev => ({
                                  ...prev,
                                  platformsConfig: {
                                    ...prev.platformsConfig,
                                    playstation: {
                                      ...prev.platformsConfig.playstation,
                                      ps4: {
                                        ...prev.platformsConfig.playstation.ps4,
                                        primary: {
                                          ...prev.platformsConfig.playstation.ps4.primary,
                                          enabled: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                }))}
                                className="w-3 h-3 rounded text-emerald-400 bg-black"
                              />
                            </label>
                            {formProduct.platformsConfig.playstation.ps4.primary.enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Price (EGP)</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps4.primary.price || ''}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        pricePS4Primary: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps4: {
                                              ...prev.platformsConfig.playstation.ps4,
                                              primary: {
                                                ...prev.platformsConfig.playstation.ps4.primary,
                                                price: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Price"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-emerald-300"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Stock</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps4.primary.stock ?? 999}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        ps4PrimaryStock: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps4: {
                                              ...prev.platformsConfig.playstation.ps4,
                                              primary: {
                                                ...prev.platformsConfig.playstation.ps4.primary,
                                                stock: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Stock"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-emerald-300"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* PS4 Secondary */}
                          <div className="p-2.5 bg-pink-500/[0.05] border border-pink-500/20 rounded-lg space-y-2">
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-[10px] font-black uppercase text-pink-400">PS4 Secondary Slot</span>
                              <input
                                type="checkbox"
                                checked={formProduct.platformsConfig.playstation.ps4.secondary.enabled}
                                onChange={e => setFormProduct(prev => ({
                                  ...prev,
                                  platformsConfig: {
                                    ...prev.platformsConfig,
                                    playstation: {
                                      ...prev.platformsConfig.playstation,
                                      ps4: {
                                        ...prev.platformsConfig.playstation.ps4,
                                        secondary: {
                                          ...prev.platformsConfig.playstation.ps4.secondary,
                                          enabled: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                }))}
                                className="w-3 h-3 rounded text-pink-400 bg-black"
                              />
                            </label>
                            {formProduct.platformsConfig.playstation.ps4.secondary.enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Price (EGP)</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps4.secondary.price || ''}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        priceSecondary: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps4: {
                                              ...prev.platformsConfig.playstation.ps4,
                                              secondary: {
                                                ...prev.platformsConfig.playstation.ps4.secondary,
                                                price: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Price"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-pink-300"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase text-gray-400">Stock</label>
                                  <input
                                    type="number"
                                    value={formProduct.platformsConfig.playstation.ps4.secondary.stock ?? 999}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setFormProduct(prev => ({
                                        ...prev,
                                        secondaryStock: val,
                                        platformsConfig: {
                                          ...prev.platformsConfig,
                                          playstation: {
                                            ...prev.platformsConfig.playstation,
                                            ps4: {
                                              ...prev.platformsConfig.playstation.ps4,
                                              secondary: {
                                                ...prev.platformsConfig.playstation.ps4.secondary,
                                                stock: val
                                              }
                                            }
                                          }
                                        }
                                      }));
                                    }}
                                    placeholder="Stock"
                                    className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-pink-300"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. PC PLATFORM */}
              <div className={`p-4 rounded-2xl border transition-all ${
                formProduct.platformsConfig.pc.enabled
                  ? 'bg-amber-500/[0.04] border-amber-500/30'
                  : 'bg-white/[0.02] border-white/10 opacity-70'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formProduct.platformsConfig.pc.enabled}
                      onChange={e => setFormProduct(prev => ({
                        ...prev,
                        platformsConfig: {
                          ...prev.platformsConfig,
                          pc: {
                            ...prev.platformsConfig.pc,
                            enabled: e.target.checked
                          }
                        }
                      }))}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:outline-none bg-black/60 border-white/20"
                    />
                    <div className="flex items-center gap-2">
                      <Monitor size={16} className="text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        PC / Steam / Epic Platform
                      </span>
                    </div>
                  </label>
                  <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest">
                    {formProduct.platformsConfig.pc.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {formProduct.platformsConfig.pc.enabled && (
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400">PC Editions / Digital Keys</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newEd = {
                            id: `pc_ed_${Date.now()}`,
                            name: 'Standard Edition (Steam)',
                            price: 650,
                            stock: 999,
                            region: 'Global',
                            type: 'key'
                          };
                          setFormProduct(prev => ({
                            ...prev,
                            platformsConfig: {
                              ...prev.platformsConfig,
                              pc: {
                                ...prev.platformsConfig.pc,
                                editions: [...prev.platformsConfig.pc.editions, newEd]
                              }
                            }
                          }));
                        }}
                        className="px-2.5 py-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border border-amber-500/30 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                      >
                        <Plus size={11} /> Add PC Edition
                      </button>
                    </div>

                    {formProduct.platformsConfig.pc.editions.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-3 border border-dashed border-white/10 rounded-xl">
                        No PC editions configured. Click "+ Add PC Edition" above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {formProduct.platformsConfig.pc.editions.map((ed, edIdx) => (
                          <div key={ed.id || edIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 items-center">
                            <div className="sm:col-span-5 space-y-0.5">
                              <label className="text-[8px] uppercase text-gray-500">Edition Name</label>
                              <input
                                type="text"
                                value={ed.name}
                                onChange={e => {
                                  const updated = [...formProduct.platformsConfig.pc.editions];
                                  updated[edIdx].name = e.target.value;
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      pc: { ...prev.platformsConfig.pc, editions: updated }
                                    }
                                  }));
                                }}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-0.5">
                              <label className="text-[8px] uppercase text-gray-500">Price (EGP)</label>
                              <input
                                type="number"
                                value={ed.price || ''}
                                onChange={e => {
                                  const updated = [...formProduct.platformsConfig.pc.editions];
                                  updated[edIdx].price = Number(e.target.value) || 0;
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      pc: { ...prev.platformsConfig.pc, editions: updated }
                                    }
                                  }));
                                }}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-amber-300"
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-0.5">
                              <label className="text-[8px] uppercase text-gray-500">Stock</label>
                              <input
                                type="number"
                                value={ed.stock ?? 999}
                                onChange={e => {
                                  const updated = [...formProduct.platformsConfig.pc.editions];
                                  updated[edIdx].stock = Number(e.target.value) || 0;
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      pc: { ...prev.platformsConfig.pc, editions: updated }
                                    }
                                  }));
                                }}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-amber-300"
                              />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-end pt-2 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formProduct.platformsConfig.pc.editions.filter((_, i) => i !== edIdx);
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      pc: { ...prev.platformsConfig.pc, editions: updated }
                                    }
                                  }));
                                }}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. XBOX PLATFORM */}
              <div className={`p-4 rounded-2xl border transition-all ${
                formProduct.platformsConfig.xbox.enabled
                  ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                  : 'bg-white/[0.02] border-white/10 opacity-70'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formProduct.platformsConfig.xbox.enabled}
                      onChange={e => setFormProduct(prev => ({
                        ...prev,
                        platformsConfig: {
                          ...prev.platformsConfig,
                          xbox: {
                            ...prev.platformsConfig.xbox,
                            enabled: e.target.checked
                          }
                        }
                      }))}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:outline-none bg-black/60 border-white/20"
                    />
                    <div className="flex items-center gap-2">
                      <Gamepad2 size={16} className="text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Xbox Series X/S / Xbox One
                      </span>
                    </div>
                  </label>
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
                    {formProduct.platformsConfig.xbox.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {formProduct.platformsConfig.xbox.enabled && (
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400">Xbox Editions / Accounts</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newEd = {
                            id: `xbox_ed_${Date.now()}`,
                            name: 'Standard Edition (Xbox Series X/S)',
                            price: 550,
                            stock: 999,
                            generation: 'Xbox Series X/S',
                            type: 'primary'
                          };
                          setFormProduct(prev => ({
                            ...prev,
                            platformsConfig: {
                              ...prev.platformsConfig,
                              xbox: {
                                ...prev.platformsConfig.xbox,
                                editions: [...prev.platformsConfig.xbox.editions, newEd]
                              }
                            }
                          }));
                        }}
                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                      >
                        <Plus size={11} /> Add Xbox Edition
                      </button>
                    </div>

                    {formProduct.platformsConfig.xbox.editions.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-3 border border-dashed border-white/10 rounded-xl">
                        No Xbox editions configured. Click "+ Add Xbox Edition" above.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {formProduct.platformsConfig.xbox.editions.map((ed, edIdx) => (
                          <div key={ed.id || edIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 items-center">
                            <div className="sm:col-span-5 space-y-0.5">
                              <label className="text-[8px] uppercase text-gray-500">Edition Name</label>
                              <input
                                type="text"
                                value={ed.name}
                                onChange={e => {
                                  const updated = [...formProduct.platformsConfig.xbox.editions];
                                  updated[edIdx].name = e.target.value;
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      xbox: { ...prev.platformsConfig.xbox, editions: updated }
                                    }
                                  }));
                                }}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-0.5">
                              <label className="text-[8px] uppercase text-gray-500">Price (EGP)</label>
                              <input
                                type="number"
                                value={ed.price || ''}
                                onChange={e => {
                                  const updated = [...formProduct.platformsConfig.xbox.editions];
                                  updated[edIdx].price = Number(e.target.value) || 0;
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      xbox: { ...prev.platformsConfig.xbox, editions: updated }
                                    }
                                  }));
                                }}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-emerald-300"
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-0.5">
                              <label className="text-[8px] uppercase text-gray-500">Stock</label>
                              <input
                                type="number"
                                value={ed.stock ?? 999}
                                onChange={e => {
                                  const updated = [...formProduct.platformsConfig.xbox.editions];
                                  updated[edIdx].stock = Number(e.target.value) || 0;
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      xbox: { ...prev.platformsConfig.xbox, editions: updated }
                                    }
                                  }));
                                }}
                                className="w-full bg-[#0B0B0F] border border-white/10 rounded p-1.5 text-xs font-mono text-emerald-300"
                              />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-end pt-2 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formProduct.platformsConfig.xbox.editions.filter((_, i) => i !== edIdx);
                                  setFormProduct(prev => ({
                                    ...prev,
                                    platformsConfig: {
                                      ...prev.platformsConfig,
                                      xbox: { ...prev.platformsConfig.xbox, editions: updated }
                                    }
                                  }));
                                }}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 6: Cover Image Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Main Cover Image Asset</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <input 
                  type="text" 
                  value={formProduct.imageUrl} 
                  onChange={e => setFormProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="Paste cover URL or use loader link..."
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs"
                />
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-white/10">
                    <UploadCloud size={12} />
                    {uploadingCover 
                      ? `UPLOADING COVER (${coverProgress !== null ? coverProgress : 0}%)` 
                      : "UPLOAD Cover FROM STORAGE"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={async (e) => {
                        if (!e.target.files?.[0]) return;
                        setUploadingCover(true);
                        setCoverProgress(0);
                        try {
                          const res = await uploadMedia(e.target.files[0], (percent) => {
                            setCoverProgress(percent);
                          });
                          setFormProduct(prev => ({ ...prev, imageUrl: res.url }));
                          showToast("SUCCESS: Cover image uploaded successfully.");
                        } catch (err: any) {
                          showToast(`ERROR: ${err?.message || err}`);
                        } finally {
                          setUploadingCover(false);
                          setCoverProgress(null);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              {formProduct.imageUrl && (
                <img 
                  src={formProduct.imageUrl} 
                  alt="Cover Preview" 
                  className="w-16 h-20 object-cover rounded-xl border border-white/10 bg-[#0B0B0F]"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>

          {/* Row 7: Gallery Images Manager */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Multi-gallery Screenshots Images</label>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-400 cursor-pointer hover:bg-indigo-500/20">
                <UploadCloud size={11} />
                {uploadingGallery ? `UPLOADING: ${galleryProgress || "0%"}` : "UPLOAD SCREENSHOTS"}
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={async (e) => {
                    if (!e.target.files || e.target.files.length === 0) return;
                    setUploadingGallery(true);
                    setGalleryProgress("Starting...");
                    try {
                      const urls: string[] = [];
                      const total = e.target.files.length;
                      for (let i = 0; i < total; i++) {
                        const file = e.target.files[i];
                        const res = await uploadMedia(file, (percent) => {
                          setGalleryProgress(`File ${i + 1}/${total} (${percent}%)`);
                        });
                        urls.push(res.url);
                      }
                      setFormProduct(prev => ({
                        ...prev,
                        galleryImages: [...(prev.galleryImages || []), ...urls]
                      }));
                      showToast("SUCCESS: Screenshot assets uploaded successfully.");
                    } catch (err: any) {
                      showToast(`ERROR: ${err?.message || err}`);
                    } finally {
                      setUploadingGallery(false);
                      setGalleryProgress(null);
                    }
                  }}
                />
              </label>
            </div>

            {formProduct.galleryImages && formProduct.galleryImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                {formProduct.galleryImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative group/idx bg-black/40 rounded-xl overflow-hidden border border-white/5 aspect-video">
                    <img 
                      src={imgUrl} 
                      alt={`Screenshot ${idx}`} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/idx:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                      <div className="flex justify-between w-full">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const list = [...(formProduct.galleryImages || [])];
                            const temp = list[idx];
                            list[idx] = list[idx - 1];
                            list[idx - 1] = temp;
                            setFormProduct(p => ({ ...p, galleryImages: list }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white"
                          title="Move back"
                        >
                          <ArrowLeft size={10} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === formProduct.galleryImages.length - 1}
                          onClick={() => {
                            const list = [...(formProduct.galleryImages || [])];
                            const temp = list[idx];
                            list[idx] = list[idx + 1];
                            list[idx + 1] = temp;
                            setFormProduct(p => ({ ...p, galleryImages: list }));
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white"
                          title="Move forward"
                        >
                          <ArrowRight size={10} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const list = (formProduct.galleryImages || []).filter((_, i) => i !== idx);
                          setFormProduct(p => ({ ...p, galleryImages: list }));
                          showToast("Deleted image from the gallery draft list.");
                        }}
                        className="bg-red-500/80 hover:bg-red-500 text-white uppercase text-[8px] font-black rounded-lg py-1 text-center font-mono w-full"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center border-2 border-dashed border-white/5 rounded-2xl text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                No Screenshots uploaded yet
              </div>
            )}
          </div>

          {/* Row 8: Tags Cloud */}
          <div className="space-y-1 border-t border-white/5 pt-4">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Search Tags (Comma-separated list)</label>
            <input 
              type="text"
              value={formProduct.tags ? formProduct.tags.join(', ') : ''}
              onChange={e => {
                const parsed = e.target.value.split(',').map(tag => tag.trim());
                setFormProduct(prev => ({ ...prev, tags: parsed }));
              }}
              placeholder="rdr2, openworld, epic, goty"
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white uppercase"
            />
            {formProduct.tags && formProduct.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {formProduct.tags.filter(Boolean).map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[8px] font-black rounded uppercase">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 9: Storefront Visibility Badging Grid */}
          <div className="border-t border-white/5 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 bg-[#151619] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.02]">
              <input 
                type="checkbox"
                checked={!!formProduct.featured}
                onChange={e => setFormProduct(prev => ({ ...prev, featured: e.target.checked }))}
                className="accent-[#00F0FF] rounded"
              />
              <div className="leading-none">
                <span className="text-[10px] font-black uppercase text-white tracking-wider block">FEATURED</span>
                <span className="text-[8px] text-gray-500 uppercase font-semibold">Elevated on Carousel</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#151619] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.02]">
              <input 
                type="checkbox"
                checked={!!formProduct.trending}
                onChange={e => setFormProduct(prev => ({ ...prev, trending: e.target.checked }))}
                className="accent-pink-400 rounded"
              />
              <div className="leading-none">
                <span className="text-[10px] font-black uppercase text-white tracking-wider block">TRENDING</span>
                <span className="text-[8px] text-gray-500 uppercase font-semibold">Hot Velocity lists</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-[#151619] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.02]">
              <input 
                type="checkbox"
                checked={!!formProduct.recommended}
                onChange={e => setFormProduct(prev => ({ ...prev, recommended: e.target.checked }))}
                className="accent-amber-400 rounded"
              />
              <div className="leading-none">
                <span className="text-[10px] font-black uppercase text-white tracking-wider block">RECOMMENDED</span>
                <span className="text-[8px] text-gray-500 uppercase font-semibold">AI Assistant recommendation</span>
              </div>
            </label>
          </div>

          {saveProductError && (
            <div id="save-product-error-panel" className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl space-y-1 mt-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-red-400">🚨 INVENTORY WRITE TRANSACTION FAILURE:</div>
              <div className="text-xs font-semibold leading-normal uppercase">{saveProductError}</div>
            </div>
          )}

          {/* Submit Sync Header Button */}
          <button 
            type="submit" 
            disabled={isSavingProduct}
            className="w-full py-4 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:bg-cyan-400 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingProduct ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                SYNCHRONIZING CATALOG DATA...
              </span>
            ) : (
              <>
                <Save size={16} /> SYNC MASTER WORLDWIDE PRODUCT CATALOG
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
