
import { initializeApp, FirebaseApp, getApp, getApps, deleteApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// 1. Initial configuration provided by user
const envConfig: FirebaseConfig = {
  apiKey: "AIzaSyBuvMkjPFzNpBbGmCVp2Gi9_jUuG3o8I7I",
  authDomain: "coc-evangelism-ai-assistant.firebaseapp.com",
  projectId: "coc-evangelism-ai-assistant",
  storageBucket: "coc-evangelism-ai-assistant.firebasestorage.app",
  messagingSenderId: "195279530158",
  appId: "1:195279530158:web:413cb8f074a6f6d884253f"
};

const isValidConfig = (config: any): config is FirebaseConfig => {
  return !!(config && config.apiKey && config.apiKey.length > 10);
};

const getSavedConfig = (): FirebaseConfig | null => {
  const saved = localStorage.getItem('harvest_hub_cloud_config');
  if (!saved) return null;
  try { return JSON.parse(saved); } catch { return null; }
};

const activeConfig = getSavedConfig() || (isValidConfig(envConfig) ? envConfig : null);

export const isFirebaseConfigured = !!activeConfig?.apiKey;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let googleProvider: GoogleAuthProvider | undefined;

export const initFirebase = async (config: FirebaseConfig) => {
  try {
    if (getApps().length > 0) {
      await deleteApp(getApp());
    }
    
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    // Ensure persistence is set for long-running sessions
    await setPersistence(auth, browserLocalPersistence);
    
    localStorage.setItem('harvest_hub_cloud_config', JSON.stringify(config));
    return { auth, db, googleProvider };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return null;
  }
};

if (isFirebaseConfigured && activeConfig) {
  initFirebase(activeConfig);
}

export { app, auth, db, googleProvider };
