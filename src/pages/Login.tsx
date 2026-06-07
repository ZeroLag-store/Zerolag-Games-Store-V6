import { useEffect, useState } from 'react';
import { auth, db, OperationType, handleFirestoreError, FirebaseError } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  updateProfile, 
  signOut 
} from 'firebase/auth';
import { useAuth } from '../App';
import Logo from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck, Mail, Trophy, Loader2, User as UserIcon, Lock, KeyRound, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

type AuthMode = 'login' | 'register' | 'forgot';

export default function Login() {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingAction) return;
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setLoadingAction(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      showToast('Successfully logged in!');
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Email/Password credentials are disabled. Tap here to enable it in your Firebase console: \n\nhttps://console.firebase.google.com/project/gen-lang-client-0771735930/authentication/providers\n\nEnable "Email/Password" and save, then reload this page!');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('This account has been temporarily disabled due to many failed attempts. Reset your password or try again later.');
      } else {
        setErrorMsg(err.message || 'An error occurred during sign in.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingAction) return;
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoadingAction(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update Auth Profile
      await updateProfile(result.user, {
        displayName: fullName.trim()
      });

      // Send Verification Email
      try {
        await sendEmailVerification(result.user);
        showToast('Verification email sent!');
      } catch (verifErr) {
        console.error('Could not send verification email:', verifErr);
      }

      // Sync user doc to Firestore
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        uid: result.user.uid,
        displayName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: email.trim().toLowerCase() === 'zerolag0000@gmail.com' ? 'OWNER' : 'CUSTOMER',
        createdAt: new Date().toISOString()
      });

      showToast('Account successfully created!');
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg('Email/Password credentials are disabled. Tap here to enable it in your Firebase console: \n\nhttps://console.firebase.google.com/project/gen-lang-client-0771735930/authentication/providers\n\nEnable "Email/Password" and save, then reload this page!');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('This email address is already in use by another account.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('The email address is invalid.');
      } else {
        setErrorMsg(err.message || 'An error occurred during registration.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadingAction) return;
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please specify a valid email address.');
      return;
    }

    setLoadingAction(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast('Password reset link dispatched!');
      setMode('login');
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setErrorMsg('No user record found for this email address.');
      } else {
        setErrorMsg(err.message || 'Could not send reset link.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    showToast('Signed out successfully');
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-12 pb-24 flex items-center justify-center min-h-[70vh]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#151619] rounded-[2.5rem] border border-white/10 p-10 space-y-8 relative overflow-hidden shadow-2xl"
      >
        {/* Decorative ambient blobs */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00F0FF]/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#6C5CE7]/5 rounded-full blur-2xl"></div>

        <div className="text-center space-y-4 relative z-10">
          <Logo className="justify-center scale-90 mb-2" />
          <div className="w-16 h-16 bg-[#00F0FF] rounded-2xl flex items-center justify-center mx-auto rotate-12 transition-transform shadow-[0_0_20px_#00F0FF44]">
            <Trophy className="text-[#0B0B0F]" size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            {user ? 'YOUR CONTROLS' : mode === 'login' ? 'COMMENCE ACCESS' : mode === 'register' ? 'CREATE PROFILE' : 'RESET SECURITY'}
          </h2>
          <p className="text-gray-500 uppercase text-[9px] font-black tracking-[0.25em]">
            {user ? 'Manage your account session' : 'Zerolag Games Store Secure Entry'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-xs text-red-400 font-bold relative z-10 whitespace-pre-line">
            {errorMsg}
          </div>
        )}

        {user ? (
          <div className="space-y-6 relative z-10">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#6C5CE7] flex items-center justify-center font-bold text-lg text-black">
                {((user.email || 'G').charAt(0)).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold text-white truncate">{user.displayName || 'Gamer'}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => navigate('/profile')}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 text-white transition-all"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            {mode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="enter your email..."
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Security Password</label>
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[9px] font-black uppercase tracking-wider text-[#00F0FF] hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loadingAction}
                  className="w-full py-4 mt-2 bg-[#00F0FF] text-[#0B0B0F] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#00D0EE] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all disabled:opacity-50"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  {loadingAction ? 'Authenticating...' : 'Sign In'}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-gray-500">Don't have an account? </span>
                  <button 
                    type="button"
                    onClick={() => { setMode('register'); setErrorMsg(null); }}
                    className="text-xs font-black uppercase text-[#00F0FF] hover:underline ml-1"
                  >
                    Register
                  </button>
                </div>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-9 pr-3 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loadingAction}
                  className="w-full py-4 mt-3 bg-[#00F0FF] text-[#0B0B0F] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#00D0EE] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all disabled:opacity-50"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound size={16} />
                  )}
                  {loadingAction ? 'Processing Registration...' : 'Authorize Account'}
                </button>

                <div className="text-center pt-1">
                  <span className="text-xs text-gray-500">Already have an account? </span>
                  <button 
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(null); }}
                    className="text-xs font-black uppercase text-[#00F0FF] hover:underline ml-1"
                  >
                    Login
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handlePasswordReset} className="space-y-5">
                <p className="text-xs text-gray-400 text-center uppercase tracking-wide">
                  Specify your verified email to receive a secure recovery configuration link.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="certified.gamer@gmail.com"
                      className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-[#00F0FF] focus:border-[#00F0FF] text-white outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loadingAction}
                  className="w-full py-4 mt-2 bg-[#00F0FF] text-[#0B0B0F] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#00D0EE] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all disabled:opacity-50"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  {loadingAction ? 'Sending Dispatch Request...' : 'Dispatch Reset Email'}
                </button>

                <button 
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(null); }}
                  className="w-full py-4 border border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-all hover:bg-white/10"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </form>
            )}

            <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-500">
                <ShieldCheck size={14} className="text-[#00F0FF]" />
                <span className="text-[9px] font-black uppercase tracking-widest">Secure TLS</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Mail size={14} className="text-[#00F0FF]" />
                <span className="text-[9px] font-black uppercase tracking-widest">Self Service</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
