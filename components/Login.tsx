
import React, { useState, useEffect } from 'react';
import { auth, db, isFirebaseConfigured } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceLocal, setForceLocal] = useState(!isFirebaseConfigured);

  // Parse parameters from URL (Invites and Reset Codes)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refRole = params.get('refRole');
    const refBy = params.get('refBy');
    const modeParam = params.get('mode');
    const actionCode = params.get('oobCode');

    // Handle Invitation Logic
    if (refRole) {
      setInvitedRole(refRole as UserRole);
      setMode('signup');
    }
    if (refBy) setInvitedBy(refBy);

    // Handle Firebase Auth Action Codes (Password Resets)
    if ((modeParam === 'resetPassword' || params.get('apiKey')) && actionCode) {
      setOobCode(actionCode);
      setMode('resetConfirm');
      setLoading(true);
      // Verify code and get associated email
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

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'forgotPassword') return handleForgotPassword();
    if (mode === 'resetConfirm') return handleConfirmReset();

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
              setError(userData.status === UserStatus.PENDING ? "Your account is still awaiting approval by a SuperAdmin." : "This account has been restricted.");
            }
          } else {
             // User exists in Auth but not in our custom 'users' collection
             setError("Profile not found. Please contact support.");
             await auth.signOut();
          }
        } else {
          // Signup logic
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const isFirstUser = usersSnapshot.empty;
          
          const newUser: User = {
            id: userCredential.user.uid,
            name,
            email,
            role: isFirstUser ? UserRole.SUPER_ADMIN : roleToAssign,
            status: isFirstUser ? UserStatus.APPROVED : UserStatus.PENDING,
            createdAt: new Date().toISOString(),
            hasSeenTour: false
          };
          
          await setDoc(doc(db, 'users', newUser.id), newUser);
          if (isFirstUser) {
            setSuccess("Welcome SuperAdmin! Your account is activated.");
          } else { 
            setSuccess("Registration complete. Your account is now awaiting Admin approval."); 
            setMode('login'); 
          }
        }
      } catch (err: any) {
        setError(err.message || "An authentication error occurred.");
      } finally { setLoading(false); }
    } else {
      // Local implementation simulation
      setTimeout(() => {
        setLoading(false);
        setError("Firebase not configured for this domain. Local testing not supported for full auth flows.");
      }, 800);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Please enter your email address."); setLoading(false); return; }
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email);
        setSuccess("A password reset link has been dispatched to your email address.");
        setError(null);
      } else { throw new Error("Firebase Auth not initialized."); }
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
        setSuccess("Your password has been successfully updated! You can now sign in.");
        setError(null);
        setMode('login');
      } else { throw new Error("Verification code missing or invalid."); }
    } catch (err: any) { 
      setError(err.message || "Failed to update password. Link might be expired."); 
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 animate-in fade-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg transition-transform hover:scale-105">
            <i className={`fas ${mode === 'forgotPassword' || mode === 'resetConfirm' ? 'fa-key' : 'fa-cross'}`}></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {mode === 'resetConfirm' ? 'Set New Password' : (mode === 'forgotPassword' ? 'Reset Password' : 'HarvestHub')}
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseConfigured ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            {mode === 'resetConfirm' ? `Secure Reset for ${email}` : (isFirebaseConfigured ? 'Secure Cloud Access' : 'Local Sandbox Mode')}
          </p>
        </div>

        {invitedBy && mode === 'signup' && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"><i className="fas fa-user-plus"></i></div>
            <div className="text-xs">
              <p className="font-bold text-blue-900 leading-none">Invitation from {invitedBy}</p>
              <p className="text-blue-700 mt-1">Joining our team as a <span className="font-bold px-1.5 py-0.5 bg-blue-100 rounded text-blue-800">{invitedRole}</span></p>
            </div>
          </div>
        )}

        {(error || success) && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2 border ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
            <i className={`fas ${error ? 'fa-exclamation-circle text-lg' : 'fa-check-circle text-lg'}`}></i>
            <p className="flex-1">{error || success}</p>
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{mode === 'resetConfirm' ? "New Secure Password" : "Password"}</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              {mode === 'resetConfirm' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
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

        <div className="text-center pt-4 flex flex-col gap-4">
          {mode === 'login' ? (
            <div className="space-y-4">
              <button onClick={() => setMode('signup')} className="text-sm text-blue-600 font-bold hover:underline">New laborer? Create Account</button>
              <div className="pt-2">
                <button onClick={() => setMode('forgotPassword')} className="text-[10px] text-gray-400 font-bold hover:text-blue-600 uppercase tracking-tighter">
                  Trouble signing in? Reset Password
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
              <i className="fas fa-cog"></i> Update Cloud Service Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
