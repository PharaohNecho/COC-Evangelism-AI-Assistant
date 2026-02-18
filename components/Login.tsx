
import React, { useState, useEffect } from 'react';
import { auth, db, isFirebaseConfigured, googleProvider } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { User, UserRole, UserStatus } from '../types';

interface LoginProps {
  onLocalLogin?: (user: User) => void;
  onGoToCloud?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLocalLogin, onGoToCloud }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgotPassword' | 'resetConfirm'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [oobCode, setOobCode] = useState<string | null>(null);

  const [invitedRole, setInvitedRole] = useState<UserRole | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isDomainError, setIsDomainError] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState('');
  
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceLocal, setForceLocal] = useState(!isFirebaseConfigured);

  useEffect(() => {
    setDetectedDomain(window.location.hostname);

    const params = new URLSearchParams(window.location.search);
    const refRole = params.get('refRole');
    const refBy = params.get('refBy');
    const modeParam = params.get('mode');
    const actionCode = params.get('oobCode');

    if (refRole) {
      setInvitedRole(refRole as UserRole);
      setMode('signup');
    }
    if (refBy) setInvitedBy(refBy);

    if ((modeParam === 'resetPassword' || params.get('apiKey')) && actionCode) {
      setOobCode(actionCode);
      setMode('resetConfirm');
      setLoading(true);
      if (auth) {
        verifyPasswordResetCode(auth, actionCode)
          .then(email => {
            setEmail(email);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Verification failed", err);
            setError("The password reset link is invalid or has already been used.");
            setLoading(false);
          });
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured || !auth || !db || !googleProvider) {
      setError("Cloud services are not fully configured. Please check settings.");
      return;
    }

    setError(null);
    setIsDomainError(false);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.status !== UserStatus.APPROVED) {
          await auth.signOut();
          setError(userData.status === UserStatus.PENDING 
            ? "Your account is awaiting approval by a SuperAdmin." 
            : "This account has been restricted.");
        }
      } else {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const isFirstUser = usersSnapshot.empty;
        
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Anonymous Laborer',
          email: firebaseUser.email || '',
          role: isFirstUser ? UserRole.SUPER_ADMIN : (invitedRole || UserRole.TEAM_MEMBER),
          status: isFirstUser ? UserStatus.APPROVED : UserStatus.PENDING,
          createdAt: new Date().toISOString(),
          photoUrl: firebaseUser.photoURL || undefined,
          hasSeenTour: false
        };

        await setDoc(userDocRef, newUser);
        
        if (!isFirstUser) {
          await auth.signOut();
          setSuccess("Profile created! Your account is now awaiting Admin approval.");
          setMode('login');
        }
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setIsDomainError(true);
        // Clean extraction of domain from Firebase error message string if possible
        const domainMatch = err.message.match(/\(([^)]+)\)/);
        setDetectedDomain(domainMatch ? domainMatch[1] : window.location.hostname);
        setError("Domain Not Authorized in Firebase");
      } else {
        setError(err.message || "An error occurred during Google Sign-in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsDomainError(false);
    setSuccess(null);
    setLoading(true);

    if (mode === 'forgotPassword') return handleForgotPassword();
    if (mode === 'resetConfirm') return handleConfirmReset();

    if (isFirebaseConfigured && auth && db && !forceLocal) {
      try {
        if (mode === 'login') {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.status !== UserStatus.APPROVED) {
              await auth.signOut();
              setError(userData.status === UserStatus.PENDING ? "Your account is still awaiting approval." : "This account has been restricted.");
            }
          } else {
             setError("Profile not found. Please contact support.");
             await auth.signOut();
          }
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const isFirstUser = usersSnapshot.empty;
          
          const newUser: User = {
            id: userCredential.user.uid,
            name,
            email,
            role: isFirstUser ? UserRole.SUPER_ADMIN : (invitedRole || UserRole.TEAM_MEMBER),
            status: isFirstUser ? UserStatus.APPROVED : UserStatus.PENDING,
            createdAt: new Date().toISOString(),
            hasSeenTour: false
          };
          
          await setDoc(doc(db, 'users', newUser.id), newUser);
          if (isFirstUser) {
            setSuccess("Welcome SuperAdmin! Your account is activated.");
          } else { 
            setSuccess("Profile created. Awaiting Admin approval."); 
            setMode('login'); 
          }
        }
      } catch (err: any) {
        setError(err.message || "An authentication error occurred.");
      } finally { setLoading(false); }
    } else {
      setLoading(false);
      setError("Cloud configuration required for email auth.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Please enter your email."); setLoading(false); return; }
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
        setSuccess("A password reset link has been dispatched.");
        setError(null);
      }
    } catch (err: any) { 
      setError(err.message || "Failed to send reset email."); 
    } finally { setLoading(false); }
  };

  const handleConfirmReset = async () => {
    if (password !== confirmPass) { setError("Passwords do not match."); setLoading(false); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
    
    try {
      if (auth && oobCode) {
        await confirmPasswordReset(auth, oobCode, password);
        setSuccess("Password updated! Please sign in.");
        setError(null);
        setMode('login');
      }
    } catch (err: any) { 
      setError(err.message || "Failed to update password."); 
    } finally { setLoading(false); }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(detectedDomain);
    alert("Hostname copied: " + detectedDomain);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 animate-in fade-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg transition-transform hover:scale-105">
            <i className={`fas ${mode === 'forgotPassword' || mode === 'resetConfirm' ? 'fa-key' : 'fa-cross'}`}></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {mode === 'resetConfirm' ? 'Set New Password' : (mode === 'forgotPassword' ? 'Reset Password' : 'HarvestHub')}
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseConfigured ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            {isFirebaseConfigured ? 'Secure Cloud Access' : 'Local Mode Only'}
          </p>
        </div>

        {(error || success) && (
          <div className={`p-4 rounded-xl text-xs font-bold flex flex-col gap-3 animate-in slide-in-from-top-2 border ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
            <div className="flex items-center gap-3">
              <i className={`fas ${error ? 'fa-shield-exclamation text-lg' : 'fa-check-circle text-lg'}`}></i>
              <p className="flex-1 leading-relaxed">{error || success}</p>
            </div>
            
            {isDomainError && (
              <div className="mt-2 p-5 bg-white rounded-3xl border border-red-200 shadow-xl space-y-4 border-l-4 border-l-red-600">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-black uppercase tracking-tighter flex items-center gap-2 text-[11px]">
                    <i className="fas fa-tools"></i>
                    Domain Repair Guide
                  </span>
                  <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Fix Required</span>
                </div>
                
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                  Google prohibits login from untrusted domains. To fix this, you must add your site's hostname to your Firebase Console settings.
                </p>

                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] text-gray-400 font-black uppercase mb-1">Copy this exact string:</p>
                      <code className="text-[11px] font-mono font-bold text-gray-900 truncate block">{detectedDomain}</code>
                    </div>
                    <button 
                      onClick={copyDomain}
                      className="ml-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-700 shadow-sm active:scale-95 transition-all"
                    >
                      Copy Host
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-3 text-[10px] text-gray-600 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">1</span>
                      <p>Open <strong>Firebase Console</strong> > <strong>Authentication</strong> > <strong>Settings</strong></p>
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-600 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">2</span>
                      <p>Click <strong>Authorized Domains</strong></p>
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-600 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">3</span>
                      <p>Click <strong>Add Domain</strong> and paste the host you copied.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                   <a 
                    href="https://console.firebase.google.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
                   >
                     Go to Firebase Console
                     <i className="fas fa-external-link-alt text-[8px]"></i>
                   </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {(mode === 'login' || mode === 'signup') && (
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/02/20/google_g.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="relative flex items-center justify-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Or email access</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>
          )}

          <form onSubmit={handleAction} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Full Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bro. John Smith" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            )}
            
            {(mode === 'login' || mode === 'signup' || mode === 'forgotPassword') && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="pastor@church.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            )}

            {mode !== 'forgotPassword' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                {mode === 'resetConfirm' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                    <input required type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                )}
              </div>
            )}
            
            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95">
              {loading ? <i className="fas fa-spinner fa-spin"></i> : (
                mode === 'login' ? 'Sign In' : (mode === 'signup' ? 'Register Account' : 'Confirm Action')
              )}
            </button>
          </form>
        </div>

        <div className="text-center pt-4 flex flex-col gap-4">
          {mode === 'login' ? (
            <div className="space-y-4">
              <button onClick={() => setMode('signup')} className="text-sm text-blue-600 font-bold hover:underline">New laborer? Create Account</button>
              <div className="pt-2">
                <button onClick={() => setMode('forgotPassword')} className="text-[10px] text-gray-400 font-bold hover:text-blue-600 uppercase tracking-tighter">
                  Forgot Password?
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="text-sm text-blue-600 font-bold hover:underline flex items-center justify-center gap-2">
              <i className="fas fa-arrow-left text-[10px]"></i>
              Back to Login
            </button>
          )}

          <div className="pt-4 border-t border-gray-50">
            <button onClick={onGoToCloud} className="text-[10px] text-gray-400 font-bold hover:text-gray-600 flex items-center justify-center gap-2 uppercase tracking-widest">
              <i className="fas fa-cog"></i> Advanced Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
