import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, ToggleLeft, ToggleRight, Save, RefreshCw, 
  Grid, List, ArrowUp, ArrowDown, Sparkles, Image as ImageIcon, X, Check, Search
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadMedia } from '../../lib/storageHelper';

export interface HomepageSectionEntity {
  id: string;
  titleEn: string;
  titleAr: string;
  bannerUrl?: string;
  assignedProductIds: string[];
  sortOrder: number;
  isActive: boolean;
  updatedAt?: string;
}

interface HomepageSectionsModuleProps {
  showToast: (msg: string) => void;
}

export default function HomepageSectionsModule({ showToast }: HomepageSectionsModuleProps) {
  const [sections, setSections] = useState<HomepageSectionEntity[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSectionEntity | null>(null);

  // Form Fields
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  // Search filter for product assignments inside the form
  const [searchProdText, setSearchProdText] = useState('');

  // Image upload state
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Connect to Firestore collections
  useEffect(() => {
    // 1. Listen to dynamic sections
    const unsubSections = onSnapshot(collection(db, 'homepage_sections'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HomepageSectionEntity[];
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setSections(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch dynamic home sections: ", err);
      showToast("Error establishing sections listener.");
      setLoading(false);
    });

    // 2. Load all available products
    const unsubProds = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Untitled Product',
        platform: doc.data().platform || 'PS5',
        price: doc.data().price || 0,
        thumbnail: doc.data().coverUrl || doc.data().imageUrl || ''
      }));
      setProducts(list);
    });

    return () => {
      unsubSections();
      unsubProds();
    };
  }, []);

  const openCreate = () => {
    setEditingSection(null);
    setTitleEn('');
    setTitleAr('');
    setBannerUrl('');
    setAssignedIds([]);
    const nextOrder = sections.reduce((acc, curr) => Math.max(acc, curr.sortOrder), 0) + 1;
    setSortOrder(nextOrder);
    setIsActive(true);
    setSearchProdText('');
    setIsFormOpen(true);
  };

  const openEdit = (section: HomepageSectionEntity) => {
    setEditingSection(section);
    setTitleEn(section.titleEn);
    setTitleAr(section.titleAr || '');
    setBannerUrl(section.bannerUrl || '');
    setAssignedIds(section.assignedProductIds || []);
    setSortOrder(section.sortOrder);
    setIsActive(section.isActive);
    setSearchProdText('');
    setIsFormOpen(true);
  };

  const handleToggleProduct = (prodId: string) => {
    setAssignedIds(prev => 
      prev.includes(prodId) 
        ? prev.filter(id => id !== prodId) 
        : [...prev, prodId]
    );
  };

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setUploadProgress(0);
    try {
      const res = await uploadMedia(file, (percent) => {
        setUploadProgress(percent);
      });
      setBannerUrl(res.url);
      showToast("SUCCESS: Row display banner uploaded.");
    } catch (err: any) {
      console.error(err);
      showToast(`Error: ${err?.message || err}`);
    } finally {
      setUploadingBanner(false);
      setUploadProgress(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) {
      showToast("English title is required.");
      return;
    }

    const payload = {
      titleEn: titleEn.trim(),
      titleAr: titleAr.trim(),
      bannerUrl: bannerUrl.trim(),
      assignedProductIds: assignedIds,
      sortOrder: Number(sortOrder),
      isActive,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingSection) {
        await updateDoc(doc(db, 'homepage_sections', editingSection.id), payload);
        showToast("SUCCESS: Showcase section modified successfully.");
      } else {
        await addDoc(collection(db, 'homepage_sections'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        showToast("SUCCESS: Showcase section generated successfully.");
      }
      setIsFormOpen(false);
      setEditingSection(null);
    } catch (err: any) {
      console.error(err);
      showToast(`FAILED: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the home display group "${name}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'homepage_sections', id));
      showToast("SUCCESS: Showcase row deleted.");
    } catch (err: any) {
      console.error(err);
      showToast(`Error: ${err?.message || err}`);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const currentSec = sections[index];
    const targetSec = sections[targetIdx];

    try {
      const tempOrder = currentSec.sortOrder;
      await updateDoc(doc(db, 'homepage_sections', currentSec.id), {
        sortOrder: targetSec.sortOrder
      });
      await updateDoc(doc(db, 'homepage_sections', targetSec.id), {
        sortOrder: tempOrder
      });
      showToast("SUCCESS: Section show ordering adjusted.");
    } catch (err) {
      console.error(err);
      showToast("Failed to re-sequence showcase.");
    }
  };

  const handleToggleActive = async (sec: HomepageSectionEntity) => {
    try {
      await updateDoc(doc(db, 'homepage_sections', sec.id), {
        isActive: !sec.isActive
      });
      showToast(`SUCCESS: Row status altered.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle showcase row status.");
    }
  };

  const filteredProdList = products.filter(p => 
    p.name.toLowerCase().includes(searchProdText.toLowerCase()) ||
    p.platform.toLowerCase().includes(searchProdText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Module Hub Header */}
      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00F0FF]/15 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <span className="px-3 py-1 bg-[#00F0FF]/15 text-[#00F0FF] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#00F0FF]/10 select-none">
          HOMEPAGE DYNAMIC SHOWCASE ROW MANAGER
        </span>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Homepage Showcase Sections</h2>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed max-w-2xl mt-1">
              Create, translate, sequence, and customize dynamic grids of product categories. Assign banners, drag products inside them and control layout flow dynamically.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-3.5 bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer shrink-0"
          >
            + Create New Section
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="animate-spin text-[#00F0FF] mx-auto" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] font-mono">
            SYNCING LIVING GRID STRUCTURE DESIGNERS...
          </p>
        </div>
      ) : sections.length === 0 ? (
        <div className="p-16 text-center bg-[#151619] border border-dashed border-white/10 rounded-[2rem] space-y-4">
          <Grid className="text-gray-650 mx-auto" size={48} />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
            NO DYNAMIC SHOWS REGISTERED ON SITE
          </h3>
          <p className="text-[10px] text-gray-500 font-semibold uppercase max-w-sm mx-auto">
            Build specialized showcase cards like "Summer Offers", "Must Play Hits" or localize translations instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((sec, index) => (
            <div 
              key={sec.id}
              className={`p-5 bg-[#151619] border rounded-3xl transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${
                sec.isActive ? 'border-white/5 bg-[#151619]' : 'border-red-500/10 opacity-60 bg-black/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 w-full md:w-2/3">
                {sec.bannerUrl ? (
                  <div className="w-full sm:w-32 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <img src={sec.bannerUrl} alt="Showcase Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="w-full sm:w-32 h-20 bg-black/50 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center p-2 shrink-0">
                    <ImageIcon className="text-gray-700 mb-1" size={16} />
                    <span className="text-[7px] text-gray-500 font-black tracking-widest">NO ROW BANNER</span>
                  </div>
                )}

                <div className="space-y-1 text-center sm:text-left overflow-hidden">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-sm font-black uppercase tracking-tight text-white truncate max-w-xs">{sec.titleEn}</h3>
                    {sec.titleAr && (
                      <span className="text-xs text-gray-400 font-medium font-sans">({sec.titleAr})</span>
                    )}
                    <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      Order: {sec.sortOrder}
                    </span>
                    {!sec.isActive && (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[7px] font-black uppercase">Hidden</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#00F0FF] font-black uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                    <Grid size={10} /> Products Attached: {sec.assignedProductIds?.length || 0}
                  </p>
                  {sec.assignedProductIds && sec.assignedProductIds.length > 0 && (
                    <p className="text-[9px] text-gray-500 truncate text-left">
                      Assigned IDs: {sec.assignedProductIds.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Functional Row Adjustments */}
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-1/3">
                <div className="flex border border-white/5 bg-black/20 rounded-xl p-0.5">
                  <button
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-[#00F0FF] disabled:opacity-25 cursor-pointer"
                    title="Sequence Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === sections.length - 1}
                    className="p-1.5 text-gray-400 hover:text-[#00F0FF] disabled:opacity-25 cursor-pointer"
                    title="Sequence Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <button
                  onClick={() => handleToggleActive(sec)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    sec.isActive ? 'text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' : 'text-gray-400 bg-white/5 hover:bg-white/10'
                  }`}
                  title={sec.isActive ? "Hide Section" : "Show Section"}
                >
                  {sec.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>

                <button
                  onClick={() => openEdit(sec)}
                  className="p-2 border border-white/10 bg-white/5 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                  title="Edit Row Elements"
                >
                  <Edit size={14} />
                </button>

                <button
                  onClick={() => handleDelete(sec.id, sec.titleEn)}
                  className="p-2 text-red-500 bg-red-500/5 hover:bg-red-500/15 rounded-xl border border-red-500/10 transition-all cursor-pointer"
                  title="Purge Showcase Row"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PopUp Form Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#0B0B0F] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF] font-mono">
                {editingSection ? "EDIT CATALOG SHOWCASE BLOCK" : "CONSTRUCT DYNAMIC DISPLAY BLOCK"}
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Grid size={18} className="text-[#00F0FF]" /> {editingSection ? 'Modify dynamic Showcase Row' : 'Add dynamic Showcase Row'}
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">English Section Row Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. BEST RPG SPECIALS"
                    value={titleEn}
                    onChange={e => setTitleEn(e.target.value)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Arabic Localized Row Title</label>
                  <input
                    type="text"
                    placeholder="E.g. أفضل عروض الآر بي جي"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white text-right placeholder-gray-650 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              {/* Upload row Banner graphic */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Showcase Decorative Row Banner Image</span>
                {bannerUrl ? (
                  <div className="relative group/banner rounded-xl border border-white/10 h-24 overflow-hidden bg-black/40">
                    <img src={bannerUrl} alt="Banner layout" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/banner:opacity-100 flex items-center justify-center transition-opacity">
                      <button
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="px-2 py-0.5 bg-red-650 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-xl text-center space-y-1">
                    <ImageIcon className="text-gray-650" size={24} />
                    <span className="text-[8px] text-gray-500 font-semibold uppercase">NO SPECIFIC DECORATIVE BANNER</span>
                  </div>
                )}
                <label className="block w-full text-center py-2.5 bg-[#00F0FF]/15 text-[#00F0FF] hover:bg-[#00F0FF]/25 border border-[#00F0FF]/20 rounded-xl text-[8px] font-black uppercase cursor-pointer transition-colors font-mono tracking-widest">
                  {uploadingBanner 
                    ? `STORING FILE (${uploadProgress !== null ? uploadProgress : 0}%)` 
                    : "Upload Segment Graphic Banner"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingBanner}
                    onChange={handleUploadBanner}
                  />
                </label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  placeholder="Or paste direct url image..."
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-mono focus:outline-none"
                />
              </div>

              {/* Product multi-selection filter search checkbox space */}
              <div className="space-y-2 p-4 bg-black/40 border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">
                    Assign Products to row ({assignedIds.length} Selected)
                  </label>
                  <div className="relative w-48">
                    <input
                      type="text"
                      placeholder="Quick Filter..."
                      value={searchProdText}
                      onChange={e => setSearchProdText(e.target.value)}
                      className="w-full bg-[#151619] border border-white/10 rounded-lg py-1 px-2.5 pl-7 text-[10px] text-white placeholder-gray-650 focus:outline-none focus:border-[#00F0FF]"
                    />
                    <Search className="absolute left-2 top-2 text-gray-650" size={10} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredProdList.map(p => {
                    const selected = assignedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleToggleProduct(p.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          selected 
                            ? 'bg-[#00F0FF]/10 border-[#00F0FF]/30 text-white' 
                            : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate max-w-[85%]">
                          {p.thumbnail && (
                            <img src={p.thumbnail} className="w-6 h-6 rounded object-cover" referrerPolicy="no-referrer" />
                          )}
                          <div className="truncate">
                            <span className="text-[10px] font-bold block truncate">{p.name}</span>
                            <span className="text-[8px] text-gray-500 font-mono tracking-tight uppercase font-black">{p.platform} • EGP {p.price}</span>
                          </div>
                        </div>
                        {selected ? (
                          <Check className="text-[#00F0FF] shrink-0" size={12} strokeWidth={3} />
                        ) : (
                          <span className="w-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show Hide toggles & manual order weights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Specific Sort Index Priority</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={e => setSortOrder(Number(e.target.value))}
                    min={0}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 bg-[#151619] border border-white/5 text-[#00F0FF] focus:ring-0 rounded cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-black uppercase tracking-tight text-white cursor-pointer select-none">
                    Initially Active Showcase Row on Home View
                  </label>
                </div>
              </div>

              {/* Action commands */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl transition-colors cursor-pointer"
                >
                  DISCARD
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-[#0B0B0F] font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_15px_#00F0FF33]"
                >
                  <Save size={12} strokeWidth={3} /> SAVE SHOWCASE ROW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
