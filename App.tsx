
import React, { useState, useEffect } from 'react';
import { User, Prospect, UserRole, UserStatus } from './types';
import { auth as fbAuth, db as fbDb, isFirebaseConfigured as initialConfigured, initFirebase } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, getDocs, setDoc, getDoc } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import NewOutreach from './components/NewOutreach';
import ProspectList from './components/ProspectList';
import ProspectDetail from './components/ProspectDetail';
import TeamDirectory from './components/UserManagement';
import CloudSetup from './components/CloudSetup';
import UserProfile from './components/UserProfile';
import OnboardingTour from './components/OnboardingTour';

/**
 * Enhanced Scrubbing: Aggressively strips any object that isn't a plain literal 
 * and handles circular references using a WeakSet.
 */
const scrub = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Prevent circularity crash
  if (seen.has(obj)) return undefined;

  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map(item => scrub(item, seen)).filter(v => v !== undefined);
  }

  // Strict check for Plain Old JavaScript Objects (POJOs)
  // This correctly identifies and strips Leaflet (Q$1), Firebase, or DOM objects.
  const isPlain = Object.prototype.toString.call(obj) === '[object Object]' && 
                  (obj.constructor === Object || obj.constructor === undefined);
  
  if (!isPlain) return undefined;

  seen.add(obj);
  const clean: any = {};
  let hasProperties = false;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = scrub(obj[key], seen);
      if (val !== undefined) {
        clean[key] = val;
        hasProperties = true;
      }
    }
  }

  return hasProperties ? clean : {};
};

