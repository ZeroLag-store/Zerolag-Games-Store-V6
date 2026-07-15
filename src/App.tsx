import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Contact from './pages/Contact';
import About from './pages/About';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import CustomerLookup from './pages/CustomerLookup';
import { LanguageProvider } from './contexts/LanguageContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AISupportHub from './components/AISupportHub';
import ComparisonBar from './components/ComparisonBar';
import CartDrawer from './components/CartDrawer';

import { Product } from './types';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  userRole: 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER';
  loading: boolean;
  config: any;
  storeSettings: any;
  taxonomies: any;
  cart: any[];
  addToCart: (product: any, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  showToast: (message: string) => void;
  compareList: Product[];
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  isAdmin: false, 
  userRole: 'CUSTOMER',
  loading: true, 
  config: null,
  storeSettings: null,
  taxonomies: { categories: [], platforms: [], genres: [], collections: [] },
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  wishlist: [],
  toggleWishlist: () => {},
  showToast: () => {},
  compareList: [],
  toggleCompare: () => {},
  clearCompare: () => {},
  isCartOpen: false,
  setIsCartOpen: () => {}
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CUSTOMER'>('CUSTOMER');
  const [config, setConfig] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [taxonomies, setTaxonomies] = useState<any>({
    categories: [],
    platforms: [],
    genres: [],
    collections: []
  });
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('zl_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zl_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('zl_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('zl_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const getItemStockLimit = (item: any) => {
    const isHardware = item.category === 'Hardware';
    if (item.stockStatus === 'Out of Stock') return 0;
    if (isHardware) {
      return Math.max(0, item.ps4PrimaryStock ?? 0);
    }
    const slot = item.selectedSlotType;
    if (slot === 'PS4_PRIMARY') {
      return Math.max(0, item.ps4PrimaryStock ?? 0);
    } else if (slot === 'PS5_PRIMARY') {
      return Math.max(0, item.ps5PrimaryStock ?? 0);
    } else if (slot === 'SECONDARY') {
      return Math.max(0, item.secondaryStock ?? 0);
    }
    // Fallback if slot is undefined / not specified (e.g. Added from ProductCard overview)
    return Math.max(0, (item.ps4PrimaryStock ?? 0) + (item.ps5PrimaryStock ?? 0) + (item.secondaryStock ?? 0));
  };

  const addToCart = (product: any, quantity: number = 1) => {
    const stockLimit = getItemStockLimit(product);
    if (stockLimit <= 0) {
      showToast('Error: This item is out of stock');
      return;
    }
    
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > stockLimit) {
          showToast(`Cannot add more. Stock limit is ${stockLimit}`);
          return prev.map(item => 
            item.id === product.id ? { ...item, quantity: stockLimit } : item
          );
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      const finalQty = Math.min(quantity, stockLimit);
      return [...prev, { ...product, quantity: finalQty }];
    });
    showToast(`${product.name} added to cart`);
    
    // Play subtle success sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {}); // Catch browser policy blocks
    } catch (e) {}
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const stockLimit = getItemStockLimit(item);
        const desiredQty = Math.max(1, quantity);
        const finalQty = Math.min(desiredQty, stockLimit);
        if (desiredQty > stockLimit) {
          showToast(`Only ${stockLimit} units available in stock`);
        }
        return { ...item, quantity: finalQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from Wishlist');
        return prev.filter(id => id !== productId);
      }
      showToast('Added to Wishlist');
      return [...prev, productId];
    });
  };

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 4) {
        showToast('Max 4 products for comparison');
        return prev;
      }
      return [...prev, product];
    });
  };

  const clearCompare = () => setCompareList([]);

  useEffect(() => {
    let unsubStore: () => void = () => {};
    let unsubTaxonomy: () => void = () => {};

    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'global'));
        if (configDoc.exists()) {
          setConfig(configDoc.data());
        }

        // Establish taxonomy snapshot listener
        unsubTaxonomy = onSnapshot(doc(db, 'settings', 'taxonomy'), (snap) => {
          if (snap.exists()) {
            setTaxonomies(snap.data());
          }
        }, (err) => {
          console.error("Taxonomy snapshot loading failed: ", err);
        });

        // Establish realtime database snapshot listener for store settings
        unsubStore = onSnapshot(doc(db, 'settings', 'store'), (snap) => {
          if (snap.exists()) {
            const storeData = snap.data();
            setStoreSettings(storeData);

            // Apply dynamic browser updates (favicon, tab title)
            if (storeData.storeName) {
              document.title = storeData.storeName;
            }
            if (storeData.faviconUrl) {
              let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
              if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
              }
              link.href = storeData.faviconUrl;
            }

            // Inject colors as document variables
            const primary = storeData.primaryColor || '#00F0FF';
            const secondary = storeData.secondaryColor || '#6C5CE7';
            document.documentElement.style.setProperty('--neon-blue-color', primary);
            document.documentElement.style.setProperty('--glow-purple-color', secondary);
          }
        }, (err) => {
          console.error("Store settings realtime snapshot listener failed: ", err);
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'config/global');
      }
    };
    fetchConfig();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          let userSnap = await getDoc(userDocRef);
          
          // Auto-create permanent owner profile if user is zerolag0000@gmail.com / has the target UID and no profile is found
          if (currentUser.email === 'zerolag0000@gmail.com' || currentUser.uid === 'gnT4haA1tdVYDpzpDzR1TUBA37c2') {
            if (!userSnap.exists()) {
              try {
                await setDoc(doc(db, 'users', 'gnT4haA1tdVYDpzpDzR1TUBA37c2'), {
                  email: "zerolag0000@gmail.com",
                  role: "OWNER",
                  createdAt: serverTimestamp()
                });
                console.log("Successfully created permanent owner profile document in Firestore: gnT4haA1tdVYDpzpDzR1TUBA37c2");
                userSnap = await getDoc(userDocRef);
              } catch (createErr) {
                console.error("Failed to auto-create owner profile:", createErr);
              }
            }
          }

          if (currentUser.email === 'zerolag0000@gmail.com' || currentUser.uid === 'gnT4haA1tdVYDpzpDzR1TUBA37c2') {
            setUserRole('OWNER');
            setIsAdmin(true);
          } else if (userSnap.exists()) {
            const data = userSnap.data();
            const role = data.role || 'CUSTOMER';
            setUserRole(role);
            setIsAdmin(role === 'OWNER' || role === 'MANAGER' || role === 'EMPLOYEE' || role === 'admin');
          } else {
            setUserRole('CUSTOMER');
            setIsAdmin(false);
          }
        } catch (e) {
          console.error("Failed to load user role:", e);
          if (currentUser.email === 'zerolag0000@gmail.com' || currentUser.uid === 'gnT4haA1tdVYDpzpDzR1TUBA37c2') {
            setUserRole('OWNER');
            setIsAdmin(true);
          } else {
            setUserRole('CUSTOMER');
            setIsAdmin(false);
          }
        }
      } else {
        setUserRole('CUSTOMER');
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubStore();
      unsubTaxonomy();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#00F0FF]"></div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <AuthContext.Provider value={{ 
        user, isAdmin, userRole, loading, config, storeSettings, taxonomies, cart, addToCart, removeFromCart, 
        updateQuantity, clearCart, wishlist, toggleWishlist, showToast,
        compareList, toggleCompare, clearCompare, isCartOpen, setIsCartOpen
      }}>
        <Router>
          <div className="min-h-screen bg-[#0B0B0F] text-white selection:bg-[#00F0FF] selection:text-black">
            <Navbar />
            
            {/* Toast Notification */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 50, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: 20, x: '-50%' }}
                  className="fixed bottom-8 left-1/2 z-[200] bg-[#151619]/90 backdrop-blur-md border border-[#00F0FF]/30 px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.15)] flex items-center gap-4 lg:bottom-12 min-w-[280px]"
                >
                  <div className="w-2 h-2 bg-[#00F0FF] rounded-full animate-pulse shadow-[0_0_10px_#00F0FF]"></div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white whitespace-nowrap">{toast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <main className="pt-20 pb-12">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/lookup" element={<CustomerLookup />} />
                <Route 
                  path="/admin/*" 
                  element={isAdmin ? <Admin /> : <Navigate to="/login" />} 
                />
              </Routes>
            </main>
            <Footer />
            <ComparisonBar />
            <AISupportHub />
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          </div>
        </Router>
      </AuthContext.Provider>
    </LanguageProvider>
  );
}
