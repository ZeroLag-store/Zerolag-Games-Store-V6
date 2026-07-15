import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import ProductCard from '../components/ProductCard';
import { Filter, Search, X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';

export default function Shop() {
  const { taxonomies } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  // Advanced Filtering States
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Dynamic homepage sections stream
  const [homepageSections, setHomepageSections] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'homepage_sections'), (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(s => s.isActive !== false);
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setHomepageSections(list);
    }, (err) => {
      console.error("Failed loading homepage sections for filters", err);
    });
    return () => unsub();
  }, []);

  const activeCategory = searchParams.get('category') || 'All';
  const activePlatform = searchParams.get('platform') || 'All';
  const activeCollection = searchParams.get('collection') || 'All';
  const activeHomepageSection = searchParams.get('homepage_section') || 'All';
  const activeSubcategory = searchParams.get('subcategory') || 'All';

  let categoriesRaw = [...(taxonomies?.categories || [])];
  if (categoriesRaw.length === 0) {
    categoriesRaw = [
      { id: 'games', name: 'Games', nameAr: 'ألعاب', displayOrder: 1, isHidden: false, subcategories: ['PS4', 'PS5', 'PC', 'Keys'] },
      { id: 'subscriptions', name: 'Subscriptions', nameAr: 'اشتراكات', displayOrder: 2, isHidden: false, subcategories: ['PS Plus', 'EA Play', 'Game Pass'] },
      { id: 'gift_cards', name: 'Gift Cards', nameAr: 'بطاقات الهدايا', displayOrder: 3, isHidden: false, subcategories: ['USD Razer Gold', 'Google Play', 'Steam Wallet', 'PSN Cards', 'Xbox Digital', 'iTunes'] },
      { id: 'top_up', name: 'Top Up', nameAr: 'شحن ألعاب', displayOrder: 4, isHidden: false, subcategories: ['PUBG UC', 'Free Fire Diamonds', 'Valorant Points', 'FC Points'] },
      { id: 'hardware', name: 'Hardware', nameAr: 'أجهزة وملحقات', displayOrder: 5, isHidden: false, subcategories: ['Mouse', 'Keyboard', 'Headset', 'Mouse Pad', 'Controller', 'Microphone', 'Webcam', 'Gaming Chair', 'Desk', 'Monitor', 'SSD', 'HDD', 'RAM', 'GPU', 'CPU', 'Motherboard', 'Power Supply', 'Cooling', 'Laptop', 'Accessories'] },
      { id: 'services', name: 'Services', nameAr: 'خدمات', displayOrder: 6, isHidden: false, subcategories: ['Fifa Packs', 'FC Coins', 'Cheats'] }
    ];
  } else {
    const hasHardware = categoriesRaw.some((c: any) => c.name.toLowerCase() === 'hardware');
    if (!hasHardware) {
      categoriesRaw.push({
        id: 'hardware',
        name: 'Hardware',
        nameAr: 'أجهزة وملحقات',
        displayOrder: 5,
        isHidden: false,
        subcategories: ['Mouse', 'Keyboard', 'Headset', 'Mouse Pad', 'Controller', 'Microphone', 'Webcam', 'Gaming Chair', 'Desk', 'Monitor', 'SSD', 'HDD', 'RAM', 'GPU', 'CPU', 'Motherboard', 'Power Supply', 'Cooling', 'Laptop', 'Accessories']
      });
    } else {
      categoriesRaw = categoriesRaw.map((c: any) => c.name.toLowerCase() === 'hardware' ? { ...c, isHidden: false } : c);
    }
  }

  const categories = ['All', ...categoriesRaw.filter((c: any) => !c.isHidden).map((c: any) => c.name)];
  const platforms = ['All', ...(taxonomies?.platforms || []).filter((p: any) => !p.isHidden).map((p: any) => p.name)];
  const genres = ['All', ...(taxonomies?.genres || []).filter((g: any) => !g.isHidden).map((g: any) => g.name)];
  const collections = ['All', ...(taxonomies?.collections || []).filter((c: any) => !c.isHidden).map((c: any) => ({ id: c.id, name: c.name }))];

  const currentCategoryObj = categoriesRaw.find((c: any) => c.name.toLowerCase() === activeCategory.toLowerCase());
  const activeSubcategories = currentCategoryObj?.subcategories || [];

  // Sync search query from URL when browser navigation happens
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== searchQuery) {
      setSearchQuery(q);
      setDebouncedSearchQuery(q);
    }
  }, [searchParams]);

  // Sync searchQuery with URL after a short debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (searchQuery) {
          newParams.set('q', searchQuery);
        } else {
          newParams.delete('q');
        }
        return newParams;
      }, { replace: true });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, setSearchParams]);

  // Fetch active products from Firestore once on mount (index-free and ultra-fast in-memory processing)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(p => !p.isDeleted && !p.isArchived && !p.isHidden);
        setProducts(data);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'products_list');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Apply search query filtering and sorting in-memory
  useEffect(() => {
    let result = [...products];

    // Category Filter Grouping (including legacy/genre mappings like Action/RPG onto Games)
    if (activeCategory && activeCategory !== 'All') {
      result = result.filter(p => {
        const cat = p.category || '';
        if (activeCategory === 'Games') {
          return cat === 'Games' || cat === 'Action' || cat === 'RPG' || (!['Subscriptions', 'Gift Cards', 'Hardware', 'Services'].includes(cat));
        }
        return cat.toLowerCase() === activeCategory.toLowerCase();
      });
    }

    // Platform Filter
    if (activePlatform && activePlatform !== 'All') {
      result = result.filter(p => (p.platform || '').toLowerCase() === activePlatform.toLowerCase());
    }

    // Hardware Subcategory Filter (Active only in Hardware storefront section)
    if (activeCategory === 'Hardware' && activeSubcategory && activeSubcategory !== 'All') {
      result = result.filter(p => (p.subcategory || '').toLowerCase() === activeSubcategory.toLowerCase());
    }

    // Filter by search query
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      const searchTerms = q.split(/\s+/).filter(t => t.length > 0);

      result = result.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const platform = (p.platform || '').toLowerCase();
        
        // Match if ALL search terms match SOMETHING in the product
        return searchTerms.every(term => {
          // 1. Direct inclusion (standard search)
          if (name.includes(term) || desc.includes(term) || category.includes(term) || platform.includes(term)) {
            return true;
          }

          // 2. Simple typo forgiveness (only for longer terms)
          if (term.length >= 3) {
            // Check if name contains most characters of the term in order (fuzzy match)
            let matchCount = 0;
            let lastIdx = -1;
            for (let i = 0; i < term.length; i++) {
              const idx = name.indexOf(term[i], lastIdx + 1);
              if (idx !== -1) {
                matchCount++;
                lastIdx = idx;
              }
            }
            // If 80%+ of characters match in order, count as a match
            if (matchCount / term.length >= 0.8) return true;
          }
          
          return false;
        });
      });

      // Bonus: Sort by relevance (Exact matches first)
      result.sort((a, b) => {
        const aName = (a?.name || '').toLowerCase();
        const bName = (b?.name || '').toLowerCase();
        const aExact = aName.includes(q) ? 1 : 0;
        const bExact = bName.includes(q) ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        const aStart = aName.startsWith(q) ? 1 : 0;
        const bStart = bName.startsWith(q) ? 1 : 0;
        return bStart - aStart;
      });
    }

    // Filter by Price range
    const minVal = parseFloat(minPrice);
    if (!isNaN(minVal)) {
      result = result.filter(p => {
        const finalPrice = p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
        return finalPrice >= minVal;
      });
    }

    const maxVal = parseFloat(maxPrice);
    if (!isNaN(maxVal)) {
      result = result.filter(p => {
        const finalPrice = p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
        return finalPrice <= maxVal;
      });
    }

    // Filter by Genre
    if (selectedGenre && selectedGenre !== 'All') {
      result = result.filter(p => (p.genre || '').toLowerCase() === selectedGenre.toLowerCase());
    }

    // Filter by Active dynamic Collection
    if (activeCollection && activeCollection !== 'All') {
      const collId = activeCollection.toLowerCase();
      result = result.filter(p => {
        if (collId === 'featured') return p.featured === true;
        if (collId === 'trending') return p.trending === true;
        if (collId === 'bestsellers' || collId === 'recommended') return p.featured === true || p.discount > 5;
        // Check tag inclusion
        return p.tags?.some((t: string) => t.toLowerCase() === collId) || false;
      });
    }

    // Filter by Active dynamic Homepage Section
    if (activeHomepageSection && activeHomepageSection !== 'All') {
      const targetSec = homepageSections.find(s => s.id === activeHomepageSection);
      if (targetSec && targetSec.assignedProductIds) {
        result = result.filter(p => targetSec.assignedProductIds.includes(p.id));
      } else {
        result = []; // Clear products list if selected section hasn't got matching products
      }
    }

    // Filter by Special Offers (Discounted)
    if (onlyDiscounted) {
      result = result.filter(p => p.discount > 0);
    }

    // Filter by Instock quantity
    if (onlyInStock) {
      result = result.filter(p => {
        const isHardware = p.category === 'Hardware';
        const hasPS4 = (p.ps4PrimaryStock ?? 0) > 0;
        const hasPS5 = (p.ps5PrimaryStock ?? 0) > 0;
        const hasSec = (p.secondaryStock ?? 0) > 0;
        return isHardware
          ? (p.ps4PrimaryStock ?? 0) > 0 && p.stockStatus !== 'Out of Stock'
          : (hasPS4 || hasPS5 || hasSec) && p.stockStatus !== 'Out of Stock';
      });
    }

    // Sort products (if not already sorted by search relevance or combined)
    // Only apply the UI sort if it wasn't a strong search session or as a secondary tier
    if (sortBy !== 'newest' || !debouncedSearchQuery) {
      result.sort((a, b) => {
        const getFinalPrice = (p: any) => p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
        
        if (sortBy === 'price-low') {
          return getFinalPrice(a) - getFinalPrice(b);
        }
        if (sortBy === 'price-high') {
          return getFinalPrice(b) - getFinalPrice(a);
        }
        if (sortBy === 'newest') {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        }
        return 0;
      });
    }

    setFilteredProducts(result);
  }, [debouncedSearchQuery, products, sortBy, minPrice, maxPrice, selectedGenre, onlyDiscounted, onlyInStock, activeCollection, activeHomepageSection, homepageSections, activeCategory, activePlatform, activeSubcategory]);

  const handleFilterChange = (type: 'category' | 'platform' | 'collection' | 'homepage_section', value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'All') {
      newParams.delete(type);
    } else {
      newParams.set(type, value);
    }
    
    // Prune active subcategory filter when migrating to a different primary category
    if (type === 'category' && value !== 'Hardware') {
      newParams.delete('subcategory');
    }
    
    setSearchParams(newParams);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', value);
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 min-h-screen">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-black uppercase tracking-tighter">
            THE <span className="text-[#00F0FF]">VAULT</span>
          </h1>
          <p className="text-gray-400 uppercase text-xs font-bold tracking-[0.3em]">
            Exploring {filteredProducts.length} Premium Gaming Assets
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00F0FF] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search games, keys, subs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-sans"
            />
          </div>

          <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full xs:w-48">
              <select 
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full h-full appearance-none bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-[#00F0FF]/50 transition-all cursor-pointer select-none"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full xs:w-auto flex h-14 items-center justify-center gap-2 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all cursor-pointer select-none ${showFilters ? 'bg-[#00F0FF] text-black shadow-[0_0_15px_#00F0FF55]' : 'bg-white/5 text-white border border-white/10'}`}
            >
              <Filter size={18} />
              <span>Filters</span>
              {showFilters ? <X size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Category Navigation Bar (Breakers Store style) */}
      <div className="bg-[#151619]/40 border border-white/5 rounded-3xl p-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-2 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleFilterChange('category', cat)}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all duration-300 cursor-pointer h-11 ${
                  isActive
                    ? 'bg-[#00F0FF] text-[#0B0B0F] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)] font-black'
                    : 'bg-[#0B0B0F]/45 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white hover:border-white/10'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Dynamic Subcategories Bar with Icon Support */}
      {activeCategory !== 'All' && activeSubcategories.length > 0 && (
        <div className="bg-[#151619]/40 border border-[#00F0FF]/15 rounded-3xl p-3 mt-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1.5 px-2 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none">
            {['All', ...activeSubcategories.map((sub: any) => typeof sub === 'string' ? sub : sub.name)].map((subName) => {
              const isActive = (subName === 'All' && activeSubcategory === 'All') || (activeSubcategory === subName);
              
              const subObj = activeSubcategories.find((s: any) => (typeof s === 'string' ? s : s.name) === subName);
              const imgUrl = (subObj && typeof subObj !== 'string') ? subObj.imageUrl : '';

              return (
                <button
                  key={subName}
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    if (subName === 'All') {
                      newParams.delete('subcategory');
                    } else {
                      newParams.set('subcategory', subName);
                    }
                    setSearchParams(newParams);
                  }}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 cursor-pointer flex items-center gap-2.5 h-10 ${
                    isActive
                      ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                      : 'bg-[#0B0B0F]/45 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  {imgUrl && (
                    <img 
                      src={imgUrl} 
                      alt={subName} 
                      className="w-4 h-4 rounded-full object-contain shrink-0 select-none bg-white/5 border border-white/10" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span>{subName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Slide Drawer / Bottom-Sheet (Mobile) and Accordion (Desktop) */}
      <AnimatePresence>
        {showFilters && (
          <>
            {/* Mobile View Slider Bottom-Sheet */}
            <div className="lg:hidden">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150]"
              />
              {/* Sheet container */}
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 right-0 bottom-0 max-h-[85vh] bg-[#121316] border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-[160] rounded-t-[2rem] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <Filter className="text-[#00F0FF]" size={16} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Refine Catalog Filters</h3>
                  </div>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-12 select-none">
                  {/* Category */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF]">Categories</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map(cat => (
                        <button 
                          key={cat}
                          type="button"
                          onClick={() => handleFilterChange('category', cat)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeCategory === cat ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-[#151619] border border-white/5 hover:border-white/10 text-gray-400'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF]">Platforms</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map(plat => (
                        <button 
                          key={plat}
                          type="button"
                          onClick={() => handleFilterChange('platform', plat)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activePlatform === plat ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-[#151619] border border-white/5 hover:border-white/10 text-gray-400'}`}
                        >
                          {plat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collections */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF]">Collections</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {['All', ...collections.filter(c => c !== 'All').map(c => typeof c === 'string' ? c : c.name)].map(collName => {
                        const collObj = typeof collections.find(c => typeof c !== 'string' && c.name === collName) === 'object' 
                          ? collections.find(c => typeof c !== 'string' && c.name === collName) as any
                          : null;
                        const collId = collObj ? collObj.id : 'All';
                        const isActive = activeCollection === collId;
                        return (
                          <button 
                            key={collId}
                            type="button"
                            onClick={() => handleFilterChange('collection', collId)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isActive ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-[#151619] border border-white/5 hover:border-white/10 text-gray-400'}`}
                          >
                            {collName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Homepage Sections */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF]">Home Showcase</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {['All', ...homepageSections].map(sec => {
                        const secId = typeof sec === 'string' ? 'All' : sec.id;
                        const secName = typeof sec === 'string' ? 'All' : (sec.titleEn || sec.title || 'Untitled Showcase');
                        const isActive = activeHomepageSection === secId;
                        return (
                          <button 
                            key={secId}
                            type="button"
                            onClick={() => handleFilterChange('homepage_section', secId)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isActive ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-[#151619] border border-white/5 hover:border-white/10 text-gray-400'}`}
                          >
                            {secName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price and Status selectors */}
                  <div className="space-y-5 pt-3 border-t border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#00F0FF]">Price & Status</h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sub-genre Classification</label>
                        <select
                          value={selectedGenre}
                          onChange={(e) => setSelectedGenre(e.target.value)}
                          className="w-full bg-[#151619] border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none cursor-pointer"
                        >
                          <option value="All">All Sub-genres</option>
                          {genres.filter(g => g !== 'All').map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-sans">Price Range Bounds (EGP)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            placeholder="Min Price"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-1/2 bg-[#151619] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 text-center"
                          />
                          <span className="text-gray-500 font-bold">-</span>
                          <input
                            type="number"
                            placeholder="Max Price"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-1/2 bg-[#151619] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 text-center"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-1">
                        <label className="flex items-center gap-3.5 cursor-pointer text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white select-none">
                          <input
                            type="checkbox"
                            checked={onlyDiscounted}
                            onChange={(e) => setOnlyDiscounted(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-[#151619] text-[#00F0FF] focus:ring-transparent focus:ring-offset-0 cursor-pointer"
                          />
                          <span>Special Offers (Sale)</span>
                        </label>

                        <label className="flex items-center gap-3.5 cursor-pointer text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white select-none">
                          <input
                            type="checkbox"
                            checked={onlyInStock}
                            onChange={(e) => setOnlyInStock(e.target.checked)}
                            className="w-5 h-5 rounded border-white/20 bg-[#151619] text-[#00F0FF] focus:ring-transparent focus:ring-offset-0 cursor-pointer"
                          />
                          <span>Available In Stock</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-white/5 bg-[#17181C] flex gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchParams(new URLSearchParams());
                      setSearchQuery('');
                      setMinPrice('');
                      setMaxPrice('');
                      setSelectedGenre('All');
                      setOnlyDiscounted(false);
                      setOnlyInStock(false);
                      setShowFilters(false);
                    }}
                    className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white hover:text-red-400 rounded-xl text-xs font-extrabold uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-3.5 bg-[#00F0FF] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  >
                    Apply Refines
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Desktop View Inline Dropdown Expander */}
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="hidden lg:block overflow-hidden bg-[#151619] rounded-3xl border border-white/10 shadow-2xl"
            >
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {/* Category selector */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#00F0FF]">Categories</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {categories.map(cat => (
                      <button 
                        key={cat}
                        type="button"
                        onClick={() => handleFilterChange('category', cat)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeCategory === cat ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform selector */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#00F0FF]">Platforms</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {platforms.map(plat => (
                      <button 
                        key={plat}
                        type="button"
                        onClick={() => handleFilterChange('platform', plat)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activePlatform === plat ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collection selector */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#00F0FF]">Collections</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {['All', ...collections.filter(c => c !== 'All').map(c => typeof c === 'string' ? c : c.name)].map(collName => {
                      const collObj = typeof collections.find(c => typeof c !== 'string' && c.name === collName) === 'object' 
                        ? collections.find(c => typeof c !== 'string' && c.name === collName) as any
                        : null;
                      const collId = collObj ? collObj.id : 'All';
                      const isActive = activeCollection === collId;
                      return (
                        <button 
                          key={collId}
                          type="button"
                          onClick={() => handleFilterChange('collection', collId)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isActive ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                        >
                          {collName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Homepage Sections selector */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#00F0FF]">Home Showcase</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {['All', ...homepageSections].map(sec => {
                      const secId = typeof sec === 'string' ? 'All' : sec.id;
                      const secName = typeof sec === 'string' ? 'All' : (sec.titleEn || sec.title || 'Untitled Showcase');
                      const isActive = activeHomepageSection === secId;
                      return (
                        <button 
                          key={secId}
                          type="button"
                          onClick={() => handleFilterChange('homepage_section', secId)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isActive ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                          title={secName}
                        >
                          {secName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modifiers & Settings selector */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-[#00F0FF]">Price & Status</h4>
                  <div className="space-y-3">
                    {/* Genre search drop */}
                    <div className="relative">
                      <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] font-bold text-white focus:border-[#00F0FF]/50 outline-none cursor-pointer pointer-events-auto"
                      >
                        <option value="All" className="bg-[#151619]">All Sub-genres</option>
                        {genres.filter(g => g !== 'All').map(g => (
                          <option key={g} value={g} className="bg-[#151619]">{g}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price inputs */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min EGP"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-1/2 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] text-white focus:outline-none focus:border-[#00F0FF]/40 text-center"
                      />
                      <span className="text-gray-650 text-[10px] font-bold">-</span>
                      <input
                        type="number"
                        placeholder="Max EGP"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-1/2 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[10px] text-white focus:outline-none focus:border-[#00F0FF]/40 text-center"
                      />
                    </div>

                    {/* Toggle checkboxes */}
                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={onlyDiscounted}
                          onChange={(e) => setOnlyDiscounted(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-[#00F0FF] focus:ring-transparent focus:ring-offset-0 cursor-pointer animate-none"
                        />
                        <span>Special Offers (Sale)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={onlyInStock}
                          onChange={(e) => setOnlyInStock(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-[#00F0FF] focus:ring-transparent focus:ring-offset-0 cursor-pointer animate-none"
                        />
                        <span>Available In Stock</span>
                      </label>
                    </div>

                    {/* Reset Filters */}
                    <div className="pt-1.5 border-t border-white/5">
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchParams(new URLSearchParams());
                          setSearchQuery('');
                          setMinPrice('');
                          setMaxPrice('');
                          setSelectedGenre('All');
                          setOnlyDiscounted(false);
                          setOnlyInStock(false);
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors cursor-pointer block text-center w-full"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[4/5] bg-white/5 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-32 text-center"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-[#00F0FF]/20 blur-[60px] rounded-full" />
            <div className="relative w-32 h-32 bg-[#151619] border border-[#00F0FF]/30 rounded-3xl flex items-center justify-center rotate-12 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
              <Search className="w-16 h-16 text-[#00F0FF] -rotate-12" />
            </div>
          </div>
          <h3 className="text-3xl font-black uppercase tracking-tight mb-4">No products available</h3>
          <p className="text-gray-400 max-w-sm mx-auto mb-10 font-medium">
            We couldn't find any gaming gear matching your query. Try clearing filters or exploring our newest additions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => {
                setSearchParams(new URLSearchParams());
                setSearchQuery('');
              }}
              className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#00F0FF] transition-all"
            >
              Reset Filters
            </button>
            <Link 
              to="/shop?category=Games"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all font-black"
            >
              Browse Games
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