// Final defense for JSON serialization
const safeStringify = (obj: any): string => {
  try {
    return JSON.stringify(scrub(obj));
  } catch (e) {
    console.error("Critical stringify failure:", e);
    return "{}";
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'people' | 'users' | 'profile' | 'cloud'>('dashboard');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [cloudEnabled, setCloudEnabled] = useState(initialConfigured);
  const [permissionError, setPermissionError] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    let unsubAuth = () => {};
    let unsubProspects = () => {};
    let unsubUsers = () => {};

    if (cloudEnabled && fbAuth && fbDb) {
      unsubAuth = onAuthStateChanged(fbAuth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(fbDb, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              if (userData.status === UserStatus.APPROVED) {
                setUser(userData);
                if (userData.hasSeenTour === false) {
                  setShowTour(true);
                }
              }
              else { await signOut(fbAuth); setUser(null); }
            } else {
              setUser(null);
            }
          } catch (e) {
            console.error("Auth permission error", e);
            setPermissionError(true);
          }
        } else { setUser(null); }
        setLoading(false);
      });

      try {
        const q = query(collection(fbDb, 'prospects'), orderBy('timestamp', 'desc'));
        unsubProspects = onSnapshot(q, 
          (snapshot) => {
            setProspects(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Prospect)));
            setPermissionError(false);
          },
          (error) => {
            console.error("Prospects sync error:", error);
            if (error.code === 'permission-denied') setPermissionError(true);
          }
        );
        
        unsubUsers = onSnapshot(collection(fbDb, 'users'), 
          (snapshot) => {
            setRegisteredUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
            setPermissionError(false);
          },
          (error) => {
            console.error("Users sync error:", error);
            if (error.code === 'permission-denied') setPermissionError(true);
          }
        );
      } catch (err) {
        console.error("Setup listeners failed", err);
      }

    } else {
      const savedSession = localStorage.getItem('evangelism_session');
      if (savedSession) {
        try {
          const localUser = JSON.parse(savedSession);
          setUser(localUser);
          if (localUser.hasSeenTour === false) setShowTour(true);
        } catch (e) {
          localStorage.removeItem('evangelism_session');
        }
      }
      
      const localP = localStorage.getItem('evangelism_prospects');
      if (localP) {
        try { setProspects(JSON.parse(localP)); } catch (e) { localStorage.removeItem('evangelism_prospects'); }
      }
      
      const localU = localStorage.getItem('evangelism_users');
      if (localU) {
        try { setRegisteredUsers(JSON.parse(localU)); } catch (e) { localStorage.removeItem('evangelism_users'); }
      }
      
      setLoading(false);
    }

    return () => { unsubAuth(); unsubProspects(); unsubUsers(); };
  }, [cloudEnabled]);

  const handleConnectCloud = async (config: any) => {
    const result = await initFirebase(config);
    if (result) {
      setCloudEnabled(true);
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    if (cloudEnabled && fbAuth) await signOut(fbAuth);
    setUser(null);
    localStorage.removeItem('evangelism_session');
  };

  const updateUserStatus = async (userId: string, status: UserStatus, role?: UserRole, additionalUpdates?: Partial<User>) => {
    const data = scrub({ status, role, ...additionalUpdates });
    if (cloudEnabled && fbDb) {
      await updateDoc(doc(fbDb, 'users', userId), data);
    } else {
      setRegisteredUsers(prev => {
        const updated = prev.map(u => u.id === userId ? { ...u, ...data } : u);
        localStorage.setItem('evangelism_users', safeStringify(updated));
        return updated;
      });
    }
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const cleanUpdates = scrub(updates);
    const updatedUser = { ...user, ...cleanUpdates };
    
    if (cloudEnabled && fbDb) {
      await updateDoc(doc(fbDb, 'users', user.id), cleanUpdates);
    } else {
      const savedUsers = localStorage.getItem('evangelism_users');
      let users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
      users = users.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem('evangelism_users', safeStringify(users));
      localStorage.setItem('evangelism_session', safeStringify(updatedUser));
      setRegisteredUsers(users);
    }
    setUser(updatedUser);
  };

  const handleCompleteTour = () => {
    setShowTour(false);
    handleUpdateProfile({ hasSeenTour: true });
  };

  const addProspect = async (newProspect: Prospect) => {
    const data = scrub(newProspect);
    if (cloudEnabled && fbDb) {
      await setDoc(doc(fbDb, 'prospects', newProspect.id), data);
    } else {
      const p = [data, ...prospects];
      localStorage.setItem('evangelism_prospects', safeStringify(p));
      setProspects(p);
    }
    setActiveTab('people');
  };

  const updateProspect = async (updatedProspect: Prospect) => {
    const data = scrub(updatedProspect);
    if (cloudEnabled && fbDb) {
      await setDoc(doc(fbDb, 'prospects', updatedProspect.id), data);
    } else {
      const p = prospects.map(x => x.id === updatedProspect.id ? data : x);
      localStorage.setItem('evangelism_prospects', safeStringify(p));
      setProspects(p);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 text-blue-600">
      <i className="fas fa-circle-notch fa-spin text-4xl"></i>
    </div>
  );

  if (!user) return <Login 
    onLocalLogin={(u) => { 
      setUser(u); 
      localStorage.setItem('evangelism_session', safeStringify(u));
      if (u.hasSeenTour === false) setShowTour(true);
    }} 
    onGoToCloud={() => setActiveTab('cloud')}
  />;

  const renderContent = () => {
    if (selectedProspectId) {
      const p = prospects.find(x => x.id === selectedProspectId);
      return p ? <ProspectDetail prospect={p} onBack={() => setSelectedProspectId(null)} onUpdate={updateProspect} currentUser={user} allUsers={registeredUsers} /> : null;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard prospects={prospects} users={registeredUsers} onSelectProspect={setSelectedProspectId} currentUser={user} />;
      case 'new': return <NewOutreach onSave={addProspect} currentUser={user} />;
      case 'people': return <ProspectList prospects={prospects} onSelectProspect={setSelectedProspectId} />;
      case 'users': return <TeamDirectory users={registeredUsers} onUpdateStatus={updateUserStatus} currentUser={user} onGoToCloud={() => setActiveTab('cloud')} />;
      case 'cloud': return <CloudSetup onConnect={handleConnectCloud} />;
      case 'profile': return <UserProfile user={user} onUpdate={handleUpdateProfile} />;
      default: return <Dashboard prospects={prospects} users={registeredUsers} onSelectProspect={setSelectedProspectId} currentUser={user} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {showTour && <OnboardingTour onComplete={handleCompleteTour} />}
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(t) => { setActiveTab(t as any); setSelectedProspectId(null); }} 
        onLogout={handleLogout}
        user={user}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {permissionError && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3">
                <i className="fas fa-lock text-xl"></i>
                <div className="text-sm">
                  <p className="font-bold">Database Access Denied</p>
                  <p className="opacity-80">You need to update your Firestore Security Rules in the Firebase Console.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('cloud')} 
                className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs whitespace-nowrap hover:bg-orange-700 transition-colors"
              >
                View Instructions
              </button>
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
