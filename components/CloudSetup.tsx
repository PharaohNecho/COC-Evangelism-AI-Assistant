
import React, { useState, useEffect } from 'react';
import emailjs from 'emailjs-com';

interface CloudSetupProps {
  onConnect: (config: any) => Promise<void>;
}

const CloudSetup: React.FC<CloudSetupProps> = ({ onConnect }) => {
  const [activeTab, setActiveTab] = useState<'firebase' | 'email'>('firebase');
  const [configText, setConfigText] = useState('');
  const [emailConfig, setEmailConfig] = useState({
    serviceId: '',
    templateId: '',
    publicKey: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEmailSaved, setIsEmailSaved] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('harvest_hub_email_config');
    if (savedEmail) {
      try {
        const parsed = JSON.parse(savedEmail);
        setEmailConfig(parsed);
        if (parsed.serviceId && parsed.templateId && parsed.publicKey) {
          setIsEmailSaved(true);
        }
      } catch (e) { console.error("Failed to load email config", e); }
    }
  }, []);

  const getDomain = () => {
    try {
      const origin = window.location.origin;
      return (origin && origin !== 'null') ? new URL(origin).hostname : (window.location.hostname || "localhost");
    } catch (e) { return "detecting..."; }
  };

  const currentDomain = getDomain();

  const handleSaveEmailConfig = () => {
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      alert("Please fill in all EmailJS fields to enable direct site invitations.");
      return;
    }
    localStorage.setItem('harvest_hub_email_config', JSON.stringify(emailConfig));
    setIsEmailSaved(true);
    alert("Email service configuration saved locally! You can now use the Test button or go to the Invitation Center.");
  };

  const handleTestEmail = async () => {
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      alert("Save your configuration first before testing.");
      return;
    }
    setIsTestingEmail(true);
    try {
      // Send a test payload to the service
      const templateParams = {
        to_email: "test@example.com",
        from_name: "HarvestHub Configuration Tool",
        inviter_name: "Admin Tester",
        subject: "Verification: HarvestHub Email Link Working",
        message: "This is a test email sent from the HarvestHub Settings panel. If you see this in your EmailJS history, your integration is correct!",
        invite_link: window.location.origin,
        target_role: "Tester"
      };

      const result = await emailjs.send(
        emailConfig.serviceId, 
        emailConfig.templateId, 
        templateParams, 
        emailConfig.publicKey
      );

      if (result.status === 200) {
        alert("Success! The email service responded correctly (Status 200). Your credentials are valid.");
      } else {
        throw new Error(`Service responded with status: ${result.status}`);
      }
    } catch (err: any) {
      console.error("Test Failed:", err);
      const msg = err.text || err.message || "Unknown error occurred.";
      alert(`Connection Failed: ${msg}\n\nTips:\n1. Ensure Public Key (User ID) is correct.\n2. Ensure Template ID and Service ID match exactly.\n3. Check your EmailJS dashboard for errors.`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleVerifyFirebase = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      if (!configText.trim()) throw new Error("Please paste your configuration code first.");
      const fields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const extractedConfig: any = {};
      fields.forEach(field => {
        const regex = new RegExp(`${field}\\s*[:=]\\s*["']([^"']+)["']`);
        const match = configText.match(regex);
        if (match && match[1]) extractedConfig[field] = match[1];
      });
      if (!extractedConfig.apiKey || !extractedConfig.projectId || !extractedConfig.appId) throw new Error("Missing critical Firebase fields. Please copy the entire config object.");
      await onConnect(extractedConfig);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
      setIsConnecting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl shadow-green-100 animate-bounce">
          <i className="fas fa-check"></i>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Cloud Connected!</h2>
        <p className="text-gray-500">Your configuration was saved. The app will now synchronize with the cloud database.</p>
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 pb-20 animate-in fade-in duration-500">
      <header className="text-center">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">
          <i className="fas fa-server"></i>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Cloud Infrastructure</h1>
        <p className="text-gray-500 mt-2">Connect your data and communication services.</p>
      </header>

      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
          <button 
            onClick={() => setActiveTab('firebase')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'firebase' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Firebase Keys
          </button>
          <button 
            onClick={() => setActiveTab('email')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Email Service (Direct Invitations)
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative">
        {activeTab === 'firebase' ? (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">1</span>
                <h3 className="font-bold text-gray-800">Authentication Keys</h3>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">Paste your Web SDK configuration from the Firebase Console (Settings &gt; Your Apps &gt; SDK Setup and configuration).</p>
                <textarea 
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                  className="w-full h-32 p-4 font-mono text-[10px] bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner"
                  placeholder="const firebaseConfig = { apiKey: '...', ... };"
                />
                {error && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 animate-in slide-in-from-top-2">{error}</div>}
                <button 
                  onClick={handleVerifyFirebase}
                  disabled={isConnecting}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isConnecting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-cloud-upload-alt"></i> Save & Connect</>}
                </button>
              </div>
            </section>
            
            <section className="pt-6 border-t border-gray-50">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">2</span>
                <h3 className="font-bold text-gray-800">Authorized Redirect Domain</h3>
              </div>
              <div className="ml-11 space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Important: For password resets and invitations to work, add this domain to your <strong>Authorized Domains</strong> list in the Firebase Console (Authentication &gt; Settings &gt; Authorized Domains).
                </p>
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl group transition-all hover:border-blue-300 hover:bg-blue-50">
                  <code className="text-[10px] font-mono font-bold text-blue-800 flex-1 truncate">{currentDomain}</code>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(currentDomain); setCopiedDomain(true); setTimeout(() => setCopiedDomain(false), 2000); }}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${copiedDomain ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {copiedDomain ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                <i className="fas fa-envelope-open-text"></i>
              </div>
              <div className="text-xs text-blue-800 leading-relaxed">
                <p className="font-bold mb-1">Direct Invitations via EmailJS</p>
                <p>
                  1. Get IDs from <a href="https://www.emailjs.com" target="_blank" className="font-bold underline text-blue-600">emailjs.com</a><br/>
                  2. Paste them below and click <strong>Activate</strong>.<br/>
                  3. Use <strong>Test Connection</strong> to verify before inviting others.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Service ID</label>
                  <input 
                    type="text"
                    value={emailConfig.serviceId}
                    onChange={e => { setEmailConfig({...emailConfig, serviceId: e.target.value}); setIsEmailSaved(false); }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="service_xxxx"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Template ID</label>
                  <input 
                    type="text"
                    value={emailConfig.templateId}
                    onChange={e => { setEmailConfig({...emailConfig, templateId: e.target.value}); setIsEmailSaved(false); }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="template_xxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Public Key (User ID)</label>
                <input 
                  type="text"
                  value={emailConfig.publicKey}
                  onChange={e => { setEmailConfig({...emailConfig, publicKey: e.target.value}); setIsEmailSaved(false); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="sLc8NSMZELG6v-QMi"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSaveEmailConfig}
                  className={`w-full py-4 font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isEmailSaved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <i className={`fas ${isEmailSaved ? 'fa-check-circle' : 'fa-paper-plane'}`}></i>
                  {isEmailSaved ? 'Service Active' : 'Activate Site Email Service'}
                </button>

                {isEmailSaved && (
                  <button 
                    onClick={handleTestEmail}
                    disabled={isTestingEmail}
                    className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 text-xs"
                  >
                    {isTestingEmail ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-vial"></i>}
                    Test Connection (Send Sample Email)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudSetup;
