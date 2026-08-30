import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, ToggleLeft, ToggleRight, Save, RefreshCw, 
  CreditCard, Smartphone, DollarSign, Store, Image as ImageIcon, Copy, Check, Info, X
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadMedia } from '../../lib/storageHelper';
import { safeAddDoc, safeUpdateDoc, cleanFirestoreData } from '../../lib/firestoreUtils';

export interface PaymentMethodEntity {
  id: string;
  name: string;
  number: string;
  accountName?: string;
  qrImage?: string;
  instructions: string;
  active: boolean;
  displayOrder?: number;
  createdAt?: string;
}

interface PaymentsModuleProps {
  showToast: (msg: string) => void;
}

export default function PaymentsModule({ showToast }: PaymentsModuleProps) {
  const [methods, setMethods] = useState<PaymentMethodEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodEntity | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [active, setActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(1);

  // Upload States
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'payment_methods'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentMethodEntity[];
      // Sort by displayOrder ascending, fallback to index
      list.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      setMethods(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to load payment methods:", err);
      showToast("Error connecting to dynamic payment credentials database.");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Soft auto-seed fallback when loaded dynamic list is empty
  useEffect(() => {
    if (!loading && methods.length === 0 && !seeding) {
      const seedDefaults = async () => {
        setSeeding(true);
        try {
          // Attempt to retrieve pre-configured settings/payment keys
          let paymentSettings = {
            instaPayLink: 'https://ipn.eg/S/shehabzoro/instapay/4Mo5Lf',
            instaPayUsername: 'shehabzoro',
            vodafoneCashNumber: '01014018260',
            fawryNumber: '01014018260',
            teldaUsername: 'shoruu',
            storeAddress: "City Star's Tower Mall, 6 October City, Egypt",
            googleMapsLink: 'https://maps.app.goo.gl/3K5K'
          };

          try {
            const snap = await getDoc(doc(db, 'settings', 'payment'));
            if (snap.exists()) {
              paymentSettings = { ...paymentSettings, ...snap.data() };
            }
          } catch (e) {
            console.warn("[PAYMENTS SEEDER] Could not fetch settings/payment doc", e);
          }

          const defaultGateways = [
            {
              name: 'InstaPay',
              number: paymentSettings.instaPayUsername,
              accountName: 'Direct Payment',
              instructions: `Open your InstaPay app on your mobile, pick direct transfer of money, and input our username handle listed above. Complete your payment and please take a screenshot of your successful transaction to upload as payment proof. Alternatively, pay directly: ${paymentSettings.instaPayLink}`,
              qrImage: '',
              active: true,
              displayOrder: 1,
              createdAt: new Date().toISOString()
            },
            {
              name: 'Vodafone Cash',
              number: paymentSettings.vodafoneCashNumber,
              accountName: 'Mobile Wallet',
              instructions: `Make a mobile wallet transfer transaction of the exact order total EGP to our Vodafone Cash lines listed above. Save the transaction invoice or SMS details and upload its high-resolution snapshot here.`,
              qrImage: '',
              active: true,
              displayOrder: 2,
              createdAt: new Date().toISOString()
            },
            {
              name: 'Telda Wallet',
              number: paymentSettings.teldaUsername,
              accountName: 'Telda Account Tag',
              instructions: `Transfer money using your Telda application to the username provided above. Screenshot your finalized contract transfer page for immediate invoice clearance.`,
              qrImage: '',
              active: true,
              displayOrder: 3,
              createdAt: new Date().toISOString()
            },
            {
              name: 'Fawry Pay',
              number: paymentSettings.fawryNumber,
              accountName: 'Terminal Reference Code',
              instructions: `Visit any kiosk or store containing a Fawry terminal in Egypt. Tell the merchant you would like to deposit to our Fawry account number listed. Grab the physical paper receipt slip and snap a photo to drag-and-drop.`,
              qrImage: '',
              active: true,
              displayOrder: 4,
              createdAt: new Date().toISOString()
            },
            {
              name: 'Cash In Store',
              number: paymentSettings.storeAddress,
              accountName: 'October Outlet',
              instructions: `Deliver cash manually in EGP currency bills directly. Visit our physical store showroom at: ${paymentSettings.storeAddress}. Google Maps Navigation URL: ${paymentSettings.googleMapsLink}`,
              qrImage: '',
              active: true,
              displayOrder: 5,
              createdAt: new Date().toISOString()
            }
          ];

          for (const item of defaultGateways) {
            await addDoc(collection(db, 'payment_methods'), item);
          }
          showToast("SUCCESS: Auto-seeded standard payment methods dynamically.");
        } catch (err: any) {
          console.error("Auto-seeding payment configurations failed:", err);
          showToast("Error processing system payment seeding registry.");
        } finally {
          setSeeding(false);
        }
      };
      seedDefaults();
    }
  }, [loading, methods, seeding]);

  const openCreate = () => {
    setEditingMethod(null);
    setName('');
    setNumber('');
    setAccountName('');
    setQrImage('');
    setInstructions('');
    setActive(true);
    setDisplayOrder(methods.length + 1);
    setIsFormOpen(true);
  };

  const openEdit = (method: PaymentMethodEntity) => {
    setEditingMethod(method);
    setName(method.name);
    setNumber(method.number);
    setAccountName(method.accountName || '');
    setQrImage(method.qrImage || '');
    setInstructions(method.instructions);
    setActive(method.active);
    setDisplayOrder(method.displayOrder ?? 1);
    setIsFormOpen(true);
  };

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    setUploadProgress(0);
    try {
      const res = await uploadMedia(file, (percent) => {
        setUploadProgress(percent);
      });
      setQrImage(res.url);
      showToast("SUCCESS: Payment QR code artwork updated.");
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    } finally {
      setUploadingQr(false);
      setUploadProgress(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) {
      showToast("Method Name and Number are required.");
      return;
    }

    const payload = cleanFirestoreData({
      name: name.trim(),
      number: number.trim(),
      accountName: accountName.trim(),
      qrImage: qrImage || '',
      instructions: instructions.trim(),
      active,
      displayOrder: Number(displayOrder) || 1,
      updatedAt: new Date().toISOString()
    });

    try {
      if (editingMethod) {
        await safeUpdateDoc(doc(db, 'payment_methods', editingMethod.id), payload);
        showToast("SUCCESS: Payment method updated successfully.");
      } else {
        await safeAddDoc(collection(db, 'payment_methods'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        showToast("SUCCESS: New payment method registered successfully.");
      }
      setIsFormOpen(false);
      setEditingMethod(null);
    } catch (err: any) {
      console.error(err);
      showToast(`FAILED: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string, methodName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete payment gateway "${methodName}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'payment_methods', id));
      showToast("SUCCESS: Selected gateway deleted.");
    } catch (err: any) {
      console.error(err);
      showToast(`Failed: ${err?.message || err}`);
    }
  };

  const handleToggleActive = async (method: PaymentMethodEntity) => {
    try {
      await updateDoc(doc(db, 'payment_methods', method.id), {
        active: !method.active,
        updatedAt: new Date().toISOString()
      });
      showToast(`SUCCESS: ${method.name} active toggle saved.`);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to switch status.");
    }
  };

  const getMethodIcon = (methodName: string) => {
    const term = methodName.toLowerCase();
    if (term.includes('vodafone') || term.includes('cash') || term.includes('orange') || term.includes('etisalat') || term.includes('we')) {
      return <Smartphone className="text-red-500" size={20} />;
    }
    if (term.includes('instapay') || term.includes('ipn') || term.includes('bank') || term.includes('visa')) {
      return <CreditCard className="text-[#00F0FF]" size={20} />;
    }
    if (term.includes('fawry') || term.includes('dep') || term.includes('retail')) {
      return <DollarSign className="text-yellow-500" size={20} />;
    }
    return <Store className="text-purple-400" size={20} />;
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00F0FF]/15 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <span className="px-3 py-1 bg-[#00F0FF]/15 text-[#00F0FF] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#00F0FF]/10 select-none">
          SECURE BANKING & PAYMENT GATEWAYS
        </span>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Dynamic Payment Channels</h2>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed max-w-2xl mt-1">
              Configure, disable, and maintain local checkout billing choices. Provide instant bank context, retail cash instructions, or IPN usernames dynamically.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-3.5 bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer shrink-0"
          >
            + Add Payment Method
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="animate-spin text-[#00F0FF] mx-auto" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF] font-mono">
            SYNCING PAYMENTS REGISTRY MATRIX...
          </p>
        </div>
      ) : methods.length === 0 ? (
        <div className="p-16 text-center bg-[#151619] border border-dashed border-white/10 rounded-[2rem] space-y-4">
          <CreditCard className="text-gray-650 mx-auto" size={48} />
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
            NO EXTERNAL PAYMENT GATEWAYS DESIGNATED
          </h3>
          <p className="text-[10px] text-gray-500 font-semibold uppercase max-w-sm mx-auto">
            Get started by adding dynamic gateways that clients can check out with immediately on step 02.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {methods.map((method) => (
            <div 
              key={method.id} 
              className={`p-6 bg-[#151619] border rounded-3xl transition-all relative flex flex-col justify-between gap-6 ${
                method.active ? 'border-white/5 hover:border-white/10' : 'border-red-500/10 opacity-60 bg-black/40'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/5 rounded-2xl">
                      {getMethodIcon(method.name)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        {method.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${method.active ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-gray-500">
                          {method.active ? 'ACTIVE CHECKOUT' : 'DISABLED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleActive(method)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        method.active ? 'text-emerald-400 bg-emerald-500/5' : 'text-gray-500 bg-white/5'
                      }`}
                      title={method.active ? "Temporarily Disable" : "Enable"}
                    >
                      {method.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => openEdit(method)}
                      className="p-1.5 text-gray-400 hover:text-white bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                      title="Edit Account Details"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(method.id, method.name)}
                      className="p-1.5 text-red-500 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="Delete Gateway"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 font-mono text-[10px] text-gray-400 bg-black/30 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Transfer ID:</span>
                    <span className="text-white font-bold">{method.number}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">Display Order:</span>
                    <span className="text-[#00F0FF] font-black">{method.displayOrder ?? 1}</span>
                  </div>
                  {method.accountName && (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-gray-500">Account Name:</span>
                      <span className="text-gray-200 font-bold max-w-[150px] truncate" title={method.accountName}>{method.accountName}</span>
                    </div>
                  )}
                  {method.instructions && (
                    <div className="pt-1.5 space-y-1">
                      <span className="text-gray-500 block">System guidelines:</span>
                      <p className="text-gray-300 font-sans leading-relaxed line-clamp-3">
                        {method.instructions}
                      </p>
                    </div>
                  )}
                  {method.qrImage && (
                    <div className="pt-2 flex items-center gap-2">
                      <ImageIcon size={12} className="text-[#00F0FF]" />
                      <a href={method.qrImage} target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] hover:underline hover:text-[#00F0FF]/80 text-[9px] font-bold uppercase transition-colors">
                        View QR Code Attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal Popup Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-[#0B0B0F] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF] font-mono">
                {editingMethod ? "ALTER SPECIFICATIONS" : "REGISTER PAYMENT TRANSIT"}
              </span>
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <CreditCard size={18} className="text-[#00F0FF]" /> {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Gatename / Channel *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Vodafone Cash, InstaPay"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Mobile/Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. 01014018260, tag@instapay"
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Owner / Account Name (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g. Shehab Mohamed"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Execution Guidelines & Instructions</label>
                <textarea
                  placeholder="E.g. Open your InstaPay app, key in the username provided, complete the transaction and snapshot your proof of payment..."
                  rows={3}
                  required
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* QR Image Selection */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block font-mono">QR Scan Code Graphic</span>
                {qrImage ? (
                  <div className="relative group/qr rounded-xl border border-white/10 h-32 w-32 overflow-hidden mx-auto bg-black/40">
                    <img src={qrImage} alt="QR Code" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/qr:opacity-100 flex items-center justify-center transition-opacity">
                      <button
                        type="button"
                        onClick={() => setQrImage('')}
                        className="px-2 py-0.5 bg-red-650 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-xl text-center space-y-1">
                    <ImageIcon className="text-gray-650" size={24} />
                    <span className="text-[8px] text-gray-500 font-semibold uppercase">NO ACTIVE QR ATTACHMENT</span>
                  </div>
                )}
                <label className="block w-full text-center py-2.5 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 border border-[#00F0FF]/20 rounded-xl text-[8px] font-black uppercase cursor-pointer transition-colors font-mono tracking-widest">
                  {uploadingQr 
                    ? `STORING FILE (${uploadProgress !== null ? uploadProgress : 0}%)` 
                    : "Upload QR Scan Code File"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingQr}
                    onChange={handleUploadQr}
                  />
                </label>
                <input
                  type="text"
                  value={qrImage}
                  onChange={e => setQrImage(e.target.value)}
                  placeholder="Or paste Direct QR Code URL..."
                  className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-mono focus:outline-none"
                />
              </div>

              {/* Display Order input */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono">Display Order Index (Lower index gets displayed first)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={displayOrder}
                  onChange={e => setDisplayOrder(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#151619] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* Active Switch status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="w-4 h-4 bg-[#151619] border border-white/5 text-[#00F0FF] focus:ring-0 rounded cursor-pointer"
                />
                <label htmlFor="active" className="text-xs font-black uppercase tracking-tight text-white cursor-pointer select-none">
                  Appear Active on customer checkout
                </label>
              </div>

              {/* Submit / Cancel Buttons */}
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
                  <Save size={12} strokeWidth={3} /> SAVE BILLING GATEWAY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
