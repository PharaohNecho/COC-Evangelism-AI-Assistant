
import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { generateInviteDraft } from '../services/geminiService';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, limit, orderBy, query } from 'firebase/firestore';
import emailjs from 'emailjs-com';

interface InviteModalProps {
  onClose: () => void;
  currentUser: User;
  onNavigateToSettings?: () => void;
}

interface InvitationRecord {
  id: string;
  email: string;
  role: UserRole;
  status: 'Sent' | 'Accepted';
  sentAt: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ onClose, currentUser, onNavigateToSettings }) => {
  const [tab, setTab] = useState<'link' | 'email'>('link');
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  
  // Email states
  const [emails, setEmails] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStep, setSendStep] = useState('');
  const [aiDraft, setAiDraft] = useState<{ subject: string, body: string } | null>(null);
  const [sentHistory, setSentHistory] = useState<InvitationRecord[]>([]);
  const [emailConfigReady, setEmailConfigReady] = useState(false);

  // Load config on mount
  useEffect(() => {
    const checkConfig = () => {
      const configStr = localStorage.getItem('harvest_hub_email_config');
      if (configStr) {
        try {
          const config = JSON.parse(configStr);
          if (config.serviceId && config.templateId && config.publicKey) {
            setEmailConfigReady(true);
          }
        } catch (e) { console.error("Config check failed", e); }
      }
    };
    
    checkConfig();

    if (!db) return;
    const q = query(collection(db, 'invitations'), orderBy('sentAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      setSentHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvitationRecord)));
    });
    return () => unsub();
  }, []);

  // Environment-aware URL generation
  const generateInviteUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = new URL(baseUrl);
    url.searchParams.set('refRole', selectedRole);
    url.searchParams.set('refBy', currentUser.name);
    url.searchParams.set('token', crypto.randomUUID().slice(0, 8));
    return url.toString();
  };

  const inviteUrl = generateInviteUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendRealEmail = async (email: string, draft: { subject: string, body: string }) => {
    const configStr = localStorage.getItem('harvest_hub_email_config');
    if (!configStr) return false;
    const config = JSON.parse(configStr);

    try {
      const templateParams = {
        to_email: email,
        from_name: "HarvestHub Mail Service",
        inviter_name: currentUser.name,
        subject: draft.subject,
        message: draft.body,
        invite_link: inviteUrl,
        target_role: selectedRole
      };

      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      return true;
    } catch (err) {
      console.error("EmailJS Error:", err);
      return false;
    }
  };

  const handleSendEmails = async () => {
    if (!emailConfigReady) {
      alert("Email configuration is missing. Please complete the setup in the Settings panel.");
      return;
    }

    const emailList = emails.split(',').map(e => e.trim()).filter(e => e.includes('@'));
    if (emailList.length === 0) return alert("Please enter at least one valid email address.");

    setIsSending(true);
    setSendStep("Connecting to HarvestHub Dispatcher...");
    
    try {
      const draft = await generateInviteDraft(currentUser.name, selectedRole, customNotes);
      setAiDraft(draft);

      let successCount = 0;
      for (const email of emailList) {
        setSendStep(`Relaying invitation to ${email}...`);
        const sent = await sendRealEmail(email, draft);
        
        if (sent) {
          successCount++;
          const inviteData = {
            email,
            role: selectedRole,
            invitedBy: currentUser.name,
            sentAt: new Date().toISOString(),
            status: 'Sent'
          };
          if (db) await addDoc(collection(db, 'invitations'), inviteData);
        }
      }

      if (successCount > 0) {
        alert(`Success! ${successCount} invitations were dispatched.`);
        onClose();
      } else {
        alert("Failed to send invitations. Please check your IDs in settings.");
      }
    } catch (err) {
      console.error("Invite send failed", err);
      alert("An unexpected error occurred during dispatch.");
    } finally {
      setIsSending(false);
      setAiDraft(null);
    }
  };

  const availableRoles = currentUser.role === UserRole.SUPER_ADMIN 
    ? [UserRole.TEAM_MEMBER, UserRole.ADMIN, UserRole.SUPER_ADMIN]
    : [UserRole.TEAM_MEMBER];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 p-6 text-center relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-6 text-white/50 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-2">
            <i className="fas fa-paper-plane"></i>
          </div>
          <h2 className="text-xl font-bold text-white">Invitation Center</h2>
          
          <div className="flex justify-center mt-4">
            <div className="bg-white/10 p-1 rounded-xl flex gap-1">
              <button 
                onClick={() => setTab('link')} 
                className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                Copy Link
              </button>
              <button 
                onClick={() => setTab('email')} 
                className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
              >
                Direct Send (Email)
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {isSending ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                  <i className="fas fa-envelope-open-text text-xl"></i>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">Dispatching Invitation...</p>
                <p className="text-sm text-gray-500 font-medium italic animate-pulse mt-1">{sendStep}</p>
              </div>
            </div>
          ) : (
            <>
              {tab === 'link' ? (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign User Role</label>
                    <select 
                      value={selectedRole} 
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unique Smart Invite Link</label>
                    <div className="flex items-center gap-2 p-1 pl-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                      <code className="flex-1 text-[10px] text-blue-700 truncate font-mono">{inviteUrl}</code>
                      <button 
                        onClick={handleCopy} 
                        className={`px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {!emailConfigReady && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-4">
                      <i className="fas fa-exclamation-triangle text-orange-500 mt-1 text-lg"></i>
                      <div className="text-xs flex-1">
                        <p className="font-bold text-orange-800">Email Service Not Ready</p>
                        <p className="text-orange-700 leading-relaxed mt-1 mb-3">
                          You haven't configured your EmailJS keys yet. Direct site invitations are currently disabled.
                        </p>
                        <button 
                          onClick={onNavigateToSettings}
                          className="px-4 py-1.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors"
                        >
                          Configure Now
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recipient Email Addresses</label>
                      <textarea 
                        value={emails} 
                        onChange={(e) => setEmails(e.target.value)} 
                        disabled={!emailConfigReady}
                        placeholder="pastor@church.com, laborer@mission.org" 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] disabled:opacity-50" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Role</label>
                        <select 
                          value={selectedRole} 
                          onChange={(e) => setSelectedRole(e.target.value as UserRole)} 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                        >
                          {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal Greeting</label>
                        <input 
                          type="text" 
                          value={customNotes} 
                          onChange={(e) => setCustomNotes(e.target.value)} 
                          placeholder="e.g. Join our local outreach!" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
             <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold italic">
                  <i className="fas fa-shield-alt text-green-500"></i>
                  HarvestHub Secure Relay
                </div>
             </div>
             <div className="flex gap-2">
               <button onClick={onClose} className="px-6 py-3 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs hover:bg-gray-100">Cancel</button>
               {tab === 'email' && !isSending && (
                 <button 
                  onClick={handleSendEmails} 
                  disabled={!emailConfigReady}
                  className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                 >
                   <i className="fas fa-paper-plane"></i>
                   Dispatch Now
                 </button>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
