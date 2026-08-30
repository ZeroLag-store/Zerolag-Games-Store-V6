import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, FolderPlus, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, 
  Save, RefreshCw, Layers, Sliders, Hash, Compass, Bookmark, UploadCloud, Image as ImageIcon
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadMedia } from '../../lib/storageHelper';
import { safeSetDoc, cleanFirestoreData } from '../../lib/firestoreUtils';

interface SubcategoryItem {
  name: string;
  imageUrl?: string;
}

interface TaxonomyItem {
  id: string;
  name: string;
  nameAr?: string;
  displayOrder: number;
  isHidden: boolean;
  subcategories?: (string | SubcategoryItem)[];
}

interface TaxonomyModuleProps {
  showToast: (msg: string) => void;
  forcedTab?: 'categories' | 'platforms' | 'genres' | 'collections';
}

export default function TaxonomyModule({ showToast, forcedTab }: TaxonomyModuleProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'platforms' | 'genres' | 'collections'>(forcedTab || 'categories');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  // Raw states loaded from db document "settings/taxonomy"
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [platforms, setPlatforms] = useState<TaxonomyItem[]>([]);
  const [genres, setGenres] = useState<TaxonomyItem[]>([]);
  const [collections, setCollections] = useState<TaxonomyItem[]>([]);

  // Form states for adding/editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formSub, setFormSub] = useState(''); // comma sep subcategories
  const [uploadingSub, setUploadingSub] = useState<string | null>(null);

  const handleUploadSubImage = async (file: File, categoryId: string, subName: string) => {
    setUploadingSub(subName);
    try {
      const res = await uploadMedia(file, () => {});
      // Success. Find the category and update the subcategory image url!
      const currentList = [...categories];
      const category = currentList.find(c => c.id === categoryId);
      if (category) {
        const subs = category.subcategories ? [...category.subcategories] : [];
        const index = subs.findIndex(s => {
          const name = typeof s === 'string' ? s : s.name;
          return name.toLowerCase() === subName.toLowerCase();
        });
        if (index !== -1) {
          const existingSub = subs[index];
          subs[index] = {
            name: typeof existingSub === 'string' ? existingSub : existingSub.name,
            imageUrl: res.url
          };
          category.subcategories = subs;
          setCategories(currentList);
          await setDoc(doc(db, 'settings', 'taxonomy'), {
            categories: currentList,
            platforms,
            genres,
            collections,
            updatedAt: new Date().toISOString()
          });
          showToast(`SUCCESS: Uploaded icon for "${subName}"`);
        }
      }
    } catch (err) {
      console.error("Failed uploading sub image:", err);
      showToast("Error uploading subcategory icon.");
    } finally {
      setUploadingSub(null);
    }
  };

  // Listen to taxonomy modifications in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'taxonomy'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        let loadedCats: TaxonomyItem[] = d.categories || [];
        
        // Auto-migrate to inject 'Top Up' section if it is missing in the database
        const hasTopUp = loadedCats.some((c: any) => c.id === 'top_up' || c.name.toLowerCase() === 'top up');
        if (!hasTopUp) {
          const topUpCat: TaxonomyItem = { 
            id: 'top_up', 
            name: 'Top Up', 
            nameAr: 'شحن ألعاب', 
            displayOrder: 4, 
            isHidden: false, 
            subcategories: ['PUBG UC', 'Free Fire Diamonds', 'Valorant Points', 'FC Points'] 
          };
          
          // Inject into list
          loadedCats = [...loadedCats];
          // Try to insert after Gift Cards, or append
          const giftCardsIdx = loadedCats.findIndex((c: any) => c.id === 'gift_cards' || c.name.toLowerCase() === 'gift cards');
          if (giftCardsIdx !== -1) {
            loadedCats.splice(giftCardsIdx + 1, 0, topUpCat);
          } else {
            loadedCats.push(topUpCat);
          }
          
          // Re-adjust displayOrders
          loadedCats = loadedCats.map((c, idx) => ({ ...c, displayOrder: idx + 1 }));
          
          // Update database silently
          setDoc(doc(db, 'settings', 'taxonomy'), {
            ...d,
            categories: loadedCats
          }).catch(e => console.warn("Failed auto-sync of top_up taxonomy: ", e));
        }

        setCategories(loadedCats);
        setPlatforms(d.platforms || []);
        setGenres(d.genres || []);
        setCollections(d.collections || []);
      } else {
        // Seed default tax data
        const defaultCats: TaxonomyItem[] = [
          { id: 'games', name: 'Games', nameAr: 'ألعاب', displayOrder: 1, isHidden: false, subcategories: ['PS4', 'PS5', 'PC', 'Keys'] },
          { id: 'subscriptions', name: 'Subscriptions', nameAr: 'اشتراكات', displayOrder: 2, isHidden: false, subcategories: ['PS Plus', 'EA Play', 'Game Pass'] },
          { id: 'gift_cards', name: 'Gift Cards', nameAr: 'بطاقات الهدايا', displayOrder: 3, isHidden: false, subcategories: ['USD Razer Gold', 'Google Play', 'Steam Wallet', 'PSN Cards', 'Xbox Digital', 'iTunes'] },
          { id: 'top_up', name: 'Top Up', nameAr: 'شحن ألعاب', displayOrder: 4, isHidden: false, subcategories: ['PUBG UC', 'Free Fire Diamonds', 'Valorant Points', 'FC Points'] },
          { id: 'hardware', name: 'Hardware', nameAr: 'أجهزة وملحقات', displayOrder: 5, isHidden: false, subcategories: ['Mouse', 'Keyboard', 'Headset', 'Mouse Pad', 'Controller', 'Microphone', 'Webcam', 'Gaming Chair', 'Desk', 'Monitor', 'SSD', 'HDD', 'RAM', 'GPU', 'CPU', 'Motherboard', 'Power Supply', 'Cooling', 'Laptop', 'Accessories'] },
          { id: 'services', name: 'Services', nameAr: 'خدمات', displayOrder: 6, isHidden: false, subcategories: ['Fifa Packs', 'FC Coins', 'Cheats'] }
        ];
        const defaultPlats: TaxonomyItem[] = [
          { id: 'ps', name: 'PS', nameAr: 'بلايستيشن', displayOrder: 1, isHidden: false },
          { id: 'pc', name: 'PC', nameAr: 'كمبيوتر', displayOrder: 2, isHidden: false },
          { id: 'xbox', name: 'Xbox', nameAr: 'إكس بوكس', displayOrder: 3, isHidden: false }
        ];
        const defaultGenres: TaxonomyItem[] = [
          { id: 'action', name: 'Action', nameAr: 'أكشن', displayOrder: 1, isHidden: false },
          { id: 'rpg', name: 'RPG', nameAr: 'أر بي جي', displayOrder: 2, isHidden: false },
          { id: 'sports', name: 'Sports', nameAr: 'رياضة', displayOrder: 3, isHidden: false },
          { id: 'indie', name: 'Indie', nameAr: 'مطور مستقل', displayOrder: 4, isHidden: false }
        ];
        const defaultColls: TaxonomyItem[] = [
          { id: 'featured', name: 'Featured Games', nameAr: 'ألعاب مميزة', displayOrder: 1, isHidden: false },
          { id: 'trending', name: 'Trending Now', nameAr: 'رائج الآن', displayOrder: 2, isHidden: false },
          { id: 'bestsellers', name: 'Best Sellers', nameAr: 'الأكثر مبيعاً', displayOrder: 3, isHidden: false }
        ];

        setCategories(defaultCats);
        setPlatforms(defaultPlats);
        setGenres(defaultGenres);
        setCollections(defaultColls);

        setDoc(doc(db, 'settings', 'taxonomy'), {
          categories: defaultCats,
          platforms: defaultPlats,
          genres: defaultGenres,
          collections: defaultColls,
          updatedAt: new Date().toISOString()
        }).catch(err => console.warn("Failed seed tax: ", err));
      }
      setLoading(false);
    }, (err) => {
      console.error("Taxonomy snapshot read error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getTargetList = (): TaxonomyItem[] => {
    if (activeTab === 'categories') return categories;
    if (activeTab === 'platforms') return platforms;
    if (activeTab === 'genres') return genres;
    return collections;
  };

  const setTargetList = (items: TaxonomyItem[]) => {
    if (activeTab === 'categories') setCategories(items);
    else if (activeTab === 'platforms') setPlatforms(items);
    else if (activeTab === 'genres') setGenres(items);
    else setCollections(items);
  };

  const handleSaveTaxonomy = async (updatedCollection?: TaxonomyItem[]) => {
    setSaving(true);
    try {
      const payload = cleanFirestoreData({
        categories: activeTab === 'categories' && updatedCollection ? updatedCollection : categories,
        platforms: activeTab === 'platforms' && updatedCollection ? updatedCollection : platforms,
        genres: activeTab === 'genres' && updatedCollection ? updatedCollection : genres,
        collections: activeTab === 'collections' && updatedCollection ? updatedCollection : collections,
        updatedAt: new Date().toISOString()
      });
      await safeSetDoc(doc(db, 'settings', 'taxonomy'), payload);
      showToast("Taxonomy configuration successfully synchronized.");
      setEditingId(null);
      setFormName('');
      setFormNameAr('');
      setFormSub('');
    } catch (err: any) {
      console.error("Failed saving taxonomy:", err);
      showToast("Error saving taxonomy configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const currentList = [...getTargetList()];
    const sanitizedId = editingId || formName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const subs = formSub ? formSub.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    
    // Preserve existing subcategories with images
    const existingCategory = editingId ? currentList.find(c => c.id === editingId) : null;
    const existingSubs = existingCategory?.subcategories || [];

    const finalSubs = subs.map(subName => {
      const matched = existingSubs.find(es => {
        const name = typeof es === 'string' ? es : es.name;
        return name.toLowerCase() === subName.toLowerCase();
      });
      if (matched && typeof matched !== 'string' && matched.imageUrl) {
        return matched; // Preserve object
      }
      return subName;
    });

    if (editingId) {
      // Edit item
      const updated = currentList.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            name: formName.trim(),
            nameAr: formNameAr.trim() || undefined,
            subcategories: activeTab === 'categories' ? finalSubs : undefined
          };
        }
        return item;
      });
      setTargetList(updated);
      handleSaveTaxonomy(updated);
    } else {
      // Add brand new item
      if (currentList.some(i => i.id === sanitizedId)) {
        showToast("Error: Item with this key/name already exists.");
        return;
      }
      const newItem: TaxonomyItem = {
        id: sanitizedId,
        name: formName.trim(),
        nameAr: formNameAr.trim() || undefined,
        displayOrder: currentList.length + 1,
        isHidden: false,
        subcategories: activeTab === 'categories' ? finalSubs : undefined
      };
      const updated = [...currentList, newItem];
      setTargetList(updated);
      handleSaveTaxonomy(updated);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class? This could affect products tagged with it.")) return;
    const currentList = getTargetList();
    const updated = currentList.filter(item => item.id !== id).map((item, idx) => ({
      ...item,
      displayOrder: idx + 1
    }));
    setTargetList(updated);
    handleSaveTaxonomy(updated);
  };

  const handleToggleHide = (id: string) => {
    const currentList = getTargetList();
    const updated = currentList.map(item => {
      if (item.id === id) {
        return { ...item, isHidden: !item.isHidden };
      }
      return item;
    });
    setTargetList(updated);
    handleSaveTaxonomy(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const currentList = [...getTargetList()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    // Swap elements
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;

    // Reorder indices
    const updated = currentList.map((item, idx) => ({ ...item, displayOrder: idx + 1 }));
    setTargetList(updated);
    handleSaveTaxonomy(updated);
  };

  const startEdit = (item: TaxonomyItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormNameAr(item.nameAr || '');
    setFormSub(item.subcategories ? item.subcategories.map(s => typeof s === 'string' ? s : s.name).join(', ') : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormName('');
    setFormNameAr('');
    setFormSub('');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="animate-spin text-[#00F0FF]" size={32} />
        <p className="text-xs font-black uppercase tracking-widest leading-none">Connecting Taxonomy Registers...</p>
      </div>
    );
  }

  const items = getTargetList();

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00F0FF]/15 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <span className="px-3 py-1 bg-[#00F0FF]/15 text-[#00F0FF] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#00F0FF]/10">
          SYSTEM TAXONOMY METADATA
        </span>
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Dynamic Tags & Categories</h2>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed max-w-2xl">
          Complete self-contained taxonomies panel. Alter Categories, Subcategories, Platforms, Genres, and Collections. Updates render everywhere instantly in real-time.
        </p>
      </div>

      {/* Selector Menu Tabs */}
      {!forcedTab && (
        <div className="flex flex-wrap gap-2.5">
          {[
            { id: 'categories', label: 'Categories & Subs', icon: <Layers size={14} /> },
            { id: 'platforms', label: 'Play Platforms', icon: <Sliders size={14} /> },
            { id: 'genres', label: 'Sub-Genres', icon: <Compass size={14} /> },
            { id: 'collections', label: 'UI Collections', icon: <Bookmark size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                cancelEdit();
              }}
              className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#00F0FF] text-[#0B0B0F] shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                  : 'bg-[#151619] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Editor Form */}
        <div className="lg:col-span-2 p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-6 h-fit">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#00F0FF] flex items-center gap-2">
            <FolderPlus size={16} /> 
            {editingId ? "UPDATE REFERENCE" : "REGISTER NEW CLASS"}
          </h3>

          <form onSubmit={handleAddOrEdit} className="space-y-4">
            <div className="space-y-1.55">
              <label className="text-[9px] font-black uppercase text-gray-500">English Standard Name</label>
              <input
                type="text"
                required
                placeholder="E.g. Action RPG"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>

            <div className="space-y-1.55">
              <label className="text-[9px] font-black uppercase text-gray-500">Arabic Localized Name</label>
              <input
                type="text"
                placeholder="E.g.أكشن وتقمص الأدوار"
                value={formNameAr}
                onChange={e => setFormNameAr(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white text-right"
              />
            </div>

            {activeTab === 'categories' && (
              <div className="space-y-1.55">
                <label className="text-[9px] font-black uppercase text-gray-500">
                  Subcategories (Comma separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="PS Plus, Premium, Deluxe, Essential"
                  value={formSub}
                  onChange={e => setFormSub(e.target.value)}
                  className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
                />
              </div>
            )}

            {activeTab === 'categories' && editingId && (
              <div className="space-y-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-[#00F0FF] tracking-widest block">
                  Category Icons & Images
                </span>
                
                <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                  {((categories.find(c => c.id === editingId)?.subcategories) || []).map((sub) => {
                    const name = typeof sub === 'string' ? sub : sub.name;
                    const imgUrl = typeof sub === 'string' ? '' : sub.imageUrl;
                    
                    return (
                      <div key={name} className="flex items-center justify-between p-2.5 bg-[#0B0B0F] rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 truncate">
                          {imgUrl ? (
                            <img 
                              src={imgUrl} 
                              alt={name} 
                              className="w-8 h-8 rounded-lg object-cover bg-white/5 border border-white/10 shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <ImageIcon size={14} className="text-gray-500" />
                            </div>
                          )}
                          <div className="truncate">
                            <div className="text-xs font-black uppercase text-white truncate">{name}</div>
                            {imgUrl ? (
                              <span className="text-[8px] text-[#00F0FF] font-bold uppercase tracking-wider block">Has Icon</span>
                            ) : (
                              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">No Icon</span>
                            )}
                          </div>
                        </div>

                        <label className="flex items-center justify-center p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer">
                          <UploadCloud size={14} className={uploadingSub === name ? "animate-bounce text-[#00F0FF]" : ""} />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            disabled={uploadingSub !== null}
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadSubImage(e.target.files[0], editingId, name);
                              }
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                disabled={saving || !formName}
                className="flex-1 py-3.5 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {editingId ? "SYNC CONFIG" : "COMMIT ADD"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  CANCEL
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List of tax items */}
        <div className="lg:col-span-3 p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">
              {items.length} Registered Nodes inside {activeTab.toUpperCase()}
            </h3>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-600 bg-[#0B0B0F] rounded-2xl border border-dashed border-white/5">
              <span className="text-xs font-black uppercase tracking-widest">No keys or tags listed.</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    item.isHidden 
                      ? 'bg-black/40 border-white/5 opacity-50' 
                      : editingId === item.id 
                        ? 'bg-[#00F0FF]/5 border-[#00F0FF]/30' 
                        : 'bg-[#0B0B0F] border-white/10'
                  }`}
                >
                  <div className="space-y-1 truncate max-w-[65%]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-white/5 text-[9px] font-bold font-mono text-gray-500 rounded flex items-center justify-center shrink-0">
                        {item.displayOrder}
                      </span>
                      <h4 className="text-xs font-black uppercase tracking-tight text-white truncate">
                        {item.name}
                      </h4>
                      {item.nameAr && (
                        <span className="text-[10px] text-gray-400 font-bold font-sans">
                          ({item.nameAr})
                        </span>
                      )}
                    </div>
                    {item.subcategories && item.subcategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 pl-7">
                        {item.subcategories.map(s => {
                          const name = typeof s === 'string' ? s : s.name;
                          const imgUrl = typeof s === 'string' ? '' : s.imageUrl;
                          
                          return (
                            <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-md text-[8px] font-mono text-gray-400 capitalize border border-white/5">
                              {imgUrl && (
                                <img 
                                  src={imgUrl} 
                                  alt={name} 
                                  className="w-3 h-3 rounded-full object-cover shrink-0 select-none bg-white/10" 
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span>{name}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Sort triggers */}
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 hover:bg-white/5 text-gray-500 hover:text-white rounded disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === items.length - 1}
                      className="p-1.5 hover:bg-white/5 text-gray-500 hover:text-white rounded disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Hide toggle */}
                    <button
                      onClick={() => handleToggleHide(item.id)}
                      className={`p-1.5 rounded cursor-pointer ${item.isHidden ? 'text-red-400 hover:text-red-300' : 'text-[#00F0FF] hover:text-[#00F0FF]/80'}`}
                      title={item.isHidden ? "Make visible" : "Hide from store option"}
                    >
                      {item.isHidden ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-white/5 rounded cursor-pointer"
                      title="Edit labels"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-500 hover:text-red-400 hover:bg-white/5 rounded cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
