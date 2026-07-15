import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Archive, Eye, EyeOff, ArrowUp, ArrowDown, 
  Image as ImageIcon, Calendar, Sparkles, Save, X, RefreshCw, Layers
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { uploadMedia } from '../../lib/storageHelper';
import { FeaturedBanner } from '../../types';

interface BannersModuleProps {
  showToast: (msg: string) => void;
  onLogActivity?: (action: string, entity: string, details: string) => void;
}

export default function BannersModule({ showToast, onLogActivity }: BannersModuleProps) {
  const [banners, setBanners] = useState<FeaturedBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<FeaturedBanner | null>(null);
  
  // Image Upload States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingMobileImage, setUploadingMobileImage] = useState(false);
  const [mainImageProgress, setMainImageProgress] = useState<number | null>(null);
  const [mobileImageProgress, setMobileImageProgress] = useState<number | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('EXPLORE');
  const [buttonUrl, setButtonUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [bgColor, setBgColor] = useState('from-[#00F0FF] via-[#050508] to-[#6C5CE7]');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Tab View for Admin Banners (Active vs Archived)
  const [viewTab, setViewTab] = useState<'all' | 'archived'>('all');

  // Real-time synchronization
  useEffect(() => {
    console.log("[BANNERS SERVICE] Establishing realtime snapshot listener for 'featured_banners'...");
    const unsub = onSnapshot(collection(db, 'featured_banners'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FeaturedBanner[];
      // Sort first by displayOrder asc, then by priority (high first), then date
      list.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        const priorityVal = { high: 3, medium: 2, low: 1 };
        return (priorityVal[b.priority] || 0) - (priorityVal[a.priority] || 0);
      });
      setBanners(list);
      setLoading(false);
    }, (err) => {
      console.error("[BANNERS SERVICE] Snap listener failed: ", err);
      showToast("Failed to load banners in real-time.");
      setLoading(false);
    });

    return () => {
      console.log("[BANNERS SERVICE] Detaching realtime banners listener...");
      unsub();
    };
  }, []);

  // Set form values when editing a banner
  const openEdit = (banner: FeaturedBanner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setDescription(banner.description || '');
    setButtonText(banner.buttonText || 'EXPLORE');
    setButtonUrl(banner.buttonUrl || '');
    setImageUrl(banner.imageUrl);
    setMobileImageUrl(banner.mobileImageUrl || '');
    setBgColor(banner.bgColor || 'from-[#00F0FF] via-[#050508] to-[#6C5CE7]');
    setTextColor(banner.textColor || '#FFFFFF');
    setPriority(banner.priority);
    setDisplayOrder(banner.displayOrder);
    setIsActive(banner.isActive);
    setStartDate(banner.startDate || '');
    setEndDate(banner.endDate || '');
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setDescription('');
    setButtonText('EXPLORE');
    setButtonUrl('');
    setImageUrl('');
    setMobileImageUrl('');
    setBgColor('from-[#FF005C] via-[#050508] to-[#00F0FF]');
    setTextColor('#FFFFFF');
    setPriority('medium');
    // Default display order to the highest current + 1
    const maxOrder = banners.reduce((acc, current) => Math.max(acc, current.displayOrder), 0);
    setDisplayOrder(maxOrder + 1);
    setIsActive(true);
    setStartDate('');
    setEndDate('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBanner(null);
  };

  // Image Upload Service Handlers
  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setMainImageProgress(0);
    try {
      console.log("[BANNERS SERVICE] Uploading banner main image file...");
      const res = await uploadMedia(file, (percent) => {
        setMainImageProgress(percent);
      });
      setImageUrl(res.url);
      showToast("SUCCESS: Banner main cover uploaded successfully.");
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    } finally {
      setUploadingImage(false);
      setMainImageProgress(null);
    }
  };

  const handleMobileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMobileImage(true);
    setMobileImageProgress(0);
    try {
      console.log("[BANNERS SERVICE] Uploading banner mobile image file...");
      const res = await uploadMedia(file, (percent) => {
        setMobileImageProgress(percent);
      });
      setMobileImageUrl(res.url);
      showToast("SUCCESS: Mobile banner updated successfully.");
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    } finally {
      setUploadingMobileImage(false);
      setMobileImageProgress(null);
    }
  };

  // CRUD Actions
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Banner Title is required.");
      return;
    }
    if (!imageUrl.trim()) {
      showToast("Banner Image URL is required.");
      return;
    }

    const payload = {
      title,
      subtitle,
      description,
      buttonText,
      buttonUrl,
      imageUrl,
      mobileImageUrl,
      bgColor,
      textColor,
      priority,
      displayOrder: Number(displayOrder),
      isActive,
      startDate,
      endDate,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingBanner) {
        console.log("[BANNERS SERVICE] Updating banner: ", editingBanner.id, payload);
        const docRef = doc(db, 'featured_banners', editingBanner.id);
        await updateDoc(docRef, payload);
        showToast("SUCCESS: Changes saved successfully.");
        if (onLogActivity) {
          onLogActivity("Edit Banner", "Marketing", `Updated banner title: ${title}`);
        }
      } else {
        const createPayload = {
          ...payload,
          isArchived: false,
          createdAt: new Date().toISOString()
        };
        console.log("[BANNERS SERVICE] Creating new banner: ", createPayload);
        await addDoc(collection(db, 'featured_banners'), createPayload);
        showToast("SUCCESS: Changes saved successfully.");
        if (onLogActivity) {
          onLogActivity("Create Banner", "Marketing", `Created banner title: ${title}`);
        }
      }
      setIsFormOpen(false);
      setEditingBanner(null);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, editingBanner ? OperationType.WRITE : OperationType.WRITE, 'featured_banners');
      showToast(`ERROR: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string, bannerTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete banner "${bannerTitle}"?`)) {
      return;
    }

    try {
      console.log("[BANNERS SERVICE] Purging banner document: ", id);
      await deleteDoc(doc(db, 'featured_banners', id));
      showToast("SUCCESS: Changes saved successfully.");
      if (onLogActivity) {
        onLogActivity("Delete Banner", "Marketing", `Permanently purged banner title: ${bannerTitle}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    }
  };

  const handleToggleActive = async (banner: FeaturedBanner) => {
    try {
      console.log("[BANNERS SERVICE] Toggling active status for: ", banner.id);
      await updateDoc(doc(db, 'featured_banners', banner.id), {
        isActive: !banner.isActive,
        updatedAt: new Date().toISOString()
      });
      showToast("SUCCESS: Changes saved successfully.");
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    }
  };

  const handleToggleArchive = async (banner: FeaturedBanner) => {
    const isArchiving = !banner.isArchived;
    try {
      console.log("[BANNERS SERVICE] Toggling archive status for: ", banner.id);
      await updateDoc(doc(db, 'featured_banners', banner.id), {
        isArchived: isArchiving,
        updatedAt: new Date().toISOString()
      });
      showToast("SUCCESS: Changes saved successfully.");
      if (onLogActivity) {
        onLogActivity(isArchiving ? "Archive Banner" : "Unarchive Banner", "Marketing", `${isArchiving ? 'Archived' : 'Unarchived'} banner: ${banner.title}`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    }
  };

  // Reordering Handlers (Up / Down Priority adjustments)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const filteredBanners = banners.filter(b => viewTab === 'archived' ? b.isArchived : !b.isArchived);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === filteredBanners.length - 1) return;

    const currentBanner = filteredBanners[index];
    const targetBanner = direction === 'up' ? filteredBanners[index - 1] : filteredBanners[index + 1];

    if (!currentBanner || !targetBanner) return;

    try {
      console.log("[BANNERS SERVICE] Swapping orders between banners: ", currentBanner.title, " and ", targetBanner.title);
      
      const tempOrder = currentBanner.displayOrder;
      
      await updateDoc(doc(db, 'featured_banners', currentBanner.id), {
        displayOrder: targetBanner.displayOrder,
        updatedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'featured_banners', targetBanner.id), {
        displayOrder: tempOrder,
        updatedAt: new Date().toISOString()
      });

      showToast("SUCCESS: Changes saved successfully.");
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    }
  };

  const getPriorityBadge = (p: 'low' | 'medium' | 'high') => {
    switch (p) {
      case 'high':
        return <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded text-[8px] font-black uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25 rounded text-[8px] font-black uppercase tracking-wider">Medium</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 border border-white/5 rounded text-[8px] font-black uppercase tracking-wider">Low</span>;
    }
  };

  const isScheduledActive = (banner: FeaturedBanner) => {
    const now = new Date();
    if (banner.startDate) {
      const start = new Date(banner.startDate);
      if (now < start) return false;
    }
    if (banner.endDate) {
      const end = new Date(banner.endDate);
      if (now > end) return false;
    }
    return true;
  };

  const filteredBanners = banners.filter(b => {
    if (viewTab === 'archived') return b.isArchived === true;
    return !b.isArchived;
  });

  return (
    <div className="space-y-6">
      {/* Module Hub Banner */}
      <div className="relative p-8 bg-[#151619] rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-pink-500/10 text-pink-400 rounded-full text-[9px] font-black uppercase tracking-widest font-mono">
              MARKETING DISPATCH
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-black uppercase font-mono border border-emerald-500/20">
              Realtime Synced
            </span>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-normal text-white flex items-center gap-2">
              <Layers className="text-[#00F0FF]" /> Featured Display Banners
            </h2>
            <p className="text-xs text-gray-400 font-semibold uppercase leading-relaxed max-w-xl">
              Construct, arrange, schedule, and live-toggle immersive widescreen graphical campaign slides. Instant storefront reflect — zero site caching.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-[#0B0B0F] font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={3} /> Create Promo Banner
            </button>
            <div className="flex bg-black/40 border border-white/5 rounded-xl p-0.5">
              <button
                onClick={() => setViewTab('all')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  viewTab === 'all' ? 'bg-white/5 text-[#00F0FF]' : 'text-gray-400 hover:text-white'
                }`}
              >
                Active Slides ({banners.filter(b => !b.isArchived).length})
              </button>
              <button
                onClick={() => setViewTab('archived')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  viewTab === 'archived' ? 'bg-white/5 text-pink-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Archived ({banners.filter(b => b.isArchived).length})
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
          <Sparkles size={160} />
        </div>
      </div>

      {/* Main List Interface */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="animate-spin text-[#00F0FF] mx-auto" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-mono">
            FETCHING SECURED CLOUD BANNER MATRIX...
          </p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="p-16 text-center bg-[#151619] border border-white/5 rounded-[2.5rem] space-y-4">
          <ImageIcon className="text-gray-650 mx-auto" size={48} />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
            NO BANNERS DISCOVERED IN CORRESPONDING SECTOR
          </h3>
          <p className="text-[10px] text-gray-500 font-semibold uppercase max-w-sm mx-auto">
            Build your brand catalog by generating a custom animated featured high-converting slides card.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBanners.map((banner, index) => {
            const schedActive = isScheduledActive(banner);
            return (
              <div 
                key={banner.id} 
                className={`relative p-5 bg-[#151619] border rounded-3xl transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${
                  banner.isActive && schedActive ? 'border-white/5 hover:border-white/10' : 'border-red-500/10 opacity-70 bg-black/40'
                }`}
              >
                {/* Banner Mini Preview & Info */}
                <div className="flex flex-col sm:flex-row items-center gap-5 w-full md:w-3/5">
                  <div className="w-full sm:w-32 h-20 rounded-2xl overflow-hidden relative border border-white/10 flex-shrink-0 bg-black/40 shadow-inner">
                    <div className={`absolute inset-0 bg-gradient-to-r ${banner.bgColor || 'from-cyan-500 to-purple-500'} opacity-30 mix-blend-multiply`}></div>
                    <img 
                      src={banner.imageUrl} 
                      alt="Banner thumbnail" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 px-2 py-0.5 rounded border border-white/10 text-[8px] font-mono text-gray-400">
                      Order: {banner.displayOrder}
                    </div>
                  </div>

                  <div className="space-y-1 text-center sm:text-left w-full overflow-hidden">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-xs font-black uppercase tracking-tight text-white truncate max-w-full">
                        {banner.title}
                      </h4>
                      {getPriorityBadge(banner.priority)}
                      {!banner.isActive ? (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[7px] font-black uppercase">Disabled</span>
                      ) : !schedActive ? (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[7px] font-black uppercase">Out of Schedule</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[7px] font-black uppercase">Active</span>
                      )}
                    </div>
                    
                    {banner.subtitle && (
                      <p className="text-[#00F0FF] text-[10px] font-black uppercase tracking-wider">
                        {banner.subtitle}
                      </p>
                    )}
                    
                    {banner.description && (
                      <p className="text-gray-400 text-[10px] font-semibold uppercase line-clamp-1">
                        {banner.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[9px] text-gray-500 font-mono pt-1">
                      {banner.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> IN: {new Date(banner.startDate).toLocaleString()}
                        </span>
                      )}
                      {banner.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> OUT: {new Date(banner.endDate).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {banner.buttonText && (
                      <div className="text-[9px] font-bold text-gray-500">
                        BTN: <span className="text-white bg-white/5 py-0.5 px-2 border border-white/5 rounded-full">{banner.buttonText}</span> &rarr; <span className="text-[#00F0FF] underline">{banner.buttonUrl || "not set"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Order Arrange & Functional Actions */}
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-2/5">
                  {/* Order reordering */}
                  <div className="flex border border-white/5 bg-black/20 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-gray-400 hover:text-[#00F0FF] disabled:opacity-20 cursor-pointer"
                      title="Move Up Display Order"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === filteredBanners.length - 1}
                      className="p-1.5 text-gray-400 hover:text-[#00F0FF] disabled:opacity-20 cursor-pointer"
                      title="Move Down Display Order"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  {/* Toggle Active status */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      banner.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                    }`}
                    title={banner.isActive ? "Disable Banner" : "Enable Banner"}
                  >
                    {banner.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>

                  {/* Toggle Archive status */}
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(banner)}
                    className="p-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 rounded-xl transition-all"
                    title={banner.isArchived ? "Unarchive and Activate" : "Archive Banner"}
                  >
                    <Archive size={14} />
                  </button>

                  {/* Edit action */}
                  <button
                    type="button"
                    onClick={() => openEdit(banner)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Edit Banner Content"
                  >
                    <Edit size={14} />
                  </button>

                  {/* Delete action */}
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id, banner.title)}
                    className="p-2 bg-red-650/10 border border-red-650/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all cursor-pointer animate-pulse"
                    title="Permanently Purge Banner"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Slideover Form / Dialog for Create and Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#0B0B0F] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={handleCloseForm}
              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF] font-mono">
                {editingBanner ? "EDIT SLIDE DEFINITION" : "GENERATE NEW IMMERSIVE PROMO"}
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-[#00F0FF]" /> {editingBanner ? 'Modify Display Banner' : 'Create Display Banner'}
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Main Title, Subtitle & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Banner Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. GRAND THEFT AUTO VI DELUXE"
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF] font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Banner Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    placeholder="e.g. PRE-ORDER ACTIVE NOW"
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF] font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Short Promotional Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Lock in your activation primary slot at 50% discount during our flagship grand pre-order..."
                  rows={2}
                  className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF] font-semibold"
                />
              </div>

              {/* Action Buttons Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Button Copy text</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={e => setButtonText(e.target.value)}
                    placeholder="e.g. EXPLORE SHOP"
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF] font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Button Redirect URL</label>
                  <input
                    type="text"
                    value={buttonUrl}
                    onChange={e => setButtonUrl(e.target.value)}
                    placeholder="e.g. /shop or https://..."
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF] font-semibold"
                  />
                </div>
              </div>

              {/* Background Color & Text Color Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Carousel Gradient Color Theme (Tailwind format)</label>
                  <input
                    type="text"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    placeholder="e.g. from-[#FF005C] via-[#050508] to-[#00F0FF]"
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Typography Font Color (Hex code)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={e => setTextColor(e.target.value)}
                      className="w-10 h-10 bg-[#151619] border border-white/5 rounded-xl p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={e => setTextColor(e.target.value)}
                      placeholder="#FFFFFF"
                      className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                  </div>
                </div>
              </div>

              {/* IMAGE SECTOR (Drag & Drop + Upload controls) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Main banner graphic */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Desktop / Main Banner URL *</span>
                  {imageUrl ? (
                    <div className="relative group/main rounded-xl border border-white/10 h-24 overflow-hidden bg-black/40">
                      <img src={imageUrl} alt="Main Banner Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/main:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="px-2.5 py-1 bg-red-600 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 flex flex-col items-center justify-center bg-black/60 border border-white/5 rounded-xl text-center p-2 space-y-1">
                      <ImageIcon className="text-gray-650" size={24} />
                      <span className="text-[8px] text-gray-500 font-black uppercase">WIDESCREEN ARTWORK MISSING</span>
                    </div>
                  )}
                  <label className="block w-full text-center py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[8px] font-black uppercase cursor-pointer transition-colors">
                    {uploadingImage 
                      ? `STORING FILE (${mainImageProgress !== null ? mainImageProgress : 0}%)` 
                      : "Upload Widescreen Banner"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={handleMainImageChange}
                    />
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="Or paste Direct Graphic URL..."
                    className="w-full bg-black/65 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-mono focus:outline-none"
                  />
                </div>

                {/* Mobile portrait graphic */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">Mobile Device Optimized Banner URL</span>
                  {mobileImageUrl ? (
                    <div className="relative group/mobile rounded-xl border border-white/10 h-24 overflow-hidden bg-black/40">
                      <img src={mobileImageUrl} alt="Mobile Banner Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/mobile:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          onClick={() => setMobileImageUrl('')}
                          className="px-2.5 py-1 bg-red-600 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 flex flex-col items-center justify-center bg-black/60 border border-white/5 rounded-xl text-center p-2 space-y-1">
                      <ImageIcon className="text-gray-650" size={24} />
                      <span className="text-[8px] text-gray-500 font-black uppercase">MOBILE SLOTH ARTWORK</span>
                    </div>
                  )}
                  <label className="block w-full text-center py-2.5 bg-[#00F0FF]/5 hover:bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25 rounded-xl text-[8px] font-black uppercase cursor-pointer transition-colors">
                    {uploadingMobileImage 
                      ? `STORING FILE (${mobileImageProgress !== null ? mobileImageProgress : 0}%)` 
                      : "Upload Mobile Banner"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingMobileImage}
                      onChange={handleMobileImageChange}
                    />
                  </label>
                  <input
                    type="text"
                    value={mobileImageUrl}
                    onChange={e => setMobileImageUrl(e.target.value)}
                    placeholder="Or paste Mobile Graphic URL..."
                    className="w-full bg-black/65 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Priority, Display Order & Active Toggle status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Priority Weight</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF] font-semibold"
                  >
                    <option value="high">High (Featured First)</option>
                    <option value="medium">Medium Normal</option>
                    <option value="low">Low Fallback</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Manual Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={e => setDisplayOrder(Number(e.target.value))}
                    min={0}
                    placeholder="0"
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
                    Initially Enabled
                  </label>
                </div>
              </div>

              {/* Scheduling Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">
                    <Calendar size={11} className="text-[#00F0FF]" /> Campaign Launch Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">
                    <Calendar size={11} className="text-pink-400" /> Campaign Expiration Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              {/* Submit & Cancel */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl transition-colors cursor-pointer"
                >
                  DISCARD CHANGES
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-[#0B0B0F] font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_15px_#00F0FF33]"
                >
                  <Save size={12} strokeWidth={3} /> SAVE CAMPAIGN SLIDE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
