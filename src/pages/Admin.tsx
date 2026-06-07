import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  setDoc, getDoc, serverTimestamp, query, orderBy, limit, onSnapshot 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  Layout, Layers, Users, ShoppingCart, FileText, Award, Calendar, 
  BarChart3, Settings, ShieldAlert, LogOut, ShieldCheck, Mail, Loader2, RefreshCcw, Terminal, Image,
  Trash2, Check, X, MessageSquare, CreditCard, Bookmark, Compass, Sliders, Grid, Menu
} from 'lucide-react';

// Import our modular sub-ERP components
import Logo from '../components/Logo';
import DashboardModule from '../components/admin/DashboardModule';
import InventoryModule from '../components/admin/InventoryModule';
import CustomerModule from '../components/admin/CustomerModule';
import OrdersModule from '../components/admin/OrdersModule';
import ReceiptModule from '../components/admin/ReceiptModule';
import WarrantyReservationModule from '../components/admin/WarrantyReservationModule';
import ReportingModule from '../components/admin/ReportingModule';
import CustomizationModule from '../components/admin/CustomizationModule';
import DiagnosticsModule from '../components/admin/DiagnosticsModule';
import BannersModule from '../components/admin/BannersModule';
import SupportModule from '../components/admin/SupportModule';
import TaxonomyModule from '../components/admin/TaxonomyModule';
import PaymentsModule from '../components/admin/PaymentsModule';
import HomepageSectionsModule from '../components/admin/HomepageSectionsModule';

import { 
  Product, DigitalAccount, Customer, Order, Receipt, 
  Warranty, Reservation, StaffRole, AuditLog 
} from '../types';

import { useAuth } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

