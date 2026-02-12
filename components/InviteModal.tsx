
import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';

interface InviteModalProps {
  onClose: () => void;
  currentUser: User;
}

const InviteModal: React.FC<InviteModalProps> = ({ onClose, currentUser }) => {
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TEAM_MEMBER);
  const [manualUrl, setManualUrl] = useState('');
  const [isBlob, setIsBlob] = useState(false);
  
  const baseUrl = window.location.origin + window.location.pathname;

  useEffect(() => {
    if (window.location.href.startsWith('blob:') || window.location.href.includes('usercontent.goog')) {
      setIsBlob(true);
    }
  }, []);

  const generateInviteUrl = () => {
    const target = manualUrl || baseUrl;
    const url = new URL(target);
    url.searchParams.set('refRole', selectedRole);
    url.searchParams.set('refBy', currentUser.name);
    return url.toString();
  };

  const inviteUrl = generateInviteUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Admins can only invite Team Members. SuperAdmins can invite anyone.
  const availableRoles = currentUser.role === UserRole.SUPER_ADMIN 
    ? [UserRole.TEAM_MEMBER, UserRole.ADMIN, UserRole.SUPER_ADMIN]
    : [UserRole.TEAM_MEMBER];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-blue-600 p-8 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4">
            <i className="fas fa-paper-plane"></i>
          </div>
          <h2 className="text-2xl font-bold text-white">Smart Invitation</h2>
          <p className="text-blue-100 mt-2 text-sm">Create a personalized link for your team members.</p>
        </div>

        <div className="p-8 space-y-6">
          {isBlob && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2 mb-1">
                <i className="fas fa-exclamation-triangle"></i> Preview Environment Notice
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                If sharing from a sandbox, enter your main project URL below to ensure the link works for others.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Invite as Role</label>
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Root URL</label>
                <input 
                  type="text"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://yourapp.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Generated Invite Link</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pre-selected Role</p>
              <p className="text-xs font-medium text-gray-700">The new user will see <span className="font-bold text-blue-600">{selectedRole}</span> as their requested role automatically.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Approval Required</p>
              <p className="text-xs font-medium text-gray-700">Invited members still require manual approval by an Admin or SuperAdmin.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
             <div className="flex gap-4">
                <a 
                  href={`https://wa.me/?text=Join%20our%20evangelism%20team%20as%20a%20${selectedRole}!%20Register%20here:%20${encodeURIComponent(inviteUrl)}`} 
                  target="_blank" rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-all"
                >
                  <i className="fab fa-whatsapp"></i>
                </a>
                <a 
                  href={`mailto:?subject=Invitation to Church Outreach&body=Hello! Join our team as a ${selectedRole}. Register here: ${inviteUrl}`}
                  className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all"
                >
                  <i className="fas fa-envelope"></i>
                </a>
             </div>
             <button 
               onClick={onClose}
               className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200"
             >
               Close
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
