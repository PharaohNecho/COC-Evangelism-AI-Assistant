
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { User, UserRole, UserStatus } from '../types';

interface LoginProps {
  onLocalLogin?: (user: User) => void;
  onGoToCloud?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLocalLogin, onGoToCloud }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [invitedRole, setInvitedRole] = useState<UserRole | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [forceLocal, setForceLocal] = useState(!isFirebaseConfigured);
  const [copied, setCopied] = useState(false);

  // Parse referral parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refRole = params.get('refRole');
    const refBy = params.get('refBy');
    if (refRole) {
      setInvitedRole(refRole as UserRole);
      setMode('signup');
    }
    if (refBy) setInvitedBy(refBy);
  }, []);

  const getDomain = () => {
    try {
      const origin = window.location.origin;
      if (origin && origin !== 'null') {
        const url = new URL(origin);
        return url.hostname;
      }
      return window.location.hostname || "unknown-origin";
    } catch (e) {
      return "detecting...";
    }
  };

  const currentDomain = getDomain();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const roleToAssign = invitedRole || UserRole.TEAM_MEMBER;

    if (isFirebaseConfigured && auth && db && !forceLocal) {
      try {
        if (mode === 'login') {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.status !== UserStatus.APPROVED) {
              await auth.signOut();
              setError(userData.status === UserStatus.PENDING ? "Account awaiting approval." : "Access restricted.");
            }
          }
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const isFirstUser = usersSnapshot.empty;
          
          const newUser: User = {
            id: userCredential.user.uid,
            name,
            email,
            role: isFirstUser ? UserRole.SUPER_ADMIN : roleToAssign,
            status: isFirstUser ? UserStatus.APPROVED : UserStatus.PENDING,
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'users', newUser.id), newUser);
          if (isFirstUser) setSuccess("SuperAdmin access granted!");
          else { setSuccess("Awaiting admin approval."); setMode('login'); }
        }
      } catch (err: any) {
        console.error("Auth Error:", err.code, err.message);
        if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
          setError("This domain is not authorized in Firebase.");
          setShowTroubleshooter(true);
        } else if (err.code === 'auth/operation-not-allowed') {
          setError("Email/Password provider is not enabled in Firebase console.");
        } else if (err.code === 'auth/network-request-failed') {
          setError("Network error. Check your API key or internet connection.");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Local Mode Logic
      setTimeout(() => {
        const savedUsers = localStorage.getItem('evangelism_users');
        let users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
        if (mode === 'login') {
          const found = users.find(u => u.email === email);
          if (found && found.status === UserStatus.APPROVED) onLocalLogin?.(found);
          else if (found && found.status === UserStatus.PENDING) setError("Account pending approval.");
          else setError("User not found locally. Please Register.");
        } else {
          const isFirst = users.length === 0;
          const newUser: User = {
            id: crypto.randomUUID(),
            name,
            email,
            role: isFirst ? UserRole.SUPER_ADMIN : roleToAssign,
            status: isFirst ? UserStatus.APPROVED : UserStatus.PENDING,
            createdAt: new Date().toISOString()
          };
          users.push(newUser);
          localStorage.setItem('evangelism_users', JSON.stringify(users));
          if (isFirst) {
            onLocalLogin?.(newUser);
          } else {
            setSuccess("Registration complete. Awaiting SuperAdmin approval.");
            setMode('login');
          }
        }
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg">
            <i className="fas fa-cross"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">HarvestHub</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFirebaseConfigured && !forceLocal ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {isFirebaseConfigured && !forceLocal ? 'Cloud Mode' : 'Local Mode'}
            </p>
          </div>
        </div>

        {invitedBy && mode === 'signup' && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-500">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="text-xs">
              <p className="font-bold text-blue-900">Invitation from {invitedBy}</p>
              <p className="text-blue-700">Requesting <span className="font-bold">{invitedRole}</span> access.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 space-y-3">
            <p className="font-bold flex items-center gap-2 text-sm">
              <i className="fas fa-exclamation-circle"></i> Connection Issue
            </p>
            <p>{error}</p>
          </div>
        )}

        {showTroubleshooter && (
          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-3xl space-y-6 animate-in zoom-in duration-300">
            <div className="flex items-center gap-3 text-blue-800">
              <i className="fas fa-shield-alt text-2xl"></i>
              <h3 className="font-bold text-lg">Firebase Checklist</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">1. Add Authorized Domain</p>
                <div className="bg-white p-3 rounded-xl border border-blue-200 font-mono text-[10px] break-all leading-relaxed font-bold text-blue-950 shadow-inner">
                  {currentDomain}
                </div>
                <button 
                  onClick={handleCopy}
                  className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                  {copied ? 'Copied' : 'Copy Hostname'}
                </button>
              </div>
            </div>

            <button 
              onClick={() => { setShowTroubleshooter(false); setError(null); }}
              className="w-full text-xs text-blue-800 font-bold hover:underline"
            >
              I've done this, try again
            </button>
          </div>
        )}
        
        {success && <div className="p-4 bg-green-50 text-green-700 text-xs rounded-lg border border-green-100">{success}</div>}

        <form onSubmit={handleAction} className="space-y-4">
          {mode === 'signup' && (
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          )}
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 disabled:opacity-50 transition-all active:scale-95">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : (mode === 'login' ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div className="text-center pt-4 flex flex-col gap-2">
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-sm text-blue-600 font-bold hover:underline">
            {mode === 'login' ? "New team member? Register" : "Already registered? Login"}
          </button>
          <button onClick={onGoToCloud} className="text-xs text-gray-400 font-medium hover:text-gray-600 transition-all">
            Update Cloud Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