export default function Admin() {
  const { user, userRole: actualRole, isAdmin } = useAuth();
  const { t } = useLanguage();
  
  // Guard access explicitly
  if (!user || !isAdmin || (actualRole !== 'OWNER' && actualRole !== 'MANAGER' && actualRole !== 'EMPLOYEE')) {
    return <Navigate to="/login" replace />;
  }

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<StaffRole>(actualRole as StaffRole);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);

  // Grouped Navigation menu structure for Left Sidebar
  const navGroups = [
    {
      title: 'STORE MANAGEMENT',
      items: [
        { id: 'dashboard', val: 'Dashboard', icon: <Layout size={14} /> },
        { id: 'customization', val: 'Site Config', icon: <Settings size={14} /> },
        { id: 'paymentMethods', val: 'Payment Methods', icon: <CreditCard size={14} /> },
        { id: 'diagnostics', val: 'SYSENG Diagnostics', icon: <Terminal size={14} /> },
      ]
    },
    {
      title: 'CATALOG MANAGEMENT',
      items: [
        { id: 'game_catalog', val: 'Game Catalog', icon: <Layers size={14} /> },
        { id: 'hardware_inventory', val: 'Hardware Stock', icon: <Grid size={14} /> },
        { id: 'digital_logins', val: 'Digital Logins', icon: <Users size={14} /> },
        { id: 'categories', val: 'Categories', icon: <Layers size={14} /> },
        { id: 'platforms', val: 'Platforms', icon: <Sliders size={14} /> },
        { id: 'genres', val: 'Genres', icon: <Compass size={14} /> },
        { id: 'collections', val: 'Collections', icon: <Bookmark size={14} /> },
      ]
    },
    {
      title: 'COMMERCE',
      items: [
        { id: 'orders', val: 'Sales Orders', icon: <ShoppingCart size={14} /> },
        { id: 'homepageSections', val: 'Homepage Sections', icon: <Grid size={14} /> },
        { id: 'banners', val: 'Banner Manager', icon: <Image size={14} /> },
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { id: 'crm', val: 'Client CRM', icon: <Users size={14} /> },
        { id: 'support', val: 'Claims / Tickets', icon: <MessageSquare size={14} /> },
      ]
    },
    {
      title: 'ANALYTICS & LEGAL',
      items: [
        { id: 'receipts', val: 'Receipt Maker', icon: <FileText size={14} /> },
        { id: 'warranties', val: 'SLA Contracts', icon: <Award size={14} /> },
        { id: 'reports', val: 'ERP Reports', icon: <BarChart3 size={14} /> },
      ]
    }
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'STORE MANAGEMENT': true,
    'CATALOG MANAGEMENT': true,
    'COMMERCE': true,
    'CUSTOMERS': true,
    'ANALYTICS & LEGAL': true
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<DigitalAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Target purge engine states
  const [purgeLogs, setPurgeLogs] = useState<string[]>([]);
  const [verificationStates, setVerificationStates] = useState<Record<string, { exists: boolean | null; timestamp: string }>>({});

  const performPermanentPurge = async (id: string, collectionName: 'products' | 'accounts', nameOrEmail: string) => {
    const docRef = doc(db, collectionName, id);
    try {
      setPurgeLogs(prev => [...prev, `[PURGELOG] Initializing permanent deletion: ${collectionName}/${id} (${nameOrEmail})`]);
      await deleteDoc(docRef);
      setPurgeLogs(prev => [...prev, `[PURGELOG] deleteDoc completed in FireStore.`]);
      
      // Perform immediate getDoc validation
      const docSnap = await getDoc(docRef);
      const exists = docSnap.exists();
      console.log(`[REALTIME VERIFIER] Document id: ${id}, exists: ${exists}`);
      
      setVerificationStates(prev => ({
        ...prev,
        [id]: { exists, timestamp: new Date().toLocaleTimeString() }
      }));
      setPurgeLogs(prev => [...prev, `[PURGELOG] VERIFICATION EXECUTED: docSnap.exists() === ${exists} (expected: false)`]);
      
      // Filter out immediately to provide zero trace in active arrays
      if (collectionName === 'products') {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        setAccounts(prev => prev.filter(a => a.id !== id));
      }
      
      showToast(`SUCCESS: ${nameOrEmail} deleted forever.`);
    } catch (err: any) {
      console.error(`[PURGELOG ERROR]`, err);
      setPurgeLogs(prev => [...prev, `[PURGELOG ERROR] ${err.message || String(err)}`]);
      showToast(`ERROR: ${err.message || err}`);
    }
  };

  // Disabled bootstrap logic permanently
  const ensureSeedData = async (
    existingProducts: Product[], 
    existingAccounts: DigitalAccount[], 
    existingCustomers: Customer[]
  ) => {
    console.log("[BOOTSTRAP LOGIC] permanently disabled to avoid recreation of seed data.");
  };

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Audit Logs (limit to 25 recent for speed)
      console.log("[ADMIN SERVICE] Syncing non-realtime activity logs...");
      const lSnap = await getDocs(collection(db, 'activity_logs'));
      const logsMapped = lSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
        .slice(0, 25);
      setActivities(logsMapped);

    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'erp_fetch_data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Set up real-time listener for products
    const unsubProducts = onSnapshot(collection(db, 'products'), async (snap) => {
      const pList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      
      const targets = pList.filter(p => {
        const nameLower = (p.name || '').toLowerCase();
        return nameLower.includes('ea fc 26') || 
               nameLower.includes('fifa26') || 
               nameLower.includes('grand theft auto vi') || 
               nameLower.includes('gtavi') || 
               nameLower.includes('playstation plus egypt');
      });

      if (targets.length > 0) {
        for (const t of targets) {
          console.log(`[AUTO-PURGE PRODUCT] Deleting id: ${t.id} ("${t.name}") from collection "products"`);
          const docRef = doc(db, 'products', t.id);
          await deleteDoc(docRef);
          
          // Verify deletion
          const docSnap = await getDoc(docRef);
          console.log(`[VERIFY DELETION] Document id: ${t.id} exists in products: ${docSnap.exists()}`);
        }
      }

      // Filter local state so the table shows zero traces immediately
      const filtered = pList.filter(p => !targets.some(t => t.id === p.id));
      setProducts(filtered);
    }, (err) => {
      console.error("Realtime products listener failed:", err);
    });

    // Set up real-time listener for accounts
    const unsubAccounts = onSnapshot(collection(db, 'accounts'), async (snap) => {
      const aList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DigitalAccount[];
      
      const targets = aList.filter(acc => {
        const emailLower = (acc.email || '').toLowerCase();
        return emailLower.includes('fifa26') || 
               emailLower.includes('gtavi') || 
               emailLower.includes('egyptgames.com') || 
               emailLower.includes('zerolaggames.com');
      });

      if (targets.length > 0) {
        for (const t of targets) {
          console.log(`[AUTO-PURGE ACCOUNT] Deleting id: ${t.id} ("${t.email}") from collection "accounts"`);
          const docRef = doc(db, 'accounts', t.id);
          await deleteDoc(docRef);
          
          // Verify deletion
          const docSnap = await getDoc(docRef);
          console.log(`[VERIFY DELETION] Document id: ${t.id} exists in accounts: ${docSnap.exists()}`);
        }
      }

      // Filter local state so the table shows zero traces immediately
      const filtered = aList.filter(a => !targets.some(t => t.id === a.id));
      setAccounts(filtered);
    }, (err) => {
      console.error("Realtime accounts listener failed:", err);
    });

    // Set up real-time listener for customers
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      const cList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      setCustomers(cList);
    }, (err) => {
      console.error("Realtime customers listener failed:", err);
    });

    // Set up real-time listener for orders
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const oList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
      setOrders(oList);
    }, (err) => {
      console.error("Realtime orders listener failed:", err);
    });

    // Set up real-time listener for receipts
    const unsubReceipts = onSnapshot(collection(db, 'receipts'), (snap) => {
      const rList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Receipt[];
      setReceipts(rList);
    }, (err) => {
      console.error("Realtime receipts listener failed:", err);
    });

    // Set up real-time listener for warranties
    const unsubWarranties = onSnapshot(collection(db, 'warranties'), (snap) => {
      const wList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Warranty[];
      setWarranties(wList);
    }, (err) => {
      console.error("Realtime warranties listener failed:", err);
    });

    // Set up real-time listener for reservations
    const unsubReservations = onSnapshot(collection(db, 'reservations'), (snap) => {
      const resList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reservation[];
      setReservations(resList);
    }, (err) => {
      console.error("Realtime reservations listener failed:", err);
    });

    // Initial fetch to check seed data/activities
    fetchData();

    return () => {
      unsubProducts();
      unsubAccounts();
      unsubCustomers();
      unsubOrders();
      unsubReceipts();
      unsubWarranties();
      unsubReservations();
    };
  }, []);

  // AUDIT LOGGING HELPER
  const logAuditActivity = async (action: string, entity: string, details: string) => {
    try {
      const payload = {
        user: auth.currentUser?.email || 'admin@zerolag.com',
        action,
        entity,
        details,
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'activity_logs'), payload);
      setActivities(prev => [payload, ...prev].slice(0, 25));
    } catch (e) {
      console.warn("Audit logger failed:", e);
    }
  };

  // ------------------------------------------
  // ACCOUNT CRUD OPERATIONS
  // ------------------------------------------
  const handleAddAccount = async (acc: Partial<DigitalAccount>) => {
    try {
      const docRef = await addDoc(collection(db, 'accounts'), {
        ...acc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'accounts');
    }
  };

  const handleEditAccount = async (accountId: string, acc: Partial<DigitalAccount>) => {
    try {
      await updateDoc(doc(db, 'accounts', accountId), {
        ...acc,
        updatedAt: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `accounts/${accountId}`);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (userRole === 'EMPLOYEE') {
      showToast("Access Denied: Employees cannot delete ERP data.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'accounts', accountId));
      fetchData();
      showToast("Digital Account purged successfully.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `accounts/${accountId}`);
    }
  };

  const handleBulkUpdateStatus = async (accountIds: string[], slotType: string, status: string) => {
    try {
      for (const id of accountIds) {
        const acc = accounts.find(a => a.id === id);
        if (!acc) continue;
        
        const updatedSlots = acc.slots.map(s => 
          s.slotType === slotType ? { ...s, status } : s
        );

        await updateDoc(doc(db, 'accounts', id), {
          slots: updatedSlots,
          updatedAt: new Date().toISOString()
        });
      }
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'accounts_bulk');
    }
  };

  const handleBulkImport = async (importedAccounts: any[]) => {
    try {
      for (const raw of importedAccounts) {
        // Find matching product
        const linkedProduct = products.find(p => p.id === raw.productId) || products[0];
        
        const payload = {
          email: raw.email || 'imported-test@zerolag.com',
          password: raw.password || 'TemporaryImport123!',
          recoveryEmail: raw.recoveryEmail || 'recovery@zerolag.com',
          recoveryPhone: raw.recoveryPhone || 'none',
          productId: linkedProduct?.id || 'none',
          productName: linkedProduct?.name || 'Unassigned Game',
          region: raw.region || 'EG',
          notes: 'CSV Bullet Imported',
          slots: [
            { id: 'ps4_prim', slotType: 'PS4_PRIMARY', status: 'AVAILABLE', currentPrice: 500 },
            { id: 'ps5_prim', slotType: 'PS5_PRIMARY', status: 'AVAILABLE', currentPrice: 800 },
            { id: 'secondary', slotType: 'SECONDARY', status: 'AVAILABLE', currentPrice: 300 }
          ]
        };

        await addDoc(collection(db, 'accounts'), {
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'accounts_import');
    }
  };

  // ------------------------------------------
  // CUSTOMER CRM CRUD OPERATIONS
  // ------------------------------------------
  const handleAddCustomer = async (cust: Partial<Customer>) => {
    try {
      await addDoc(collection(db, 'customers'), {
        ...cust,
        totalSpending: 0,
        createdAt: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const handleEditCustomer = async (customerId: string, cust: Partial<Customer>) => {
    try {
      await updateDoc(doc(db, 'customers', customerId), cust);
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (userRole === 'EMPLOYEE') {
      showToast("Access Denied: Employees cannot delete CRM records");
      return;
    }
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      fetchData();
      showToast("Customer purged.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
    }
  };

  // ------------------------------------------
  // SALES ORDERS OPERATIONS
  // ------------------------------------------
  const handleAddOrder = async (ord: Partial<Order>) => {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...ord,
        createdAt: new Date().toISOString()
      });

      // 1. Change status of the associated slot in account to SOLD
      const acc = accounts.find(a => a.id === ord.accountId);
      if (acc) {
        const updatedSlots = acc.slots.map(s => 
          s.id === ord.slotId ? { ...s, status: 'SOLD' as any } : s
        );
        await updateDoc(doc(db, 'accounts', ord.accountId!), {
          slots: updatedSlots,
          updatedAt: new Date().toISOString()
        });
      }

      // 2. Increment Customer LTV Total
      const cust = customers.find(c => c.id === ord.customerId);
      if (cust) {
        const newSpending = (cust.totalSpending || 0) + ord.price!;
        await updateDoc(doc(db, 'customers', ord.customerId!), {
          totalSpending: newSpending
        });
      }

      // 3. Auto Generate active Warranty Document
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      await addDoc(collection(db, 'warranties'), {
        orderId: docRef.id,
        customerId: ord.customerId,
        customerName: ord.customerName,
        productName: ord.accountEmail,
        slotType: ord.slotType,
        startDate: new Date().toISOString(),
        endDate: oneYearLater.toISOString(),
        status: 'ACTIVE'
      });

      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: any) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
      fetchData();
      showToast(`Order updated to: ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      fetchData();
      showToast('Order permanently deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
    }
  };

  const handleEditOrder = async (id: string, updatedFields: any) => {
    try {
      await updateDoc(doc(db, 'orders', id), updatedFields);
      fetchData();
      showToast('Order successfully updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  // ------------------------------------------
  // RECEIPTS & BILLING OPERATIONS
  // ------------------------------------------
  const handleCreateReceipt = async (receipt: Partial<Receipt>) => {
    try {
      await addDoc(collection(db, 'receipts'), {
        ...receipt,
        date: new Date().toISOString()
      });
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'receipts');
    }
  };

  // ------------------------------------------
  // WARRANTIES & RESERVATIONS OPERATIONS
  // ------------------------------------------
  const handleUpdateWarrantyStatus = async (id: string, status: any) => {
    try {
      await updateDoc(doc(db, 'warranties', id), { status });
      fetchData();
      showToast("Warranty scope modified");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `warranties/${id}`);
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: any) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status });
      fetchData();
      showToast("Reservation hold state synced");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleTriggerExpiredChecks = async () => {
    // Sweep check logic
    try {
      let sweptCount = 0;
      const today = new Date();

      // 1. Check reservations
      for (const res of reservations) {
        if (res.status === 'ACTIVE') {
          const limitDate = new Date(res.reservedUntil?.seconds * 1000 || res.reservedUntil);
          if (limitDate < today) {
            await updateDoc(doc(db, 'reservations', res.id), { status: 'EXPIRED' });
            sweptCount++;
          }
        }
      }

      // 2. Check warranties
      for (const war of warranties) {
        if (war.status === 'ACTIVE') {
          const limitDate = new Date(war.endDate?.seconds * 1000 || war.endDate);
          if (limitDate < today) {
            await updateDoc(doc(db, 'warranties', war.id), { status: 'EXPIRED' });
            sweptCount++;
          }
        }
      }

      if (sweptCount > 0) {
        fetchData();
        showToast(`Sweeper complete: auto-expired ${sweptCount} time-limited SLA items`);
        logAuditActivity("Sweep Swept", "System Exec", `Resolved ${sweptCount} stale reservation or warranty windows`);
      }
    } catch (err) {
      console.warn("Scheduler sweeping error:", err);
    }
  };

  // ------------------------------------------
  // KPI STATS SYNCS FOR METRICS
  // ------------------------------------------
  const computeStats = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const completedOrders = orders.filter(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'completed' || s === 'paid' || s === 'delivered';
    });
    const now = new Date();

    // Summing helper to account for diverse field schemas (ERP/Web Checkout)
    const getOrderTotalVal = (o: any) => {
      return Number(o.price || o.finalPrice || o.total || 0);
    };

    // Revenue calculations
    const todayRevenue = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt).toISOString().split('T')[0];
        return d === todayStr;
      })
      .reduce((sum, item) => sum + getOrderTotalVal(item), 0);

    const weeklyStart = new Date();
    weeklyStart.setDate(now.getDate() - 7);
    const weeklyRevenue = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
        return d >= weeklyStart;
      })
      .reduce((sum, item) => sum + getOrderTotalVal(item), 0);

    const monthlyStart = new Date();
    monthlyStart.setDate(now.getDate() - 30);
    const monthlyRevenue = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
        return d >= monthlyStart;
      })
      .reduce((sum, item) => sum + getOrderTotalVal(item), 0);

    const yearlyStart = new Date();
    yearlyStart.setDate(now.getDate() - 365);
    const yearlyRevenue = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
        return d >= yearlyStart;
      })
      .reduce((sum, item) => sum + getOrderTotalVal(item), 0);

    // Order volumes
    const todayOrders = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt).toISOString().split('T')[0];
        return d === todayStr;
      }).length;

    const weeklyOrders = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
        return d >= weeklyStart;
      }).length;

    const monthlyOrders = completedOrders
      .filter(o => {
        const d = new Date(o.createdAt?.seconds * 1000 || o.createdAt);
        return d >= monthlyStart;
      }).length;

    // Customer segments
    const newCustomersCount = customers.filter(c => {
      const regD = new Date(c.createdAt?.seconds * 1000 || c.createdAt);
      return regD >= monthlyStart;
    }).length;
    const returningCustomersCount = customers.filter(c => orders.filter(o => o.customerId === c.id).length > 1).length;

    // Average Order Value
    const averageOrderValue = completedOrders.length > 0
      ? (completedOrders.reduce((sum, o) => sum + getOrderTotalVal(o), 0) / completedOrders.length)
      : 0;

    // Low stock tracking
    const lowStockAlertsCount = products.filter(p => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock').length;

    // Inventory health ratio
    let totalSlots = 0;
    let availableSlots = 0;
    accounts.forEach(acc => {
      acc.slots?.forEach(slot => {
        totalSlots++;
        if (slot.status === 'AVAILABLE') availableSlots++;
      });
    });
    const inventoryHealthScore = totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 100;

    const slotsPS4 = { available: 0, reserved: 0, sold: 0, blocked: 0 };
    const slotsPS5 = { available: 0, reserved: 0, sold: 0, blocked: 0 };
    const slotsSecondary = { available: 0, reserved: 0, sold: 0, blocked: 0 };

    accounts.forEach(acc => {
      acc.slots?.forEach(slot => {
        const targetObj = 
          slot.slotType === 'PS4_PRIMARY' ? slotsPS4 :
          slot.slotType === 'PS5_PRIMARY' ? slotsPS5 : slotsSecondary;
        
        if (slot.status === 'AVAILABLE') targetObj.available++;
        else if (slot.status === 'RESERVED') targetObj.reserved++;
        else if (slot.status === 'SOLD') targetObj.sold++;
        else if (slot.status === 'BLOCKED') targetObj.blocked++;
      });
    });

    const activeReservationsCount = reservations.filter(r => r.status === 'ACTIVE').length;
    const activeWarrantiesCount = warranties.filter(w => w.status === 'ACTIVE').length;

    return {
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      todayOrders,
      weeklyOrders,
      monthlyOrders,
      totalCustomers: customers.length,
      newCustomersCount,
      returningCustomersCount,
      averageOrderValue,
      lowStockAlertsCount,
      inventoryHealthScore,
      activeReservationsCount,
      activeWarrantiesCount,
      slotsPS4,
      slotsPS5,
      slotsSecondary
    };
  };

  // Render Loading spinner
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={36} className="text-[#00F0FF] animate-spin" />
        <p className="text-gray-500 uppercase tracking-widest text-[10px] font-black">Decrypting control terminal databases...</p>
      </div>
    );
  }

  const activeStats = computeStats();

  const detectedTargetAccounts = accounts.filter(acc => 
    acc.email?.toLowerCase().includes('fifa26') || 
    acc.email?.toLowerCase().includes('gtavi') ||
    acc.email?.toLowerCase().includes('egyptgames') ||
    acc.email?.toLowerCase().includes('zerolaggames')
  );

  const detectedTargetProducts = products.filter(p => 
    p.name?.toLowerCase().includes('ea fc 26') || 
    p.name?.toLowerCase().includes('fifa') || 
    p.name?.toLowerCase().includes('grand theft auto') || 
    p.name?.toLowerCase().includes('gta') ||
    p.name?.toLowerCase().includes('playstation plus egypt')
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-24 space-y-8 relative">
      {/* Toast alert indicator */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-[200] p-4 bg-[#6C5CE7]/90 text-white backdrop-blur border border-[#6C5CE7] rounded-xl flex items-center gap-3 shadow-[0_0_20px_#6C5CE755] animate-bounce">
          <ShieldCheck size={18} />
          <span className="text-xs font-black uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* Role Simulator and DB synchronizer rail */}
      <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {actualRole === 'OWNER' ? (
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-pink-400" />
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Simulated Perspective Scope:
            </span>
            <div className="flex gap-1.5 ml-2">
              {(['OWNER', 'MANAGER', 'EMPLOYEE'] as StaffRole[]).map((r) => (
                <button 
                  key={r}
                  onClick={() => { setUserRole(r); showToast(`Switched virtual role permission to ${r}`); }}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all ${
                    userRole === r 
                      ? 'bg-[#00F0FF] text-black border-[#00F0FF]' 
                      : 'bg-black/40 text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#00F0FF]" />
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Active Staff Scope:
            </span>
            <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30 ml-2">
              {actualRole}
            </span>
          </div>
        )}

        <button 
          onClick={fetchData}
          disabled={refreshing}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-gray-300 rounded-lg flex items-center gap-2 border border-white/15 disabled:opacity-50"
        >
          <RefreshCcw size={12} className={refreshing ? 'animate-spin text-[#00F0FF]' : ''} />
          {refreshing ? 'Refreshing Real-Time core...' : 'Sync Databases'}
        </button>
      </div>

      {/* Target Purge & Realtime Verification Panel */}
      <div className="p-6 bg-[#1A1D21] border-2 border-red-500/35 rounded-3xl space-y-6 relative overflow-hidden transition-all shadow-[0_0_25px_rgba(239,68,68,0.15)] text-left">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-red-400 font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              STRICT SYSTEM PURGE & VERIFICATION ENGINE
            </h3>
            <p className="text-xs text-gray-400 max-w-xl font-medium font-sans">
              Locating and liquidating seed records from the Firestore database. Click to permanently trigger <code className="text-red-300 font-mono">deleteDoc</code> and immediately verify via <code className="text-green-300 font-mono">getDoc(docRef).exists()</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400">STATUS:</span>
            {detectedTargetAccounts.length === 0 && detectedTargetProducts.length === 0 ? (
              <span className="text-green-400">SECURE (0 TARGETS DETECTED)</span>
            ) : (
              <span className="text-red-400 animate-pulse">{detectedTargetAccounts.length + detectedTargetProducts.length} SYSTEM ANOMALIES FOUND</span>
            )}
          </div>
        </div>

        {/* Dynamic Detected Anomalies Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Section A: Digital Account Anomalies */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-gray-400 tracking-widest uppercase font-mono flex items-center justify-between">
              <span>A) REGISTERED ACCOUNT TARGETS</span>
              <span className="px-2 py-0.5 bg-white/5 text-[9px] text-gray-400 rounded-md">{detectedTargetAccounts.length} found</span>
            </h4>

            {detectedTargetAccounts.length === 0 ? (
              <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center gap-3">
                <Check className="text-green-400" size={16} />
                <span className="text-xs text-green-400/90 font-mono uppercase tracking-wider font-bold">Zero Trace of Account Targets</span>
              </div>
            ) : (
              <div className="space-y-3">
                {detectedTargetAccounts.map(acc => {
                  const verified = verificationStates[acc.id];
                  return (
                    <div key={acc.id} className="p-4 bg-black/50 border border-red-500/20 hover:border-red-500/40 rounded-2xl space-y-3 transition-all relative text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] font-black text-white font-mono break-all">{acc.email}</div>
                          <div className="text-[9px] text-pink-400 font-mono uppercase font-bold">{acc.productName}</div>
                        </div>
                        <button
                          onClick={() => performPermanentPurge(acc.id, 'accounts', acc.email)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(220,38,38,0.25)] hover:scale-105"
                        >
                          <Trash2 size={10} /> PURGE
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-white/5 pt-2.5 text-left">
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">DOCUMENT ID</span>
                          <span className="text-gray-300 select-all font-semibold font-mono">{acc.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">COLLECTION PATH</span>
                          <span className="text-[#00F0FF] uppercase block font-semibold">/accounts</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">SOURCE FILE</span>
                          <span className="text-amber-500 block font-semibold font-mono">src/pages/Admin.tsx</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">TIMESTAMP</span>
                          <span className="text-purple-400 block font-semibold">
                            {acc.createdAt || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Verification Badge */}
                      {verified && (
                        <div className="mt-2 p-2 bg-black border border-white/10 rounded-xl flex items-center justify-between text-[9px] font-mono text-left">
                          <span className="text-gray-400">VERIFICATION: docSnap.exists()</span>
                          {verified.exists ? (
                            <span className="text-red-400 font-black flex items-center gap-1"><X size={10} /> TRUE (EXISTS Error)</span>
                          ) : (
                            <span className="text-green-400 font-black flex items-center gap-1"><Check size={10} /> FALSE (DELETED)</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Product Catalog Anomalies */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-gray-400 tracking-widest uppercase font-mono flex items-center justify-between font-bold">
              <span>B) PRODUCT CATALOG TARGETS</span>
              <span className="px-2 py-0.5 bg-white/5 text-[9px] text-gray-400 rounded-md">{detectedTargetProducts.length} found</span>
            </h4>

            {detectedTargetProducts.length === 0 ? (
              <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center gap-3">
                <Check className="text-green-400" size={16} />
                <span className="text-xs text-green-400/90 font-mono uppercase tracking-wider font-bold">Zero Trace of Product Targets</span>
              </div>
            ) : (
              <div className="space-y-3">
                {detectedTargetProducts.map(p => {
                  const verified = verificationStates[p.id];
                  return (
                    <div key={p.id} className="p-4 bg-black/50 border border-red-500/20 hover:border-red-500/40 rounded-2xl space-y-3 transition-all relative text-left">
                      <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-black text-white font-mono">{p.name}</div>
                          <div className="text-[9px] text-pink-400 font-mono uppercase font-bold">{p.platform} — {p.category}</div>
                        </div>
                        <button
                          onClick={() => performPermanentPurge(p.id, 'products', p.name)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(220,38,38,0.25)] hover:scale-105"
                        >
                          <Trash2 size={10} /> PURGE
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono pt-1 text-left">
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">DOCUMENT ID</span>
                          <span className="text-gray-300 select-all font-semibold font-mono">{p.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">COLLECTION PATH</span>
                          <span className="text-[#00F0FF] uppercase block font-semibold">/products</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">SOURCE FILE</span>
                          <span className="text-amber-500 block font-semibold font-mono">src/pages/Admin.tsx</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] tracking-widest">TIMESTAMP</span>
                          <span className="text-purple-400 block font-semibold">
                            {p.createdAt || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Verification Badge */}
                      {verified && (
                        <div className="mt-2 p-2 bg-black border border-white/10 rounded-xl flex items-center justify-between text-[9px] font-mono text-left">
                          <span className="text-gray-400">VERIFICATION: docSnap.exists()</span>
                          {verified.exists ? (
                            <span className="text-red-400 font-black flex items-center gap-1"><X size={10} /> TRUE (EXISTS Error)</span>
                          ) : (
                            <span className="text-green-400 font-black flex items-center gap-1"><Check size={10} /> FALSE (DELETED)</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Purge Console / Telemetry Logs */}
        {purgeLogs.length > 0 && (
          <div className="p-4 bg-black border border-white/5 rounded-2xl space-y-2 text-left">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono block">PURGE OPERATION TELEMETRY LOGGER</span>
            <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[9px] text-[#00F0FF]">
              {purgeLogs.map((log, index) => (
                <div key={index} className="leading-relaxed">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Admin Diagnostics Panel */}
      <div id="admin-diagnostics-panel" className="p-6 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 rounded-3xl space-y-4 relative overflow-hidden transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-400 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white font-mono">
              SYSTEM DIAGNOSTICS LOGISCOPE
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-full">
            REALTIME DEEP DIAGNOSTIC SHIELD
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-black/60 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono">UID COORDINATE</span>
            <div className="text-[11px] text-white font-mono uppercase tracking-tight break-all font-semibold">
              {user?.uid || 'NOT_AUTHENTICATED'}
            </div>
          </div>
          <div className="p-4 bg-black/60 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono">SECURITY IDENTITY EMAIL</span>
            <div className="text-[12px] text-[#00F0FF] font-mono lowercase tracking-tight break-all font-semibold">
              {user?.email || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-black/60 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono">RESOLVED ROLE CAPABILITY</span>
            <div className="text-[11px] text-pink-400 font-mono uppercase tracking-tight font-black flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></span>
              {actualRole}
            </div>
          </div>
          <div className="p-4 bg-black/60 border border-white/5 rounded-2xl space-y-1">
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-mono">IS_ADMIN METRIC</span>
            <div className="text-[11px] font-mono uppercase tracking-tight font-black flex items-center gap-2">
              {isAdmin ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <span className="text-green-400 font-extrabold">TRUE (AUTHORIZED)</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span className="text-red-500 font-extrabold">FALSE (DENIED)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Operation Console Drawer Trigger */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
          className="w-full flex items-center justify-between p-4 bg-[#151619] border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:text-[#00F0FF] hover:border-[#00F0FF]/30 transition-all shadow-md cursor-pointer select-none"
        >
          <span className="flex items-center gap-2.5">
            <Menu size={16} className="text-[#00F0FF]" />
            <span>Operation Console</span>
          </span>
          <span className="text-[10px] bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 px-2 py-1 rounded-lg font-mono font-black">
            {isSidebarOpenMobile ? 'Collapse [-]' : 'Expand [+]'}
          </span>
        </button>
      </div>

      {/* Master Board Navigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Backdrop for mobile drawer */}
        {isSidebarOpenMobile && (
          <div 
            className="fixed inset-0 bg-[#0B0B0F]/80 backdrop-blur-sm z-[90] lg:hidden"
            onClick={() => setIsSidebarOpenMobile(false)}
          />
        )}

        {/* Redesigned Left Side Rail Navigation Menu - Premium Wide Layout as Drawer on Mobile */}
        <div className={`
          p-6 bg-[#151619] border border-white/5 space-y-6 flex-col shadow-[0_25px_60px_rgba(0,0,0,0.6)]
          fixed top-0 left-0 bottom-0 w-[290px] max-w-[85vw] z-[100] transition-transform duration-300 transform rounded-r-3xl
          lg:static lg:w-auto lg:h-auto lg:z-auto lg:rounded-3xl lg:translate-x-0 lg:flex lg:col-span-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)]
          ${isSidebarOpenMobile ? 'translate-x-0 flex' : '-translate-x-full lg:flex hidden'}
        `}>
          <Logo className="mb-4 shrink-0 px-2 group" />
          <div className="pb-4 border-b border-white/5 shrink-0 flex items-center justify-between">
            <h2 className="text-[11px] font-black tracking-[0.25em] uppercase text-gray-400">OPERATION CONSOLE</h2>
            <span className="text-[10px] bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25 px-2 py-0.5 rounded-lg font-mono font-black shadow-[0_0_10px_rgba(0,240,255,0.1)]">ACTIVE</span>
          </div>
 
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
            {navGroups.map((group) => {
              const isExpanded = expandedGroups[group.title] !== false;
              
              return (
                <div key={group.title} className="space-y-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] hover:text-[#00F0FF] transition-all py-1 cursor-pointer focus:outline-none"
                  >
                    <span>{t(group.title)}</span>
                    <span className="text-gray-600 font-mono text-[9px] tracking-normal select-none">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>
                  
                  {isExpanded && (
                    <div className="flex flex-col gap-2 pl-2 border-l border-white/10">
                      {group.items.map((tab) => {
                        const isCurrent = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.id);
                              setIsSidebarOpenMobile(false);
                            }}
                            className={`w-full p-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-3.5 transition-all duration-300 cursor-pointer ${
                              isCurrent
                                ? 'bg-[#00F0FF] text-[#0B0B0F] shadow-[0_0_20px_rgba(0,240,255,0.4)] font-black'
                                : 'text-gray-400 hover:text-[#00F0FF] hover:bg-white/5 hover:translate-x-1.5'
                            }`}
                          >
                            <span className={`shrink-0 ${isCurrent ? 'text-[#0B0B0F]' : 'text-[#00F0FF]'}`}>
                              {tab.icon}
                            </span>
                            <span className="truncate">{t(tab.val)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
 
        {/* Dynamic Inner views container */}
        <div className="lg:col-span-9 relative">
          {activeTab === 'dashboard' && (
            <DashboardModule 
              stats={activeStats}
              recentSales={orders.slice(0, 5)}
              lowStockAlerts={products.filter(p => p.stockStatus === 'Out of Stock').slice(0, 5)}
              recentCustomers={customers.slice(0, 5)}
              activities={activities}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

           {activeTab === 'digital_logins' && (
             <InventoryModule 
               accounts={accounts}
               products={products}
               onAddAccount={handleAddAccount}
               onEditAccount={handleEditAccount}
               onDeleteAccount={handleDeleteAccount}
               onBulkUpdateStatus={handleBulkUpdateStatus}
               onBulkImport={handleBulkImport}
               onLogActivity={logAuditActivity}
               showToast={showToast}
               userRole={userRole}
               onRefreshData={fetchData}
               forcedView="digital_logins"
             />
           )}

           {activeTab === 'game_catalog' && (
             <InventoryModule 
               accounts={accounts}
               products={products}
               onAddAccount={handleAddAccount}
               onEditAccount={handleEditAccount}
               onDeleteAccount={handleDeleteAccount}
               onBulkUpdateStatus={handleBulkUpdateStatus}
               onBulkImport={handleBulkImport}
               onLogActivity={logAuditActivity}
               showToast={showToast}
               userRole={userRole}
               onRefreshData={fetchData}
               forcedView="game_catalog"
             />
           )}

           {activeTab === 'hardware_inventory' && (
             <InventoryModule 
               accounts={accounts}
               products={products}
               onAddAccount={handleAddAccount}
               onEditAccount={handleEditAccount}
               onDeleteAccount={handleDeleteAccount}
               onBulkUpdateStatus={handleBulkUpdateStatus}
               onBulkImport={handleBulkImport}
               onLogActivity={logAuditActivity}
               showToast={showToast}
               userRole={userRole}
               onRefreshData={fetchData}
               forcedView="hardware_inventory"
             />
           )}

          {activeTab === 'crm' && (
            <CustomerModule 
              customers={customers}
              orders={orders}
              warranties={warranties}
              reservations={reservations}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onLogActivity={logAuditActivity}
              showToast={showToast}
              userRole={userRole}
            />
          )}

           {activeTab === 'orders' && (
             <OrdersModule 
               orders={orders}
               customers={customers}
               accounts={accounts}
               onAddOrder={handleAddOrder}
               onUpdateOrderStatus={handleUpdateOrderStatus}
               onDeleteOrder={handleDeleteOrder}
               onEditOrder={handleEditOrder}
               onLogActivity={logAuditActivity}
               showToast={showToast}
               userRole={userRole}
             />
           )}

          {activeTab === 'receipts' && (
            <ReceiptModule 
              receipts={receipts}
              orders={orders}
              onCreateReceipt={handleCreateReceipt}
              showToast={showToast}
            />
          )}

          {activeTab === 'warranties' && (
            <WarrantyReservationModule 
              warranties={warranties}
              reservations={reservations}
              onTriggerExpiredChecks={handleTriggerExpiredChecks}
              onUpdateWarrantyStatus={handleUpdateWarrantyStatus}
              onUpdateReservationStatus={handleUpdateReservationStatus}
              onLogActivity={logAuditActivity}
              showToast={showToast}
            />
          )}

          {activeTab === 'reports' && (
            <ReportingModule 
              orders={orders}
              accounts={accounts}
              showToast={showToast}
            />
          )}

          {activeTab === 'banners' && (
            <BannersModule 
              showToast={showToast}
              onLogActivity={logAuditActivity}
            />
          )}

          {activeTab === 'support' && (
            <SupportModule />
          )}

          {activeTab === 'taxonomy' && (
            <TaxonomyModule showToast={showToast} />
          )}

          {activeTab === 'categories' && (
            <TaxonomyModule showToast={showToast} forcedTab="categories" />
          )}

          {activeTab === 'platforms' && (
            <TaxonomyModule showToast={showToast} forcedTab="platforms" />
          )}

          {activeTab === 'genres' && (
            <TaxonomyModule showToast={showToast} forcedTab="genres" />
          )}

          {activeTab === 'collections' && (
            <TaxonomyModule showToast={showToast} forcedTab="collections" />
          )}

          {activeTab === 'paymentMethods' && (
            <PaymentsModule showToast={showToast} />
          )}

          {activeTab === 'homepageSections' && (
            <HomepageSectionsModule showToast={showToast} />
          )}

          {activeTab === 'customization' && (
            <CustomizationModule 
              showToast={showToast}
            />
          )}

          {activeTab === 'diagnostics' && (
            <DiagnosticsModule />
          )}
        </div>
      </div>
    </div>
  );
}
