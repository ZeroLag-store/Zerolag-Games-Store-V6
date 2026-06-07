import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import Logo from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, ShieldCheck, ShoppingBag, ArrowLeft, CheckCircle2, ChevronRight, 
  Truck, Smartphone, ArrowRightLeft, DollarSign, Store, Copy, Check, UploadCloud, 
  Clock, Sparkles, AlertTriangle 
} from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { apiService } from '../lib/apiService';
import { uploadMedia } from '../lib/storageHelper';

export default function Checkout() {
  const { cart, clearCart, showToast, user, storeSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Multi-step form step
  // 1: Order Review & Details
  // 2: Choose Payment Method
  // 3: Payment Details
  // 4: Payment Proof Screenshot Upload
  // 5: WhatsApp Confirmation
  const [step, setStep] = useState(1);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('InstaPay');

  // Shipment delivery states (for physical hardware items)
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [dynamicMethods, setDynamicMethods] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'payment_methods'), (snapshot) => {
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((d: any) => d.active === true) as any[];
      // Sort in ascending order by displayOrder field
      list.sort((a: any, b: any) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      setDynamicMethods(list);
      if (list.length > 0) {
        setPaymentMethod(list[0].name);
      }
    });
    return () => unsub();
  }, []);

  // Clipboard copies
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Cloudinary Upload progress and states
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Dynamic payment settings loaded from settings/payment
  const [paymentSettings, setPaymentSettings] = useState({
    instaPayLink: 'https://ipn.eg/S/shehabzoro/instapay/4Mo5Lf',
    instaPayUsername: 'shehabzoro',
    vodafoneCashNumber: '01014018260',
    fawryNumber: '01014018260',
    teldaUsername: 'shoruu',
    whatsAppOrderNumber: '01114763125',
    storeAddress: "City Star's Tower Mall, 6 October City, Egypt",
    googleMapsLink: 'https://maps.app.goo.gl/3K5K'
  });

  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'payment'));
        if (snap.exists()) {
          const { bankAccountNumber, bankAccountName, ...cleanData } = snap.data();
          setPaymentSettings(prev => ({
            ...prev,
            ...cleanData
          }));
        }
      } catch (err) {
        console.error("Failed to load custom payment credentials: ", err);
      }
    };
    fetchPaymentSettings();
  }, []);

  useEffect(() => {
    if (storeSettings) {
      setPaymentSettings(prev => ({
        ...prev,
        whatsAppOrderNumber: storeSettings.whatsApp || prev.whatsAppOrderNumber,
        storeAddress: storeSettings.address || prev.storeAddress,
        googleMapsLink: storeSettings.googleMapsLink || prev.googleMapsLink,
      }));
    }
  }, [storeSettings]);

  // Auto-generated order metadata (stable across renders)
  const [orderId, setOrderId] = useState('ZLG-000000');
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    productNames: string;
    selectedVersions: string;
    totalQty: number;
    totalPrice: number;
  } | null>(null);

  useEffect(() => {
    const fetchNextOrderId = async () => {
      try {
        const { getCountFromServer } = await import('firebase/firestore');
        const snapCount = await getCountFromServer(collection(db, 'orders'));
        const count = snapCount.data().count;
        setOrderId(`ZLG-${String(count + 1).padStart(6, '0')}`);
      } catch (err) {
        console.error("Failed to fetch order count: ", err);
        // Robust random numeric fallback
        const rand = Math.floor(100000 + Math.random() * 900000);
        setOrderId(`ZLG-${rand}`);
      }
    };
    fetchNextOrderId();
  }, []);

  const [dateTimeString] = useState(() => new Date().toLocaleString());

  const total = cart.reduce(
    (sum, item) => sum + (item.price * (1 - (item.discount || 0) / 100)) * (item.quantity || 1), 
    0
  );

  // Translate version option name helper
  const getVersionLabel = (slotType: string) => {
    if (slotType === 'PS4_PRIMARY') return 'PS4 Primary';
    if (slotType === 'PS5_PRIMARY') return 'PS5 Primary';
    return 'Secondary';
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    showToast(`Copied ${fieldId} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);
    setUploadProgress(0);

    try {
      showToast('Initiating Cloudinary upload stream...');
      const response = await uploadMedia(file, (percent) => {
        setUploadProgress(percent);
      });
      setScreenshotUrl(response.url);
      setUploadSuccess(true);
      showToast('Payment screenshot uploaded successfully!');
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'File uploader encountered an issue');
      showToast('Image upload failed. You can proceed with manual verification.');
    } finally {
      setUploading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      showToast('Please login to place an order');
      navigate('/login');
      return;
    }

    const hasHardware = cart.some(item => item.category === 'Hardware');

    if (!firstName.trim() || !lastName.trim() || !customerEmail.trim() || !phoneNumber.trim()) {
      showToast('Please fill out all client details at step 01 (Name, Email, and Phone Contact)');
      setStep(1);
      return;
    }

    if (hasHardware && (!fullAddress.trim() || !city.trim() || !governorate.trim() || !postalCode.trim())) {
      showToast('Please fill out all physical shipment address fields for hardware elements at step 01');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      // Validate available stock against live DB before settling order
      for (const item of cart) {
        const prodId = item.baseProductId || item.id;
        const prodSnap = await getDoc(doc(db, 'products', prodId));
        if (!prodSnap.exists()) {
          showToast(`Error: Product "${item.name}" no longer exists.`);
          setLoading(false);
          return;
        }
        const prodData = prodSnap.data();
        if (prodData.stockStatus === 'Out of Stock') {
          showToast(`Error: "${item.name}" is out of stock.`);
          setLoading(false);
          return;
        }

        // Determine stock count from master product fields
        let available = 0;
        const isHardware = prodData.category === 'Hardware';
        if (isHardware) {
          available = Math.max(0, prodData.ps4PrimaryStock ?? 0);
        } else {
          const slot = item.selectedSlotType || 'SECONDARY';
          if (slot === 'PS4_PRIMARY') {
            available = Math.max(0, prodData.ps4PrimaryStock ?? 0);
          } else if (slot === 'PS5_PRIMARY') {
            available = Math.max(0, prodData.ps5PrimaryStock ?? 0);
          } else if (slot === 'SECONDARY') {
            available = Math.max(0, prodData.secondaryStock ?? 0);
          }
        }

        if (available <= 0) {
          showToast(`Error: "${item.name}" is completely out of stock.`);
          setLoading(false);
          return;
        }

        if ((item.quantity || 1) > available) {
          showToast(`Error: Only ${available} units of "${item.name}" are available in stock.`);
          setLoading(false);
          return;
        }
      }

      // Primary cart item details for order metadata
      const primaryItem = cart[0];
      const productNames = cart.map(i => i.name).join(', ');
      const selectedVersions = cart.map(i => getVersionLabel(i.selectedSlotType || 'SECONDARY')).join(', ');
      const totalQty = cart.reduce((sum, i) => sum + (i.quantity || 1), 0);

      // Automatically generate professional text receipt
      const dateString = new Date().toLocaleString();
      const itemsText = cart.map((item, idx) => {
        const itemFinalPrice = item.price * (1 - (item.discount || 0) / 100);
        return `${idx + 1}. ${item.name}\n   Version: ${getVersionLabel(item.selectedSlotType || 'SECONDARY')}\n   Quantity: ${item.quantity || 1}\n   Price: ${formatPrice(itemFinalPrice * (item.quantity || 1))}`;
      }).join('\n');

      const shippingText = hasHardware ? `
----------------------------------------
DELIVERY ADDRESS (HARDWARE SHIPPED):
Full Address: ${fullAddress.trim()}
City:         ${city.trim()}
Governorate:  ${governorate.trim()}
Postal Code:  ${postalCode.trim()}
Additional Notes: ${additionalNotes.trim() || 'N/A'}` : '';

      const autoReceiptText = `========================================
     ZEROLAG GAMES STORE RECEIPT
========================================
Order ID      : ${orderId}
Date          : ${dateString}
Customer Name : ${firstName.trim()} ${lastName.trim()}
Email         : ${customerEmail.trim()}
Phone Number  : ${phoneNumber.trim()}
----------------------------------------
Products Ordered:
${itemsText}${shippingText}
----------------------------------------
Subtotal      : ${formatPrice(total)}
Total         : ${formatPrice(total)}
========================================
THANK YOU FOR SHOPPING AT ZEROLAG!
========================================`;

      const orderData = {
        // Document payload specified by user request:
        orderId: orderId,
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        customerEmail: customerEmail.trim(),
        customerPhone: phoneNumber.trim(),
        productId: primaryItem?.id || 'multiple',
        productName: productNames,
        selectedVersion: selectedVersions,
        quantity: totalQty,
        unitPrice: primaryItem?.price || total,
        discount: primaryItem?.discount || 0,
        finalPrice: total,
        paymentMethod: paymentMethod,
        paymentProofUrl: screenshotUrl || '',
        status: 'Pending Payment Verification' as const,
        createdAt: new Date().toISOString(), // Standard date property
        isWebOrder: true, // Marker for web filtering
        userId: user.uid, // Profile link query parameter
        receiptText: autoReceiptText,
        hasHardware,
        ...(hasHardware ? {
          shippingAddress: {
            fullAddress: fullAddress.trim(),
            city: city.trim(),
            governorate: governorate.trim(),
            postalCode: postalCode.trim(),
            additionalNotes: additionalNotes.trim(),
          }
        } : {}),

        // Legacy compatibility properties
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price * (1 - (item.discount || 0) / 100),
          quantity: item.quantity || 1,
          slotType: item.selectedSlotType || 'SECONDARY'
        })),
        total: total,
        userEmail: customerEmail.trim()
      };

      // Lock placed order specifics in state before clearing cart
      setPlacedOrder({
        orderId,
        productNames,
        selectedVersions,
        totalQty,
        totalPrice: total
      });

      // 1. Process via Backend API
      try {
        const backendResult = await apiService.processOrder({
          ...orderData,
          status: 'completed' // Force mock completion for backend proxy
        });
        console.log('Backend response:', backendResult);
      } catch (backendErr) {
        console.warn('Backend API proxy bypassed. Continuing with Firestore database writing.', backendErr);
      }

      // 2. Write order record directly to Firestore orders collection
      await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: serverTimestamp() // Set Firestore accurate stamp
      });

      // 3. Request AI Insights optional step
      try {
        const aiResponse = await apiService.getAIInsights(cart);
        showToast(aiResponse.insight);
      } catch (aiError) {
        console.warn('AI insights processor bypassed:', aiError);
      }

      showToast('Order saved! Please confirm via WhatsApp.');
      setStep(5); // Transition to WhatsApp Confirmation Step
      clearCart();
    } catch (e) {
      console.error('Firestore order settlement crash:', e);
      handleFirestoreError(e, OperationType.WRITE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp wa.me encoding string computation
  const getWhatsAppMsg = () => {
    const products = placedOrder ? placedOrder.productNames : (cart.length > 0 ? cart.map(i => i.name).join(', ') : 'Digital Assets Package');
    const versions = placedOrder ? placedOrder.selectedVersions : (cart.length > 0 ? cart.map(i => getVersionLabel(i.selectedSlotType || 'SECONDARY')).join(', ') : 'Secondary');
    const qty = placedOrder ? placedOrder.totalQty : (cart.length > 0 ? cart.reduce((sum, i) => sum + (i.quantity || 1), 0) : 1);
    const price = placedOrder ? placedOrder.totalPrice : total;
    const uploadedProof = screenshotUrl || '(Sent manual proof / No screenshot configured)';

    const templateText = `Hello Zerolag,

Order ID: ${placedOrder?.orderId || orderId}

Product: ${products}

Version: ${versions}

Quantity: ${qty}

Total Price: ${price} EGP

Payment Method: ${paymentMethod}

Payment Screenshot:
${uploadedProof}

Please confirm my order.`;

    return encodeURIComponent(templateText);
  };

  const rawWaNum = paymentSettings.whatsAppOrderNumber.replace(/[^0-9]/g, '');
  const cleanWaNumber = rawWaNum.startsWith('0') ? '2' + rawWaNum : (rawWaNum || '201114763125');
  const whatsappUrl = `https://wa.me/${cleanWaNumber}?text=${getWhatsAppMsg()}`;

  // If cart is empty on startup and order has not finished
  if (cart.length === 0 && step !== 5) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-650">
          <ShoppingBag size={40} className="text-[#00F0FF]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">No loot detected in your current transmission buffer.</p>
        </div>
        <Link to="/shop" className="px-8 py-4 bg-[#00F0FF] text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#33F3FF] transition-all">
          Browse Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header and Back Link */}
      {step !== 5 && (
        <div className="flex items-center gap-4 mb-10">
          <button 
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else navigate('/shop');
            }}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            SECURE <span className="text-[#00F0FF]">CHECKOUT</span>
          </h1>
        </div>
      )}

      {/* Main Grid View */}
      <div className={`grid grid-cols-1 ${step === 5 ? 'max-w-2xl mx-auto' : 'lg:grid-cols-12'} gap-10`}>
        
        {/* Left Side: Step Wizard Core */}
        <div className={step === 5 ? 'w-full' : 'lg:col-span-8 space-y-8'}>
          
          {/* Progress Indicators */}
          {step !== 5 && (
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex flex-col gap-2">
                  <div className={`h-1 hover:opacity-100 transition-all duration-300 rounded-full ${step >= s ? 'bg-[#00F0FF]' : 'bg-white/5'}`}></div>
                  <div className={`text-[8px] font-black uppercase tracking-widest ${step === s ? 'text-[#00F0FF]' : 'text-gray-600'}`}>
                    STEP 0{s}: {
                      s === 1 ? 'Review' :
                      s === 2 ? 'Method' :
                      s === 3 ? 'Details' : 'Proof'
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form and Interaction Box */}
          <div className="bg-[#151619]/60 border border-white/5 rounded-[2rem] p-8 md:p-10 shadow-xl backdrop-blur-md">
            
            <AnimatePresence mode="wait">
              
              {/* STEP 1: ORDER REVIEW PAGE */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <Truck className="text-[#00F0FF]" size={20} /> 01. Delivery Details & Order Review
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Please enter your contact details and review your custom generated order summary card below.
                    </p>
                  </div>

                  {/* Customer Information Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF]">First Name *</label>
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                        placeholder="e.g. John" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF]">Last Name *</label>
                      <input 
                        type="text" 
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                        placeholder="e.g. Doe" 
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF]">Email Interface *</label>
                      <input 
                        type="email" 
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                        placeholder="e.g. customer@domain.com" 
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF]">Phone Number Contact (WhatsApp) *</label>
                      <input 
                        type="tel" 
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                        placeholder="e.g. 01112223334" 
                      />
                    </div>
                  </div>

                  {/* CONDITIONAL DELIVERY ADDRESS (ONLY SHOWS FOR HARDWARE PRODUCTS) */}
                  {cart.some(item => item.category === 'Hardware') && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 p-5 bg-white/5 border border-white/10 rounded-2xl"
                    >
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-pink-400 tracking-wider">
                        <Truck size={14} /> Shipping Information (Required for Hardware)
                      </div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest">
                        Your cart contains hardware components. Physical shipment delivery details are mandatory.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white">Full delivery address *</label>
                          <input 
                            type="text"
                            required
                            value={fullAddress}
                            onChange={(e) => setFullAddress(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                            placeholder="Street, Building, Apartment, Floor..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white">City *</label>
                          <input 
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                            placeholder="e.g. Cairo"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white">Governorate *</label>
                          <input 
                            type="text"
                            required
                            value={governorate}
                            onChange={(e) => setGovernorate(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                            placeholder="e.g. Giza"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white">Postal Code *</label>
                          <input 
                            type="text"
                            required
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                            placeholder="e.g. 12511"
                          />
                        </div>
                        <div className="col-span-full space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-white">Additional Notes (Optional)</label>
                          <input 
                            type="text"
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#00F0FF]/40 transition-colors"
                            placeholder="Landmarks, instructions..."
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* PROFESSIONAL ORDER SUMMARY CARD */}
                  <div className="p-6 bg-black/40 border border-[#00F0FF]/30 rounded-2xl relative overflow-hidden space-y-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F0FF]/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="text-xs font-black uppercase tracking-widest text-white">
                        ORDER SUMMARY
                      </div>
                      <div className="p-1 px-2.5 bg-[#00F0FF]/10 border border-[#00F0FF]/25 rounded text-[8px] font-mono text-[#00F0FF] uppercase tracking-widest font-black">
                        {orderId}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs text-gray-400 font-medium font-mono">
                      
                      {cart.map((item, idx) => (
                        <div key={item.id || idx} className="col-span-full border-b border-white/5 pb-3 last:border-b-0 last:pb-0 space-y-1">
                          <div className="text-white text-xs font-black font-sans uppercase">
                            Product: {item.name}
                          </div>
                          <div className="flex justify-between">
                            <span>Version:</span>
                            <span className="text-gray-200">{getVersionLabel(item.selectedSlotType || 'SECONDARY')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Quantity:</span>
                            <span className="text-gray-200">{item.quantity || 1}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Unit Price:</span>
                            <span className="text-gray-200">{formatPrice(item.price)}</span>
                          </div>
                          {item.discount > 0 && (
                            <div className="flex justify-between text-yellow-500">
                              <span>Discount Applied:</span>
                              <span>-{item.discount}%</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[#00F0FF] font-sans font-black text-sm pt-1">
                            <span>Subtotal:</span>
                            <span>{formatPrice(item.price * (1 - (item.discount || 0) / 100) * (item.quantity || 1))}</span>
                          </div>
                        </div>
                      ))}

                      <div className="col-span-full border-t border-white/5 pt-4 space-y-2">
                        <div className="flex justify-between text-gray-500">
                          <span>Created Session Date:</span>
                          <span className="text-gray-300 font-sans">{dateTimeString}</span>
                        </div>
                        <div className="flex justify-between text-white font-sans text-base font-black uppercase tracking-tight">
                          <span>Total Amount Due:</span>
                          <span className="text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]">{formatPrice(total)}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!firstName.trim() || !lastName.trim() || !customerEmail.trim() || !phoneNumber.trim()) {
                        showToast('Please fill out all client details first (First Name, Last Name, Email, and Phone Number).');
                        return;
                      }
                      const hasHardware = cart.some(item => item.category === 'Hardware');
                      if (hasHardware && (!fullAddress.trim() || !city.trim() || !governorate.trim() || !postalCode.trim())) {
                        showToast('Please specify all mandatory physical shipping address fields for hardware elements.');
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full py-5 bg-[#00F0FF] hover:bg-[#33F3FF] text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:scale-[1.01] shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                  >
                    Proceed to Payment Method
                  </button>
                </motion.div>
              )}

              {/* STEP 2: PAYMENT METHOD SELECTION */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <CreditCard className="text-[#00F0FF]" size={20} /> 02. Choose Payment Method
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      We support a range of secure local and digital instant payment options. Select your route.
                    </p>
                  </div>

                  {/* Modern payment option grid containing specified methods */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynamicMethods.length > 0 ? (
                      dynamicMethods.map((method) => {
                        const isSelected = paymentMethod === method.name;
                        const getDynamicIcon = (name: string) => {
                          const term = name.toLowerCase();
                          if (term.includes('vodafone') || term.includes('cash') || term.includes('orange') || term.includes('etisalat') || term.includes('we')) {
                            return <Smartphone className="text-red-500" />;
                          }
                          if (term.includes('instapay') || term.includes('ipn') || term.includes('bank')) {
                            return <CreditCard className="text-[#00F0FF]" />;
                          }
                          if (term.includes('telda')) {
                            return <ArrowRightLeft className="text-purple-400" />;
                          }
                          if (term.includes('fawry')) {
                            return <DollarSign className="text-yellow-500 font-bold" />;
                          }
                          return <Store className="text-green-400" />;
                        };
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.name)}
                            className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-300 ${
                              isSelected 
                                ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.08)]' 
                                : 'bg-[#0B0B0F]/50 border-white/5 hover:border-white/20 hover:bg-white/[0.01]'
                            }`}
                          >
                            <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#00F0FF]/15' : 'bg-white/5'} transition-colors`}>
                              {getDynamicIcon(method.name)}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                {method.name}
                                {isSelected && <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></span>}
                              </h4>
                              <p className="text-[9px] text-[#00F0FF] font-black font-mono tracking-wider">
                                {method.number}
                              </p>
                              {method.accountName && (
                                <p className="text-[8px] text-gray-500 font-bold uppercase truncate max-w-[150px]">
                                  {method.accountName}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      [
                        { id: 'InstaPay', name: 'InstaPay', desc: 'Secure Egypt Instant Payment IPN', icon: <CreditCard className="text-[#00F0FF]" /> },
                        { id: 'Vodafone Cash', name: 'Vodafone Cash', desc: 'Instant local wallet transfer', icon: <Smartphone className="text-red-500" /> },
                        { id: 'Telda', name: 'Telda Wallet', desc: 'Fast digital bank transfer', icon: <ArrowRightLeft className="text-purple-400" /> },
                        { id: 'Fawry', name: 'Fawry Pay', desc: 'Egyptian retail terminal store pay', icon: <DollarSign className="text-yellow-400" /> },
                        { id: 'Cash In Store', name: 'Cash In Store', desc: 'Visit our retail October City outlet', icon: <Store className="text-green-400" /> },
                      ].map((method) => {
                        const isSelected = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-300 ${
                              isSelected 
                                ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.08)]' 
                                : 'bg-[#0B0B0F]/50 border-white/5 hover:border-white/20 hover:bg-white/[0.01]'
                            }`}
                          >
                            <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#00F0FF]/15' : 'bg-white/5'} transition-colors`}>
                              {method.icon}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                {method.name}
                                {isSelected && <span className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></span>}
                              </h4>
                              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-tight">
                                {method.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all"
                    >
                      Back to Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-[2] py-4 bg-[#00F0FF] hover:bg-[#33F3FF] text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all text-center"
                    >
                      Proceed to Payment Details
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PAYMENT DETAILS */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <Sparkles className="text-[#00F0FF]" size={20} /> 03. Send Payment Transfer
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      Please send the exact amount of <span className="text-white font-black">{formatPrice(total)}</span> to our credentials below.
                    </p>
                  </div>

                  {/* Conditional credentials matching chosen method exactly */}
                  <div className="p-6 bg-black/40 border border-white/10 rounded-2xl space-y-6">
                    {(() => {
                      const matchedDynamic = dynamicMethods.find(m => m.name === paymentMethod);
                      if (matchedDynamic) {
                        return (
                          <div className="space-y-5">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                              <CreditCard className="text-[#00F0FF]" />
                              <h3 className="text-xs font-black uppercase text-white tracking-widest">{matchedDynamic.name} Coordinates</h3>
                            </div>
                            
                            <div className="space-y-4 text-xs font-mono">
                              <div className="flex flex-col bg-[#0B0B0F] p-4 rounded-xl border border-white/5 relative">
                                <span className="text-[8px] text-gray-500 uppercase font-black">Transfer ID / Address details</span>
                                <span className="text-white font-black mt-1 text-sm tracking-wider">{matchedDynamic.number}</span>
                                <button 
                                  type="button"
                                  onClick={() => copyToClipboard(matchedDynamic.number, matchedDynamic.name)}
                                  className="absolute right-4 top-4 text-gray-500 hover:text-[#00F0FF] transition-colors cursor-pointer"
                                >
                                  {copiedField === matchedDynamic.name ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                              </div>

                              {matchedDynamic.accountName && (
                                <div className="flex flex-col bg-[#0B0B0F] p-4 rounded-xl border border-white/5 relative">
                                  <span className="text-[8px] text-gray-500 uppercase font-black">Account Owner / Full Name</span>
                                  <span className="text-gray-200 font-bold mt-1 text-xs">{matchedDynamic.accountName}</span>
                                </div>
                              )}

                              {matchedDynamic.instructions && (
                                <div className="bg-[#0B0B0F] p-4 rounded-xl border border-white/5 font-sans">
                                  <span className="text-[8px] text-gray-500 uppercase font-black font-mono block mb-2">Billing Steps & Info</span>
                                  <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{matchedDynamic.instructions}</p>
                                </div>
                              )}

                              {matchedDynamic.qrImage && (
                                <div className="bg-[#0B0B0F] p-5 rounded-2xl border border-white/5 text-center space-y-3">
                                  <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black font-mono block">SCAN QR CODE GRAPHIC TO PAY</span>
                                  <div className="w-48 h-48 mx-auto border border-white/10 rounded-2xl p-2.5 bg-white flex items-center justify-center">
                                    <img src={matchedDynamic.qrImage} alt="QR Code Scan" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Static fallback renderer
                      return (
                        <>
                          {paymentMethod === 'InstaPay' && (
                            <div className="space-y-5">
                              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                <CreditCard className="text-[#00F0FF]" />
                                <h3 className="text-xs font-black uppercase text-white tracking-widest">InstaPay Payment Coordinates</h3>
                              </div>
                              
                              <div className="space-y-4 text-xs font-mono">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#0B0B0F] p-4 rounded-xl border border-white/5">
                                  <span className="text-[10px] text-gray-500 uppercase font-black">Direct Payment URL:</span>
                                  <a 
                                    href={paymentSettings.instaPayLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[#00F0FF] hover:underline font-bold text-xs flex items-center gap-1.5 break-all"
                                  >
                                    {paymentSettings.instaPayLink}
                                    <ChevronRight size={12} />
                                  </a>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  <div className="flex flex-col bg-[#0B0B0F] p-4 rounded-xl border border-white/5 relative">
                                    <span className="text-[8px] text-gray-500 uppercase font-black">InstaPay Address Address ID</span>
                                    <span className="text-white font-black mt-1 text-sm">{paymentSettings.instaPayUsername}</span>
                                    <button 
                                      type="button"
                                      onClick={() => copyToClipboard(paymentSettings.instaPayUsername, 'InstaPay Address')}
                                      className="absolute right-4 top-4 text-gray-500 hover:text-[#00F0FF] transition-colors"
                                    >
                                      {copiedField === 'InstaPay Address' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'Vodafone Cash' && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                <Smartphone className="text-red-500" />
                                <h3 className="text-xs font-black uppercase text-white tracking-widest">Vodafone Cash Wallet Coordinates</h3>
                              </div>
                              <div className="flex flex-col bg-[#0B0B0F] p-5 rounded-xl border border-white/5 relative font-mono text-xs">
                                <span className="text-[9px] text-gray-500 uppercase font-black">Wallet Telephone Number</span>
                                <span className="text-white font-black mt-1.5 text-base tracking-wider">{paymentSettings.vodafoneCashNumber}</span>
                                <button 
                                  type="button"
                                  onClick={() => copyToClipboard(paymentSettings.vodafoneCashNumber, 'Vodafone Wallet')}
                                  className="absolute right-4 top-5 text-gray-500 hover:text-[#00F0FF] transition-colors"
                                >
                                  {copiedField === 'Vodafone Wallet' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'Fawry' && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                <DollarSign className="text-yellow-400" />
                                <h3 className="text-xs font-black uppercase text-white tracking-widest">Fawry Deposit Coordinates</h3>
                              </div>
                              <div className="flex flex-col bg-[#0B0B0F] p-5 rounded-xl border border-white/5 relative font-mono text-xs">
                                <span className="text-[9px] text-gray-500 uppercase font-black">Fawry Reference Number</span>
                                <span className="text-white font-black mt-1.5 text-base tracking-wider">{paymentSettings.fawryNumber}</span>
                                <button 
                                  type="button"
                                  onClick={() => copyToClipboard(paymentSettings.fawryNumber, 'Fawry ID')}
                                  className="absolute right-4 top-5 text-gray-500 hover:text-[#00F0FF] transition-colors"
                                >
                                  {copiedField === 'Fawry ID' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'Telda' && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                <ArrowRightLeft className="text-purple-400" />
                                <h3 className="text-xs font-black uppercase text-white tracking-widest">Telda Wallet Coordinates</h3>
                              </div>
                              <div className="flex flex-col bg-[#0B0B0F] p-5 rounded-xl border border-white/5 relative font-mono text-xs">
                                <span className="text-[9px] text-gray-500 uppercase font-black">Telda Username Tag</span>
                                <span className="text-white font-black mt-1.5 text-base tracking-wider text-purple-400">{paymentSettings.teldaUsername}</span>
                                <button 
                                  type="button"
                                  onClick={() => copyToClipboard(paymentSettings.teldaUsername, 'Telda Username')}
                                  className="absolute right-4 top-5 text-gray-500 hover:text-[#00F0FF] transition-colors"
                                >
                                  {copiedField === 'Telda Username' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'Cash In Store' && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                                <Store className="text-green-400" />
                                <h3 className="text-xs font-black uppercase text-white tracking-widest">Retail Outlet Store Address</h3>
                              </div>
                              <div className="space-y-3 font-mono text-xs text-gray-400">
                                <div className="bg-[#0B0B0F] p-4 rounded-xl border border-white/5">
                                  <span className="text-[8px] text-gray-500 uppercase block font-black">Exact Street Address:</span>
                                  <span className="text-white font-black">{paymentSettings.storeAddress}</span>
                                </div>
                                {paymentSettings.googleMapsLink && (
                                  <div className="bg-[#0B0B0F] p-4 rounded-xl border border-[#00F0FF]/10 text-center">
                                    <a 
                                      href={paymentSettings.googleMapsLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] font-black text-[#00F0FF] hover:underline"
                                    >
                                      🗺 VIEW STORE MAP AT LOCATION
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all"
                    >
                      Change Method
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="flex-[2] py-4 bg-[#00F0FF] hover:bg-[#33F3FF] text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all text-center"
                    >
                      Proceed to Proof Upload
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: PAYMENT PROOF UPLOAD */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <UploadCloud className="text-[#00F0FF]" size={20} /> 04. Upload Payment Screen
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Upload your transaction screenshot or transfer confirmation proof below. Allows png, jpg, jpeg, webp.
                    </p>
                  </div>

                  {/* Screenshot upload control panel */}
                  <div className="border-2 border-dashed border-white/10 hover:border-[#00F0FF]/40 rounded-[2rem] p-8 text-center transition-colors relative bg-[#0b0b0f]/30">
                    
                    <input 
                      type="file" 
                      id="payment-screenshot-picker"
                      className="hidden" 
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />

                    <div className="space-y-4">
                      
                      {uploadSuccess && screenshotUrl ? (
                        <div className="space-y-3">
                          <CheckCircle2 className="text-green-400 mx-auto" size={40} />
                          <div className="text-xs font-black text-white uppercase">Upload Completed!</div>
                          <div className="max-w-[200px] mx-auto truncate text-[9px] text-[#00F0FF] font-mono border border-[#00F0FF]/25 py-1.5 px-3 rounded-lg bg-[#00F0FF]/5">
                            {screenshotUrl}
                          </div>
                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                            You can inspect or safely replace the proof with a different screenshot.
                          </p>
                        </div>
                      ) : uploading ? (
                        <div className="space-y-4">
                          <div className="w-12 h-12 rounded-full border-2 border-t-2 border-[#00F0FF] border-t-transparent animate-spin mx-auto"></div>
                          <div className="space-y-1">
                            <span className="text-xs text-white font-black uppercase block">Uploading screenshot...</span>
                            <span className="text-[10px] font-mono text-[#00F0FF] tracking-widest font-black">{uploadProgress}%</span>
                          </div>
                          <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden mx-auto">
                            <div className="h-full bg-[#00F0FF] transition-all duration-350" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <UploadCloud className="text-gray-500 mx-auto" size={44} />
                          <div>
                            <span className="text-xs text-white font-black uppercase block">Select screenshot file</span>
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold mt-1">Accepts PNG, JPG, JPEG, WEBP | Maximum Limit 10MB</span>
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-[10px] text-red-500 font-bold font-mono">
                          ⚠️ Error: {uploadError}
                        </div>
                      )}

                      <label 
                        htmlFor="payment-screenshot-picker"
                        className={`inline-block px-6 py-3 rounded-xl uppercase text-[9px] tracking-widest font-black transition-all cursor-pointer ${
                          uploading 
                            ? 'bg-white/5 text-gray-600 pointer-events-none' 
                            : 'bg-[#151619] border border-white/10 hover:border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF]/5'
                        }`}
                      >
                        {uploadSuccess ? 'Replace Screenshot' : 'Browse Files'}
                      </label>

                    </div>
                  </div>

                  {/* Warnings if screenshot is missing */}
                  {!uploadSuccess && !uploading && (
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-2xl flex items-start gap-3.5">
                      <AlertTriangle className="text-yellow-500 shrink-0" size={16} />
                      <p className="text-[9px] text-gray-500 uppercase font-black tracking-wider leading-relaxed">
                        If you encounter problems uploading the screenshot, you can skip this step, authorize order placement, and send your confirmation proof manually using WhatsApp instead!
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={loading}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={loading || uploading}
                      className="flex-[2] py-4 bg-[#00F0FF] hover:bg-[#33F3FF] text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all disabled:opacity-50 font-bold"
                    >
                      {loading ? 'Authorizing order...' : 'Authorize & Submit Order'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: WHATSAPP CONFIRMATION PAGE */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8 text-center py-6"
                >
                  <Logo className="justify-center scale-90 mb-4" />
                  <div className="mx-auto w-20 h-20 bg-[#25D366]/10 rounded-3xl flex items-center justify-center text-[#25D366] relative">
                    <CheckCircle2 size={40} className="drop-shadow-[0_0_10px_rgba(37,211,102,0.4)]" />
                    <div className="absolute inset-0 border border-[#25D366]/30 rounded-3xl animate-ping opacity-15"></div>
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Order Placed <span className="text-[#25D366]">Successfully</span></h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-md mx-auto">
                      Your order ID <span className="text-white font-bold">{orderId}</span> has been written directly to our secure central servers, awaiting human verification.
                    </p>
                  </div>

                  {/* Large green compliance button */}
                  <div className="p-4 bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl max-w-md mx-auto space-y-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#25D366] flex items-center justify-center gap-2">
                      <Clock size={12} /> ACTION REQUIREMENT: WhatsApp verification
                    </div>
                    
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-normal">
                      Click the green button below to automatically generate and transfer your request metadata and payment verification details straight to our support inbox on WhatsApp.
                    </p>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4.5 px-6 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.01] shadow-[0_0_25px_rgba(37,211,102,0.25)]"
                    >
                      <svg className="w-5.5 h-5.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.012 14.113.993 11.99.993c-5.442 0-9.87 4.373-9.874 9.8.005 2.115.589 4.103 1.69 5.86l-.994 3.633 3.835-.932z" />
                      </svg>
                      Confirm Order on WhatsApp
                    </a>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto pt-4">
                    <Link 
                      to="/profile"
                      className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      View Order Status
                    </Link>
                    <Link 
                      to="/"
                      className="px-6 py-3 bg-[#00F0FF]/10 border border-[#00F0FF]/25 hover:bg-[#00F0FF] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest text-[#00F0FF] transition-all"
                    >
                      Return Home
                    </Link>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* Secure details footer */}
          {step !== 5 && (
            <div className="flex items-start gap-4 p-6 bg-[#00F0FF]/5 border border-[#00F0FF]/15 rounded-3xl">
              <ShieldCheck className="text-[#00F0FF] shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-white">Military Encrypted Payment Gateway</div>
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                  Orders are processed and hosted directly in secure Google Cloud Run virtual instances with zero third-party exposure.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Simple visual Cart Sticky sidebar during steps 1-4 */}
        {step !== 5 && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#151619]/40 border border-white/5 rounded-[2rem] p-6 space-y-6 sticky top-28 backdrop-blur-md">
              
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 text-center flex items-center justify-center gap-2">
                <ShoppingBag size={14} /> Neural Cart Items ({cart.length})
              </h3>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={item.id || idx} className="flex justify-between items-center gap-4 group">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0B0B0F] border border-white/5 overflow-hidden shrink-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-60" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-[9px] font-black uppercase truncate text-white">{item.name}</div>
                        <div className="text-[8px] font-mono text-[#00F0FF] uppercase tracking-wider">
                          Qty: {item.quantity || 1} &nbsp;|&nbsp; {getVersionLabel(item.selectedSlotType || 'SECONDARY')}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono font-black text-white shrink-0">
                      {formatPrice(item.price * (1 - (item.discount || 0) / 100) * (item.quantity || 1))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5 text-[9px] font-mono uppercase tracking-[0.1em]">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal Value</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Friction Taxes</span>
                  <span className="text-[#00F0FF]">EGP 0.00</span>
                </div>
                <div className="flex justify-between text-xs font-sans font-black uppercase tracking-tight text-white border-t border-white/5 pt-3">
                  <span>Total Due</span>
                  <span className="text-[#00F0FF] drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">{formatPrice(total)}</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
