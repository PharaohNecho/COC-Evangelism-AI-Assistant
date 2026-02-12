
import React, { useState } from 'react';

interface CloudSetupProps {
  onConnect: (config: any) => Promise<void>;
}

const CloudSetup: React.FC<CloudSetupProps> = ({ onConnect }) => {
  const [configText, setConfigText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedRule, setCopiedRule] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  
  // Resilient extraction for deep-nested iframes
  const getDomain = () => {
    try {
      const origin = window.location.origin;
      if (origin && origin !== 'null') {
        const url = new URL(origin);
        return url.hostname;
      }
      return window.location.hostname || "unknown-domain";
    } catch (e) {
      return "detecting...";
    }
  };

  const currentDomain = getDomain();

  const copyToClipboard = async (text: string, type: 'rule' | 'domain') => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        window.prompt(`Copy ${type}:`, text);
      }
      
      if (type === 'rule') {
        setCopiedRule(true);
        setTimeout(() => setCopiedRule(false), 2000);
      } else {
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2000);
      }
    } catch (err) {
      window.prompt(`Manual copy required:`, text);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      if (!configText.trim()) {
        throw new Error("Please paste your configuration code first.");
      }

      const fields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const extractedConfig: any = {};
      
      fields.forEach(field => {
        const regex = new RegExp(`${field}\\s*[:=]\\s*["']([^"']+)["']`);
        const match = configText.match(regex);
        if (match && match[1]) {
          extractedConfig[field] = match[1];
        }
      });

      const missing = [];
      if (!extractedConfig.apiKey) missing.push('apiKey');
      if (!extractedConfig.projectId) missing.push('projectId');
      if (!extractedConfig.appId) missing.push('appId');

      if (missing.length > 0) {
        throw new Error(`Missing fields: ${missing.join(', ')}. Please copy the entire snippet.`);
      }

      await onConnect(extractedConfig);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Invalid configuration format.");
      setIsConnecting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl shadow-green-100 animate-bounce">
          <i className="fas fa-check"></i>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Cloud Connected!</h2>
        <p className="text-gray-500">Your configuration was saved. The app will now reload to synchronize with the cloud.</p>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-blue-100">
          <i className="fas fa-cloud-upload-alt"></i>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Cloud Configuration</h1>
        <p className="text-gray-500 mt-2">Finish these 3 steps to enable team syncing.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-10">
        {/* Step 1: Config */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">1</span>
            <h3 className="font-bold text-gray-800">Connect API Keys</h3>
          </div>
          <div className="ml-11 space-y-3">
            <textarea 
              value={configText}
              disabled={isConnecting}
              onChange={(e) => setConfigText(e.target.value)}
              className={`w-full h-32 p-4 font-mono text-[10px] bg-gray-50 border ${error ? 'border-red-300' : 'border-gray-200'} rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              placeholder={`const firebaseConfig = { ... };`}
            />
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
            <button 
              onClick={handleVerify}
              disabled={isConnecting}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isConnecting ? (
                <><i className="fas fa-spinner fa-spin"></i> Connecting...</>
              ) : "Verify & Save Config"}
            </button>
          </div>
        </section>

        {/* Step 2: Rules */}
        <section className="space-y-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">2</span>
            <h3 className="font-bold text-gray-800">Setup Database Rules</h3>
          </div>
          <div className="ml-11 space-y-4">
            <p className="text-xs text-gray-600">
              Paste this in <strong>Firestore Database ➔ Rules</strong>:
            </p>
            <div className="relative group">
              <pre className="p-4 bg-gray-900 text-green-400 rounded-xl text-[10px] overflow-x-auto font-mono">
                {firestoreRules}
              </pre>
              <button 
                onClick={() => copyToClipboard(firestoreRules, 'rule')} 
                className={`absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${copiedRule ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                <i className={`fas ${copiedRule ? 'fa-check' : 'fa-copy'}`}></i>
                {copiedRule ? 'Copied!' : 'Copy Rules'}
              </button>
            </div>
          </div>
        </section>

        {/* Step 3: Authorization */}
        <section className="space-y-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <h3 className="font-bold text-gray-800">Authorize Domain</h3>
          </div>
          <div className="ml-11 space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Whitelisting prevents <strong>"unauthorized-domain"</strong> errors. Add this hostname to Firebase Auth settings:
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
              <code className="flex-1 bg-white px-4 py-2 rounded-lg border border-gray-200 text-xs font-mono text-gray-700 break-all select-all leading-relaxed">
                {currentDomain}
              </code>
              <button 
                onClick={() => copyToClipboard(currentDomain, 'domain')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${copiedDomain ? 'bg-green-500 text-white' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'}`}
              >
                <i className={`fas ${copiedDomain ? 'fa-check' : 'fa-copy'}`}></i>
                {copiedDomain ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 italic">
              <i className="fas fa-info-circle mr-1"></i>
              This is the specific internal hostname required for the app's current sandbox environment.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CloudSetup;
