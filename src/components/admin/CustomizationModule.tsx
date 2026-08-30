import React, { useState, useEffect } from 'react';
import { 
  Palette, Globe, Phone, FileText, Settings, Heart, HelpCircle, 
  MapPin, Clock, Save, ShieldCheck, UploadCloud, AlertCircle, RefreshCw, CheckCircle2, History
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, storage } from '../../firebase';
import { uploadMedia, deleteImageHelper } from '../../lib/storageHelper';
import firebaseConfig from '../../../firebase-applet-config.json';
import { safeSetDoc, cleanFirestoreData } from '../../lib/firestoreUtils';

interface CustomizationModuleProps {
  showToast: (msg: string) => void;
}

export default function CustomizationModule({ showToast }: CustomizationModuleProps) {
  const [storeName, setStoreName] = useState("ZeroLag Games Store");
  const [storeLogo, setStoreLogo] = useState("ZL Enterprise");
  const [storeDesc, setStoreDesc] = useState("Egypt's premium digital gaming warehouse. Level up with automated Shared Slots, instant license dispatch, smart reservation sweeps, and 1-Year dynamic safety warranty.");
  const [primaryColor, setPrimaryColor] = useState("#00F0FF");
  const [accentColor, setAccentColor] = useState("#6C5CE7");
  const [footerContent, setFooterContent] = useState("© 2026 ZeroLag Games Egypt. Authorized gaming licensing and account distribution division.");
  
  // New visual branding states
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [heroBannerUrl, setHeroBannerUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  
  // Upload triggers states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  // Contact details
  const [phone, setPhone] = useState("01114763125");
  const [whatsApp, setWhatsApp] = useState("01114763125");
  const [facebook, setFacebook] = useState("https://facebook.com/zerolag.games");
  const [instagram, setInstagram] = useState("@zerolag_games");
  const [tikTok, setTikTok] = useState("@zerolag.eg");
  const [discord, setDiscord] = useState("https://discord.gg/zerolag");
  const [youtube, setYoutube] = useState("https://youtube.com/c/zerolag_egypt");
  const [telegram, setTelegram] = useState("https://t.me/zerolaggames");
  const [email, setEmail] = useState("zerolag0000@gmail.com");
  const [googleMapsLink, setGoogleMapsLink] = useState("https://maps.google.com/?q=6+October+CityStar+Mall+Tower+3");
  const [supportLinks, setSupportLinks] = useState("Contact Support: /contact, Refund SLA: /warranty, Active Check: /lookup");
  const [address, setAddress] = useState("City Star's Tower Mall, 6 October City, Egypt");
  const [workingHours, setWorkingHours] = useState("10:00 AM - 02:00 AM Daily");

  const [saving, setSaving] = useState(false);

  // CONFIG RUNTIME AUDIT LOGS
  useEffect(() => {
    console.log("==================================================");
    console.log("             FIREBASE STORAGE RUNTIME AUDIT");
    console.log("==================================================");
    console.log("projectId:      ", firebaseConfig.projectId);
    console.log("storageBucket:  ", firebaseConfig.storageBucket);
    console.log("authDomain:     ", firebaseConfig.authDomain);
    console.log("Firebase Storage initialized: ", !!storage);
    console.log("==================================================");
  }, []);

  // Upload & storage audit state
  const [auditLog, setAuditLog] = useState<{
    step: string;
    logs: string[];
    status: 'idle' | 'running' | 'success' | 'failed' | 'timeout';
    fileName: string;
    fileSizeStr: string;
    storagePath: string;
    firestoreCollection: string;
    elapsedTime: number;
    errorCode?: string;
    errorMessage?: string;
    currentUserEmail?: string;
    currentUserUid?: string;
  } | null>(null);

  const orchestrateUpload = async (
    file: File, 
    type: 'logo' | 'favicon' | 'banner', 
    setUploading: (val: boolean) => void,
    setUrl: (val: string) => void,
    field: string,
    oldUrl: string
  ) => {
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `media/${filename}`;
    const collectionName = 'settings';
    
    // Validate file type and size upfront
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const nameLower = file.name.toLowerCase();
    const formatValid = allowedExtensions.some(ext => nameLower.endsWith(ext)) ||
                        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
                        
    if (!formatValid) {
      showToast('ERROR: Unsupported image format. Please select a JPG, PNG, or WEBP image.');
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      showToast(`ERROR: File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed size is 10MB.`);
      return;
    }

    // STEP 1 FILE SELECTED
    const initialLog = {
      step: "STEP 1 FILE SELECTED",
      logs: [`[BRANDING AUDIT] STEP 1 FILE SELECTED: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`],
      status: 'running' as const,
      fileName: file.name,
      fileSizeStr: `${(file.size / 1024).toFixed(2)} KB`,
      storagePath,
      firestoreCollection: `${collectionName}/store`,
      elapsedTime: 0,
      currentUserEmail: auth.currentUser?.email || 'N/A',
      currentUserUid: auth.currentUser?.uid || 'N/A',
    };
    
    setAuditLog(initialLog);
    setUploading(true);
    
    let timer: any = null;
    let elapsed = 0;
    
    timer = setInterval(() => {
      elapsed += 0.1;
      setAuditLog(prev => prev ? { ...prev, elapsedTime: Math.round(elapsed * 10) / 10 } : null);
    }, 100);

    try {
      // STEP 2 UPLOAD STARTED
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          step: "STEP 2 UPLOAD STARTED",
          logs: [...prev.logs, `[BRANDING AUDIT] STEP 2 UPLOAD STARTED: Initializing Cloudinary transport stream.`]
        };
      });

      // STEP 3 STORAGE CONNECTED
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          step: "STEP 3 CLOUDINARY CONNECTED",
          logs: [...prev.logs, `[BRANDING AUDIT] STEP 3 CLOUDINARY CONNECTED: Media endpoint endpoint resolved.`]
        };
      });

      // Trigger our robust upload with dynamic progress updates
      const res = await uploadMedia(file, (percent) => {
        setAuditLog(prev => {
          if (!prev) return null;
          // Only add a log line every 20% to avoid overwhelming logs array
          const shouldAddLog = percent % 20 === 0 || percent === 100;
          const newLogs = shouldAddLog 
            ? [...prev.logs, `[BRANDING AUDIT] STEP 4 FILE UPLOADING: ${percent}% completed.` ]
            : prev.logs;
          return {
            ...prev,
            step: `STEP 4 FILE UPLOADED (${percent}%)`,
            logs: newLogs
          };
        });
      });
      const downloadUrl = res.url;

      // STEP 5 DOWNLOAD URL CREATED
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          step: "STEP 5 DOWNLOAD URL CREATED",
          logs: [...prev.logs, `[BRANDING AUDIT] STEP 5 DOWNLOAD URL CREATED: Resolved URI: ${downloadUrl}`]
        };
      });

      // STEP 6 FIRESTORE UPDATED
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          step: "STEP 6 FIRESTORE UPDATED",
          logs: [...prev.logs, `[BRANDING AUDIT] STEP 6 FIRESTORE UPDATED: Writing field '${field}' to document settings/store.`]
        };
      });

      await setDoc(doc(db, 'settings', 'store'), {
        [field]: downloadUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // STEP 7 UI REFRESHED
      setUrl(downloadUrl);
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          step: "STEP 7 UI REFRESHED",
          logs: [...prev.logs, `[BRANDING AUDIT] STEP 7 UI REFRESHED: Local state updated.`]
        };
      });

      // STEP 8 SUCCESS
      clearInterval(timer);
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'success',
          step: "STEP 8 SUCCESS",
          logs: [...prev.logs, `[BRANDING AUDIT] STEP 8 SUCCESS: Deploy cycle completed.`]
        };
      });

      showToast("SUCCESS: Changes saved successfully.");

      // Cleanup old logo/favicon/banner
      if (oldUrl && oldUrl !== downloadUrl) {
        try {
          await deleteImageHelper(oldUrl);
        } catch (e) {
          console.warn("Could not delete old image:", e);
        }
      }

    } catch (error: any) {
      clearInterval(timer);
      console.error("[BRANDING AUDIT] Critical upload failure:", error);
      
      const isTimeout = error?.message?.includes('timed out') || error?.message?.includes('timeout');
      
      setAuditLog(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: isTimeout ? 'timeout' : 'failed',
          errorCode: error?.code || 'FAIL_CODE_GENERIC',
          errorMessage: error?.message || String(error),
          logs: [...prev.logs, `[BRANDING AUDIT] ERROR AT ${prev.step}: ${error?.message || String(error)}`]
        };
      });
      showToast(`ERROR: ${error?.message || error}`);
    } finally {
      setUploading(false);
    }
  };

  // Logo upload & update script
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await orchestrateUpload(file, 'logo', setUploadingLogo, setLogoUrl, 'logoUrl', logoUrl);
  };

  const handleLogoRemove = async () => {
    const oldLogo = logoUrl;
    if (!oldLogo) return;
    
    console.log("[BRANDING SERVICE] Removing branding logo...");
    setUploadingLogo(true);
    try {
      console.log("[BRANDING SERVICE] Removing logo URL from Firestore...");
      await setDoc(doc(db, 'settings', 'store'), {
        logoUrl: "",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[BRANDING SERVICE] Firestore logo URL removed successfully.");
      
      setLogoUrl("");
      showToast("Branding Logo removed.");
      
      console.log("[BRANDING SERVICE] Deleting logo file from Firebase Storage: ", oldLogo);
      await deleteImageHelper(oldLogo);
      console.log("[BRANDING SERVICE] Logo file deletion completed.");
    } catch (err: any) {
      console.error("[BRANDING SERVICE] ERROR during logo removal: ", err);
      showToast(`Logo removal failed: ${err?.message || err}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Favicon upload & update script
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await orchestrateUpload(file, 'favicon', setUploadingFavicon, setFaviconUrl, 'faviconUrl', faviconUrl);
  };

  const handleFaviconRemove = async () => {
    const oldFavicon = faviconUrl;
    if (!oldFavicon) return;
    
    console.log("[BRANDING SERVICE] Removing favicon...");
    setUploadingFavicon(true);
    try {
      console.log("[BRANDING SERVICE] Removing favicon URL from Firestore...");
      await setDoc(doc(db, 'settings', 'store'), {
        faviconUrl: "",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[BRANDING SERVICE] Firestore favicon URL removed.");
      
      setFaviconUrl("");
      showToast("Store Favicon removed.");
      
      console.log("[BRANDING SERVICE] Deleting favicon file from Firebase Storage: ", oldFavicon);
      await deleteImageHelper(oldFavicon);
      console.log("[BRANDING SERVICE] Favicon file deletion completed.");
    } catch (err: any) {
      console.error("[BRANDING SERVICE] ERROR during favicon removal: ", err);
      showToast(`Favicon removal failed: ${err?.message || err}`);
    } finally {
      setUploadingFavicon(false);
    }
  };

  // Hero Banner upload & update script
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await orchestrateUpload(file, 'banner', setUploadingHero, setHeroBannerUrl, 'heroBannerUrl', heroBannerUrl);
  };

  const handleBannerRemove = async () => {
    const oldBanner = heroBannerUrl;
    if (!oldBanner) return;
    
    console.log("[BRANDING SERVICE] Removing banner...");
    setUploadingHero(true);
    try {
      console.log("[BRANDING SERVICE] Removing banner URL from Firestore...");
      await setDoc(doc(db, 'settings', 'store'), {
        heroBannerUrl: "",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[BRANDING SERVICE] Firestore banner URL removed.");
      
      setHeroBannerUrl("");
      showToast("Jumbo Hero Banner removed.");
      
      console.log("[BRANDING SERVICE] Deleting banner file from Firebase Storage: ", oldBanner);
      await deleteImageHelper(oldBanner);
      console.log("[BRANDING SERVICE] Banner file deletion completed.");
    } catch (err: any) {
      console.error("[BRANDING SERVICE] ERROR during banner removal: ", err);
      showToast(`Banner removal failed: ${err?.message || err}`);
    } finally {
      setUploadingHero(false);
    }
  };

  // Load from database settings collection
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'store'));
        if (snap.exists()) {
          const d = snap.data();
          if (d.storeName) setStoreName(d.storeName);
          if (d.logoUrl) setLogoUrl(d.logoUrl);
          if (d.faviconUrl) setFaviconUrl(d.faviconUrl);
          if (d.heroBannerUrl) setHeroBannerUrl(d.heroBannerUrl);
          if (d.trailerUrl) setTrailerUrl(d.trailerUrl);
          if (d.storeDescription) setStoreDesc(d.storeDescription);
          if (d.primaryColor) setPrimaryColor(d.primaryColor);
          if (d.secondaryColor) setAccentColor(d.secondaryColor);
          if (d.footerContent) setFooterContent(d.footerContent);
          if (d.phone) setPhone(d.phone);
          if (d.whatsApp) setWhatsApp(d.whatsApp);
          if (d.facebook) setFacebook(d.facebook);
          if (d.instagram) setInstagram(d.instagram);
          if (d.tikTok) setTikTok(d.tikTok);
          if (d.discord) setDiscord(d.discord);
          if (d.youtube) setYoutube(d.youtube);
          if (d.telegram) setTelegram(d.telegram);
          if (d.email) setEmail(d.email);
          if (d.googleMapsLink) setGoogleMapsLink(d.googleMapsLink);
          if (d.supportLinks) setSupportLinks(d.supportLinks);
          if (d.address) setAddress(d.address);
          if (d.workingHours) setWorkingHours(d.workingHours);
        }
      } catch (err) {
        console.error("Error loading configs: ", err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = cleanFirestoreData({
        storeName: storeName.trim(),
        logoUrl: logoUrl || '',
        faviconUrl: faviconUrl || '',
        heroBannerUrl: heroBannerUrl || '',
        trailerUrl: trailerUrl || '',
        storeDescription: storeDesc.trim(),
        primaryColor: primaryColor || '#00F0FF',
        secondaryColor: accentColor || '#6C5CE7',
        footerContent: footerContent.trim(),
        phone: phone.trim(),
        whatsApp: whatsApp.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        tikTok: tikTok.trim(),
        discord: discord.trim(),
        youtube: youtube.trim(),
        telegram: telegram.trim(),
        email: email.trim(),
        googleMapsLink: googleMapsLink.trim(),
        supportLinks: supportLinks.trim(),
        address: address.trim(),
        workingHours: workingHours.trim(),
        updatedAt: new Date().toISOString()
      });
      await safeSetDoc(doc(db, 'settings', 'store'), payload, { merge: true });
      showToast("SUCCESS: Changes saved successfully.");
    } catch (err: any) {
      console.error(err);
      showToast(`ERROR: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Introduction Card */}
      <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#6C5CE7]/10 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <span className="px-3 py-1 bg-[#6C5CE7]/15 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500/10">
          FRONTEND OPERATIONS POLICIES
        </span>
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Site Branding Customization</h2>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider leading-relaxed max-w-2xl">
          Override application branding variables. These values dynamically configure the customer storefront landing, page banners, social portals, and PDF receipts.
        </p>
      </div>

      {/* STORAGE INTEGRITY MONITOR & AUDIT CONSOLE PANEL */}
      {auditLog && (
        <div className="p-6 bg-[#18191D] border border-white/10 rounded-[2rem] space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <span className="text-[9px] font-black tracking-widest font-mono text-gray-500 uppercase">
              ELAPSED: {auditLog.elapsedTime}s / 30s
            </span>
            <button
              type="button"
              onClick={() => setAuditLog(null)}
              className="text-gray-500 hover:text-white text-xs font-bold leading-none px-2 py-1 rounded hover:bg-white/5 cursor-pointer font-mono"
            >
              [X] CLOSE
            </button>
          </div>

          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <UploadCloud className="text-[#00F0FF] animate-bounce" size={20} />
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] font-mono leading-none">
                Storage Upload Integrity Monitor
              </h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1 font-mono">
                Currently tracking: {auditLog.fileName} ({auditLog.fileSizeStr})
              </p>
            </div>
          </div>

          {/* Core Configuration Verification Audit Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0B0B0F] p-4 rounded-2xl border border-white/5 font-mono text-[9px] text-gray-400">
            <div>
              <span className="text-gray-600 uppercase font-black tracking-wider block">ProjectId Verify</span>
              <span className="text-[#00F0FF] font-semibold break-all">{firebaseConfig.projectId}</span>
            </div>
            <div>
              <span className="text-gray-600 uppercase font-black tracking-wider block">StorageBucket Verify</span>
              <span className="text-[#6C5CE7] font-semibold break-all">{firebaseConfig.storageBucket || "UNDEFINED!"}</span>
            </div>
            <div>
              <span className="text-gray-600 uppercase font-black tracking-wider block">AuthDomain Verify</span>
              <span className="text-indigo-400 font-semibold break-all">{firebaseConfig.authDomain}</span>
            </div>
          </div>

          {/* Sequential Step Timeline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { num: "STEP 1", label: "File Selected", color: "text-emerald-400" },
              { num: "STEP 2", label: "Upload Started", color: "text-[#00F0FF]" },
              { num: "STEP 3", label: "Storage Connected", color: "text-purple-400" },
              { num: "STEP 4", label: "File Uploaded", color: "text-amber-400" },
              { num: "STEP 5", label: "Url Generated", color: "text-blue-400" },
              { num: "STEP 6", label: "Firestore Saved", color: "text-pink-400" },
              { num: "STEP 7", label: "UI Refreshed", color: "text-teal-400" },
              { num: "STEP 8", label: "Success Complete", color: "text-emerald-400" }
            ].map((stepSpec, sIdx) => {
              const matchesStep = parseInt(auditLog.step.split(" ")[1]) >= (sIdx + 1);
              const isActive = auditLog.step.includes(stepSpec.num);
              
              return (
                <div 
                  key={stepSpec.num}
                  className={`p-3 rounded-xl border flex flex-col justify-between h-[65px] transition-all font-mono leading-none ${
                    isActive 
                      ? "bg-[#00F0FF]/5 border-[#00F0FF]/30 animate-pulse" 
                      : matchesStep 
                        ? "bg-emerald-500/5 border-emerald-500/20" 
                        : "bg-white/[0.01] border-white/5 opacity-40"
                  }`}
                >
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest block">{stepSpec.num}</span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {matchesStep ? (
                      <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                    )}
                    <span className="text-[9px] font-black uppercase text-gray-300 tracking-tight truncate">{stepSpec.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Limit Abort & Failure Error Console Box */}
          {(auditLog.status === 'failed' || auditLog.status === 'timeout') && (
            <div className="p-5 bg-red-950/40 border-2 border-red-500/50 rounded-2xl space-y-3.5 relative">
              <div className="absolute top-4 right-4 animate-ping">
                <AlertCircle className="text-red-500" size={18} />
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-wider rounded font-mono">
                  {auditLog.status === 'timeout' ? "UPLOAD TIMED OUT" : "CRITICAL ABORT"}
                </span>
                <span className="text-[10px] text-red-400/80 uppercase font-bold tracking-wider font-mono">
                  Fail Step: {auditLog.step}
                </span>
              </div>

              <div className="bg-[#0f0707] p-4 rounded-xl border border-red-500/10 font-mono text-[10px] text-red-200/90 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <span className="text-red-500/70 uppercase block font-bold text-[8px] tracking-wider">Firebase Error Code</span>
                  <span className="font-semibold">{auditLog.errorCode || "TIMEOUT_ABORT"}</span>
                </div>
                <div>
                  <span className="text-red-500/70 uppercase block font-bold text-[8px] tracking-wider">Storage Target Path</span>
                  <span className="font-semibold break-all">{auditLog.storagePath}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-red-500/70 uppercase block font-bold text-[8px] tracking-wider">Firebase Error Message</span>
                  <span className="font-semibold font-sans text-red-300">{auditLog.errorMessage}</span>
                </div>
                <div>
                  <span className="text-red-500/70 uppercase block font-bold text-[8px] tracking-wider">Firestore Target Collection</span>
                  <span className="font-semibold">{auditLog.firestoreCollection}</span>
                </div>
                <div>
                  <span className="text-red-500/70 uppercase block font-bold text-[8px] tracking-wider">Authenticated Email</span>
                  <span className="font-semibold break-all">{auditLog.currentUserEmail}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-red-500/70 uppercase block font-bold text-[8px] tracking-wider">Authenticated UID</span>
                  <span className="font-semibold break-all">{auditLog.currentUserUid}</span>
                </div>
              </div>

              <div className="p-3 bg-red-950/20 rounded-xl flex items-center gap-3">
                <RefreshCw size={14} className="text-red-400 shrink-0" />
                <p className="text-[9px] text-red-300 uppercase font-semibold tracking-wide leading-normal">
                  Troubleshooting tip: Check bucket CORS configurations and verify Storage security rule sets permission access for admin UIDs.
                </p>
              </div>
            </div>
          )}

          {/* Success Console indicator */}
          {auditLog.status === 'success' && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/35 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block font-mono">✓ BRANDING AUDIT OK</span>
                  <span className="text-[9px] text-gray-500 uppercase font-semibold block mt-0.5 font-mono">All steps completed without warnings. Client updated in real-time.</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-mono uppercase font-black tracking-widest border border-emerald-500/25">
                PASS
              </span>
            </div>
          )}

          {/* Active Terminal Logs Output Console */}
          <div className="bg-[#0B0B0F] p-4.5 rounded-2xl border border-white/5 font-mono text-[9px] leading-relaxed select-text text-gray-400 max-h-[160px] overflow-y-auto space-y-1 scrollbar-thin">
            <div className="text-gray-600 font-bold uppercase tracking-widest border-b border-white/5 pb-2 mb-2 flex items-center justify-between">
              <span>Live Console Buffers</span>
              <span>STATE: {auditLog.status.toUpperCase()}</span>
            </div>
            {auditLog.logs.map((logEntry, logIdx) => (
              <div key={logIdx} className="hover:bg-white/[0.02] px-1 rounded truncate">
                {logEntry}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Identity Form block */}
        <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
            <Globe size={14} /> Brand Identity Options
          </h3>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500">Store Name Brand</label>
            <input 
              type="text" 
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white uppercase font-black"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500">Store Core Meta Description</label>
            <textarea 
              value={storeDesc}
              onChange={e => setStoreDesc(e.target.value)}
              rows={4}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white leading-relaxed font-semibold uppercase tracking-wider"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500 font-mono">Global Footer Notice</label>
            <input 
              type="text" 
              value={footerContent}
              onChange={e => setFooterContent(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500 font-mono text-[#00F0FF]">Promotional Trailer YouTube URL</label>
            <input 
              type="text" 
              value={trailerUrl}
              onChange={e => setTrailerUrl(e.target.value)}
              placeholder="E.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              className="w-full bg-[#0B0B0F] border border-[#00F0FF]/30 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-650"
            />
          </div>

          <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2 pt-4 border-t border-white/5 mt-4">
            <Settings size={14} className="text-[#00F0FF]" /> Live Store Branding Assets
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Store Logo Asset */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-2">Store Logo Asset</span>
                {logoUrl ? (
                  <div className="relative group/logo rounded border border-white/10 bg-black/40 overflow-hidden w-20 h-20 flex items-center justify-center p-1">
                    <img src={logoUrl} alt="Store Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity gap-1">
                      <button 
                        type="button" 
                        onClick={handleLogoRemove}
                        className="p-1 bgColor bg-red-600 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                        title="Remove Logo"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-black/60 border border-white/5 rounded text-[8px] text-gray-500 font-bold uppercase">NO LOGO</div>
                )}
              </div>
              <label className="block w-full text-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase cursor-pointer mt-2">
                {uploadingLogo ? "UPLOADING..." : logoUrl ? "REPLACE LOGO" : "UPLOAD LOGO"}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload} 
                />
              </label>
            </div>

            {/* Store Favicon Asset */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-2 font-mono">Favicon (16x16 / 32x32)</span>
                {faviconUrl ? (
                  <div className="relative group/favicon rounded border border-white/10 bg-black/40 overflow-hidden w-20 h-20 flex items-center justify-center p-1">
                    <img src={faviconUrl} alt="Store Favicon" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/favicon:opacity-100 flex items-center justify-center transition-opacity gap-1">
                      <button 
                        type="button" 
                        onClick={handleFaviconRemove}
                        className="p-1 bg-red-600 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                        title="Remove Favicon"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center bg-black/60 border border-white/5 rounded text-[8px] text-gray-500 font-bold uppercase font-mono">NO FAV</div>
                )}
              </div>
              <label className="block w-full text-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase cursor-pointer mt-2">
                {uploadingFavicon ? "UPLOADING..." : faviconUrl ? "REPLACE FAVICON" : "UPLOAD FAVICON"}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={uploadingFavicon}
                  onChange={handleFaviconUpload} 
                />
              </label>
            </div>

            {/* Store Hero Banner */}
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-2 font-mono">Jumbo Hero Banner</span>
                {heroBannerUrl ? (
                  <div className="relative group/banner rounded border border-white/10 bg-black/40 overflow-hidden w-full h-20 flex items-center justify-center">
                    <img src={heroBannerUrl} alt="Hero Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/banner:opacity-100 flex items-center justify-center transition-opacity gap-1">
                      <button 
                        type="button" 
                        onClick={handleBannerRemove}
                        className="p-1 bg-red-600 rounded text-white text-[8px] font-bold tracking-tight uppercase hover:bg-red-500 cursor-pointer"
                        title="Remove Banner"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-20 flex items-center justify-center bg-black/60 border border-white/5 rounded text-[8px] text-gray-500 font-bold uppercase font-mono">NO BANNER</div>
                )}
              </div>
              <label className="block w-full text-center py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase cursor-pointer mt-2">
                {uploadingHero ? "UPLOADING..." : heroBannerUrl ? "REPLACE BANNER" : "UPLOAD BANNER"}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={uploadingHero}
                  onChange={handleBannerUpload} 
                />
              </label>
            </div>
          </div>
        </div>

        {/* Dynamic Stylings & Colors */}
        <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#6C5CE7] flex items-center gap-2">
            <Palette size={14} /> Global Color Scheme
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Primary Core Neon Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent border border-white/10 p-0.5 cursor-pointer"
                />
                <input 
                  type="text" 
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-[#0B0B0F] border border-white/10 rounded-xl px-3 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Secondary Accent Glow</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent border border-white/10 p-0.5 cursor-pointer"
                />
                <input 
                  type="text" 
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="flex-1 bg-[#0B0B0F] border border-white/10 rounded-xl px-3 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-pink-400 block font-mono">✓ ENTERPRISE CAPABILITY STATUS</span>
            <p className="text-[9px] text-gray-500 uppercase font-semibold leading-relaxed">
              Theme engine handles hot stylesheet compile at runtime level mapping customized Tailwind color targets.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact details & working hours */}
        <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
            <Phone size={14} /> Support & Channels
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Direct Landline Phone</label>
              <input 
                type="text" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">WhatsApp Link Number</label>
              <input 
                type="text" 
                value={whatsApp}
                onChange={e => setWhatsApp(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Facebook Page URL</label>
              <input 
                type="text" 
                value={facebook}
                onChange={e => setFacebook(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Instagram Handle</label>
              <input 
                type="text" 
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">TikTok Handle</label>
              <input 
                type="text" 
                value={tikTok}
                onChange={e => setTikTok(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Discord Server Link</label>
              <input 
                type="text" 
                value={discord}
                onChange={e => setDiscord(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Telegram Link</label>
              <input 
                type="text" 
                value={telegram}
                onChange={e => setTelegram(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">Contact Support Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-500">YouTube Channel URL</label>
              <input 
                type="text" 
                value={youtube}
                onChange={e => setYoutube(e.target.value)}
                className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Operating Coordinates */}
        <div className="p-8 bg-[#151619] rounded-[2rem] border border-white/5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
            <MapPin size={14} /> Physical Coordinate Limits
          </h3>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500">Store Core Warehouse Address</label>
            <input 
              type="text" 
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500">Google Maps Navigation Link</label>
            <input 
              type="text" 
              value={googleMapsLink}
              onChange={e => setGoogleMapsLink(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500">Global Customer Support Quicklinks</label>
            <textarea 
              value={supportLinks}
              onChange={e => setSupportLinks(e.target.value)}
              rows={2}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-500">Store active Work Hours Shift timings</label>
            <input 
              type="text" 
              value={workingHours}
              onChange={e => setWorkingHours(e.target.value)}
              className="w-full bg-[#0B0B0F] border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-mono"
            />
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-center gap-4">
            <Clock size={24} className="text-yellow-400 shrink-0" />
            <div className="leading-tight">
              <span className="text-[9px] font-black uppercase text-yellow-400 block font-mono">Working hours lock enabled</span>
              <p className="text-[9px] text-gray-500 uppercase font-semibold">
                Auto-reservation sweep locks terminate operations outside specified timetables for maximum digital key safety.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-[#00F0FF] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} />
              {saving ? "SYNCING..." : "COMMIT GLOBAL SITE CONFIG"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
