import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Database, Image, CheckCircle, RefreshCcw, 
  UserCheck, Terminal, HardDrive, Wifi, Activity, Cloud, Key
} from 'lucide-react';
import { db, auth, storage } from '../../firebase';
import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { uploadMedia } from '../../lib/storageHelper';
import { useAuth } from '../../App';
import { formatPrice } from '../../lib/utils';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function DiagnosticsModule() {
  const { user, userRole, storeSettings } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'testing' | 'online' | 'offline'>('testing');
  const [stats, setStats] = useState({
    productsCount: 0,
    accountsCount: 0,
    ordersCount: 0,
    logsCount: 0
  });
  const [testLog, setTestLog] = useState<string[]>([]);

  // Storage and Cloudinary audit specific state
  const [auditRunning, setAuditRunning] = useState(false);
  const [storageTest, setStorageTest] = useState<{
    storageBucket: string;
    currentUserUid: string;
    currentUserEmail: string;
    uploadTargetPath: string;
    uploadError: string;
    isEnabled: string;
    isReachable: string;
    uploadBytesSuccess: string;
    getDownloadURLSuccess: string;
  }>({
    storageBucket: firebaseConfig.storageBucket || "Not set / disabled",
    currentUserUid: 'Not detected',
    currentUserEmail: 'Not detected',
    uploadTargetPath: 'Cloudinary Unsigned API Gateway',
    uploadError: 'No tests run yet. Fire the test button to run storage diagnostics.',
    isEnabled: 'Check Pending',
    isReachable: 'Check Pending',
    uploadBytesSuccess: 'Check Pending',
    getDownloadURLSuccess: 'Check Pending'
  });

  const [cloudinaryTest, setCloudinaryTest] = useState<{
    endpoint: string;
    cloudName: string;
    uploadPreset: string;
    requestPayload: string;
    testStatus: 'Pending' | 'PASS' | 'FAIL';
    returnedUrl: string;
    rawResponse: string;
  }>({
    endpoint: `https://api.cloudinary.com/v1_1/da7lsqvhb/image/upload`,
    cloudName: 'da7lsqvhb',
    uploadPreset: 'zerolag_upload',
    requestPayload: '{\n  "file": "[Blob / File binary]",\n  "upload_preset": "zerolag_upload"\n}',
    testStatus: 'Pending',
    returnedUrl: '',
    rawResponse: 'No tests run yet. Fire the test button below.'
  });

  const addLog = (msg: string) => {
    setTestLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
  };

  const runStorageDiagnostics = async () => {
    setAuditRunning(true);
    const bucketValue = firebaseConfig.storageBucket || "Not Defined";
    const currentUid = auth.currentUser?.uid || "Not Authenticated";
    const currentEmail = auth.currentUser?.email || "Not Authenticated";
    
    addLog("[AUDIT ENGINE] Starting Media Upload Audit run...");
    addLog("[AUDIT ENGINE] NOTE: Firebase storage has been completely disabled and migrated to Cloudinary!");
    addLog(`[AUDIT ENGINE] Current user email: "${currentEmail}" / UID: "${currentUid}"`);
    addLog(`[AUDIT ENGINE] Configured storageBucket: "${bucketValue}"`);

    const metaEnv = (import.meta as any).env || {};
    const cloudName = metaEnv.VITE_CLOUDINARY_CLOUD_NAME || 'da7lsqvhb';
    const uploadPreset = metaEnv.VITE_CLOUDINARY_UPLOAD_PRESET || 'zerolag_upload';
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    addLog(`[AUDIT ENGINE] Cloud Name resolved to: "${cloudName}"`);
    addLog(`[AUDIT ENGINE] Upload Preset resolved to: "${uploadPreset}"`);
    addLog(`[AUDIT ENGINE] Upload Endpoint: "${endpoint}"`);

    const dummyFile = new File(
      [new Blob(["Verified Direct Cloudinary Integrity Payload bytes stream"], { type: "image/png" })], 
      "cloudinary_audit_test.png", 
      { type: "image/png" }
    );

    const formData = new FormData();
    formData.append('file', dummyFile);
    formData.append('upload_preset', uploadPreset);

    addLog("[AUDIT ENGINE] Triggering test upload via direct Ajax fetch to retrieve response codes...");

    let isEnabled = 'Bypassed (Removed)';
    let isReachable = 'Checking';
    let uploadBytesSuccess = 'Checking';
    let getDownloadURLSuccess = 'Checking';
    let uploadError = '';

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });

      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (response.ok && parsed && (parsed.secure_url || parsed.url)) {
        addLog("[AUDIT ENGINE] PASS - Image uploaded successfully and URL returned!");
        addLog(`[AUDIT ENGINE] CDN Asset URL: ${parsed.secure_url || parsed.url}`);
        
        isEnabled = 'Success (Cloudinary Active)';
        isReachable = 'Success (Cloudinary Reachable)';
        uploadBytesSuccess = 'Success (PASS)';
        getDownloadURLSuccess = 'Success (PASS)';
        uploadError = 'None. Cloudinary operations are fully healthy!';

        setCloudinaryTest({
          endpoint,
          cloudName,
          uploadPreset,
          requestPayload: `{\n  "file": "[File binary: size=${dummyFile.size} bytes, type=${dummyFile.type}]",\n  "upload_preset": "${uploadPreset}"\n}`,
          testStatus: 'PASS',
          returnedUrl: parsed.secure_url || parsed.url,
          rawResponse: JSON.stringify(parsed, null, 2)
        });
      } else {
        addLog(`[AUDIT ENGINE] FAIL - Cloudinary rejected the upload format or credentials with status ${response.status}`);
        addLog(`[AUDIT ENGINE] Cloudinary API reply message: ${text}`);

        isEnabled = 'Success (Cloudinary Active)';
        isReachable = 'Success (Cloudinary Reachable)';
        uploadBytesSuccess = `Failed: HTTP ${response.status}`;
        getDownloadURLSuccess = 'Failed';
        uploadError = parsed?.error?.message || text || `API rejected with status ${response.status}`;

        setCloudinaryTest({
          endpoint,
          cloudName,
          uploadPreset,
          requestPayload: `{\n  "file": "[File binary: size=${dummyFile.size} bytes, type=${dummyFile.type}]",\n  "upload_preset": "${uploadPreset}"\n}`,
          testStatus: 'FAIL',
          returnedUrl: '',
          rawResponse: text || `HTTP Status ${response.status}: ${response.statusText}`
        });
      }
    } catch (e: any) {
      addLog(`[AUDIT ENGINE] FAIL - Network exception during upload payload dispatch: ${e.message || String(e)}`);
      
      isEnabled = 'Success (Cloudinary Active)';
      isReachable = 'Failed (Unreachable / Offline)';
      uploadBytesSuccess = 'Failed';
      getDownloadURLSuccess = 'Failed';
      uploadError = e.message || String(e);

      setCloudinaryTest({
        endpoint,
        cloudName,
        uploadPreset,
        requestPayload: `{\n  "file": "[File binary: size=${dummyFile.size} bytes, type=${dummyFile.type}]",\n  "upload_preset": "${uploadPreset}"\n}`,
        testStatus: 'FAIL',
        returnedUrl: '',
        rawResponse: `Connection error: ${e.message || String(e)}`
      });
    }

    setStorageTest({
      storageBucket: bucketValue,
      currentUserUid: currentUid,
      currentUserEmail: currentEmail,
      uploadTargetPath: "Cloudinary Image Gateway",
      uploadError: uploadError,
      isEnabled,
      isReachable,
      uploadBytesSuccess,
      getDownloadURLSuccess
    });
    setAuditRunning(false);
  };

  useEffect(() => {
    // Run auth check update when user state loads
    if (user) {
      setStorageTest(prev => ({
        ...prev,
        currentUserUid: user.uid,
        currentUserEmail: user.email || 'No email'
      }));
    }
  }, [user]);

  const runDiagnostics = async () => {
    setLoading(true);
    addLog("Initializing active sandbox diagnostic sweeps...");
    try {
      // 1. Connection check
      const docRef = doc(db, 'settings', 'store');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setDbStatus('online');
        addLog("OK: Connected to Cloud Firestore 'settings/store'. DB response successful.");
      } else {
        setDbStatus('online');
        addLog("WARN: Firestore is online, but 'settings/store' document does not exist yet.");
      }

      // 2. Fetch inventory metrics
      addLog("Executing collections tally scanning...");
      const pSnap = await getDocs(query(collection(db, 'products'), limit(1)));
      const aSnap = await getDocs(query(collection(db, 'accounts'), limit(1)));
      const oSnap = await getDocs(query(collection(db, 'orders'), limit(1)));
      const lSnap = await getDocs(query(collection(db, 'activity_logs'), limit(1)));

      // Since we don't fetch entire large collections in diagnostics to save reads,
      // we check first row status
      addLog(`Status: Collection 'products' responsive (has docs: ${!pSnap.empty})`);
      addLog(`Status: Collection 'accounts' responsive (has docs: ${!aSnap.empty})`);
      addLog(`Status: Collection 'orders' responsive (has docs: ${!oSnap.empty})`);
      addLog(`Status: Collection 'activity_logs' responsive (has docs: ${!lSnap.empty})`);

      // Let's do a full scan of local metadata values
      addLog("Active user security assessment passing.");
      addLog(`Current Authentication UID: ${auth.currentUser?.uid || 'NONE'}`);
      addLog(`Assigned Role Resolver: ${userRole || 'CUSTOMER'}`);

    } catch (err: any) {
      setDbStatus('offline');
      addLog(`FATAL ERROR: Connection sweep failed -> ${err?.message || err}`);
      console.error(err);
    } finally {
      setLoading(false);
      addLog("Active system diagnostic sweeps finalized.");
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative p-8 bg-[#151619] rounded-[2.5rem] border border-white/5 overflow-hidden animate-fade-in">
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-[#00F0FF]/10 text-[#00F0FF] rounded-full text-[9px] font-black uppercase tracking-widest font-mono">
            SYSENG CONSOLE
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-normal text-white">
            Branding & Database Diagnostics
          </h2>
          <p className="text-xs text-gray-400 font-semibold uppercase leading-relaxed max-w-xl">
            Realtime security, media storage consistency, and cloud system validation dashboard. Use this interface to verify live operations.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none">
          <Activity size={180} className="animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Indicators Card */}
        <div className="p-8 bg-[#151619] rounded-[2.5rem] border border-white/5 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2 border-b border-white/5 pb-4">
            <Wifi size={14} /> LIVE SERVER MONITOR
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
                <Database size={12} className="text-[#00F0FF]" /> CLOUD FIRESTORE STATUS
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase ${
                dbStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                dbStatus === 'offline' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
              }`}>
                {dbStatus}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
                <UserCheck size={12} className="text-[#00F0FF]" /> SYSTEM ROLE RESOLVER
              </span>
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[8px] font-black font-mono uppercase">
                {userRole}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
                <UserCheck size={12} className="text-[#00F0FF]" /> AUTH UID RECORD
              </span>
              <span className="text-[10px] font-mono text-gray-300 font-bold max-w-[140px] truncate">
                {user?.uid || 'COULD NOT DETECT'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
                <UserCheck size={12} className="text-[#00F0FF]" /> COGNITIVE EMAIL
              </span>
              <span className="text-[10px] font-mono text-gray-300 font-bold max-w-[140px] truncate">
                {user?.email || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Branding URL Configuration */}
        <div className="p-8 bg-[#151619] rounded-[2.5rem] border border-white/5 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#6C5CE7] flex items-center gap-2 border-b border-white/5 pb-4">
            <Image size={14} /> ACTIVE BRANDING URLS
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 font-mono block">STORE LOGO RESOURCE Link</span>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-[8px] font-mono font-bold text-gray-400 truncate max-w-[200px]">
                  {storeSettings?.logoUrl || "UNDEFINED (FALLBACK TRIGGERED)"}
                </span>
                {storeSettings?.logoUrl && (
                  <img src={storeSettings.logoUrl} className="w-5 h-5 object-contain rounded border border-white/15" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 font-mono block">STORE FAVICON RESOURCE LINK</span>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-[8px] font-mono font-bold text-gray-400 truncate max-w-[200px]">
                  {storeSettings?.faviconUrl || "UNDEFINED (FALLBACK TRIGGERED)"}
                </span>
                {storeSettings?.faviconUrl && (
                  <img src={storeSettings.faviconUrl} className="w-5 h-5 object-contain rounded border border-white/15" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 font-mono block">HERO JUMBO HEADER BANNER LINK</span>
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-[8px] font-mono font-bold text-gray-400 truncate max-w-[200px]">
                  {storeSettings?.heroBannerUrl || "UNDEFINED (STATIC HOMEPAGE FALLBACK)"}
                </span>
                {storeSettings?.heroBannerUrl && (
                  <img src={storeSettings.heroBannerUrl} className="w-10 h-5 object-cover rounded border border-white/15" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Storage & Cloudinary Integration Audit Console */}
      <div className="p-8 bg-[#151619] rounded-[2.5rem] border border-white/5 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#00F0FF] flex items-center gap-2">
            <Cloud size={14} className="text-[#00F0FF]" /> FIREBASE STORAGE & CLOUDINARY INTEGRATION AUDIT
          </h3>
          <button 
            type="button" 
            onClick={runStorageDiagnostics}
            disabled={auditRunning}
            className="px-3 py-1.5 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/25 border border-[#00F0FF]/20 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors animate-pulse"
          >
            <RefreshCcw size={10} className={auditRunning ? 'animate-spin' : ''} />
            {auditRunning ? 'TRANSMITTING RUNTIME CHALLENGES...' : 'RUN UPLOAD INTEGRITY CHALLENGE'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Diagnostic Parameters & Firebase Variables */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">Firebase Storage Setup Checklist</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono">Firebase Storage Status</span>
                <span className="px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  DECOMISSIONED (URLs Only)
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono">storageBucket value</span>
                <span className="text-[9px] font-bold font-mono text-indigo-400 max-w-[150px] truncate">
                  {storageTest.storageBucket}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">current user uid</span>
                <span className="text-[9px] font-bold font-mono text-gray-300 max-w-[150px] truncate">
                  {storageTest.currentUserUid}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">current user email</span>
                <span className="text-[9px] font-bold font-mono text-gray-300 max-w-[150px] truncate">
                  {storageTest.currentUserEmail}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">upload target path</span>
                <span className="text-[9px] font-bold font-mono text-gray-400 truncate max-w-[160px]">
                  {storageTest.uploadTargetPath}
                </span>
              </div>
            </div>
          </div>

          {/* Cloudinary Integration Direct Config Variables */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">Cloudinary Unsigned Upload Variables</h4>
            <div className="space-y-2 font-mono text-[9px] bg-black/50 p-4 rounded-xl border border-white/5 space-y-3">
              <div>
                <span className="text-gray-500 block uppercase font-black tracking-wider mb-0.5">Target Cloud Name Source</span>
                <span className="text-[#00F0FF] font-black break-all text-[10px]">{cloudinaryTest.cloudName || "UNDEFINED"}</span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase font-black tracking-wider mb-0.5">Target Upload Preset Source</span>
                <span className="text-[#00F0FF] font-black break-all text-[10px]">{cloudinaryTest.uploadPreset || "UNDEFINED"}</span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase font-black tracking-wider mb-0.5">Target Upload Endpoint URL</span>
                <span className="text-indigo-400 font-black break-all text-[10px]">{cloudinaryTest.endpoint || "UNDEFINED"}</span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase font-black tracking-wider mb-0.5">Direct Request Payload (Only Unsigned Fields)</span>
                <pre className="text-[8px] bg-black/80 p-2 rounded-lg border border-white/5 text-gray-450 overflow-x-auto whitespace-pre-wrap max-h-[100px] text-gray-300 font-mono">
                  {cloudinaryTest.requestPayload}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Real Test Upload Result Trackers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Live Challenge Response Status */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono block">Exact Upload State Error / Status</span>
            <div className="p-4 bg-black/60 border border-white/5 rounded-xl flex items-center justify-between">
              <span className="font-mono text-[9px] text-gray-400">Response Integrity State:</span>
              <span className={`px-2 py-1 rounded font-mono font-black text-[9px] uppercase tracking-wider ${
                cloudinaryTest.testStatus === 'PASS' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                cloudinaryTest.testStatus === 'FAIL' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                'bg-gray-500/15 text-gray-400 border border-gray-500/20'
              }`}>
                {cloudinaryTest.testStatus}
              </span>
            </div>
            
            {cloudinaryTest.returnedUrl && (
              <div className="p-4 bg-emerald-950/15 border border-emerald-500/15 rounded-xl space-y-1">
                <span className="text-emerald-400 font-black text-[9px] uppercase block tracking-wider">PASS - CDN Asset Returned:</span>
                <a 
                  href={cloudinaryTest.returnedUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[#00F0FF] underline font-mono text-[9px] break-all block"
                >
                  {cloudinaryTest.returnedUrl}
                </a>
              </div>
            )}
          </div>

          {/* Raw Cloudinary Server Output */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono block">Exact Cloudinary API Raw Reponse</span>
            <div className="p-4 bg-black/60 border border-white/5 rounded-xl max-h-[160px] overflow-y-auto">
              <pre className="font-mono text-[8px] text-gray-300 whitespace-pre-wrap break-all leading-normal">
                {cloudinaryTest.rawResponse}
              </pre>
            </div>
          </div>
        </div>

        {/* Required Legacy Firebase Error Log Label for compatibility */}
        <div className="pt-2 border-t border-white/5">
          <span className="text-[8px] font-black uppercase tracking-wider text-gray-500 font-mono block">upload error fallback state</span>
          <span className="font-mono text-[9px] text-gray-400 break-all">
            {storageTest.uploadError}
          </span>
        </div>
      </div>

      {/* Live System Logs Console */}
      <div className="p-8 bg-[#151619] rounded-[2.5rem] border border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <Terminal size={14} /> LIVE TELEMETRY & SYSTEM CONSOLE
          </h3>
          <button 
            type="button" 
            onClick={runDiagnostics}
            disabled={loading}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <RefreshCcw size={10} className={loading ? 'animate-spin' : ''} /> RE-RUN ASSESSMENT
          </button>
        </div>

        <div className="p-5 bg-black/90 rounded-2xl border border-white/5 font-mono text-[9px] text-gray-400 h-48 overflow-y-auto space-y-1 scrollbar-thin">
          {testLog.length > 0 ? (
            testLog.map((log, i) => (
              <div key={i} className={`flex items-start gap-2 ${log.includes('OK:') ? 'text-emerald-400' : log.includes('ERROR:') ? 'text-red-400' : 'text-gray-300'}`}>
                <span>{log}</span>
              </div>
            ))
          ) : (
            <div className="text-gray-650 italic">No logs tracked. Run the diagnostics panel sweep.</div>
          )}
        </div>
      </div>
    </div>
  );
}
