
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { isFirebaseConfigured } from '../services/firebase';
import InviteModal from './InviteModal';

interface SidebarProps {
  activeTab: 'dashboard' | 'new' | 'people' | 'users' | 'profile' | 'cloud';
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, user }) => {
  const [showInvite, setShowInvite] = useState(false);

  const tabs = [
    { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard' },
    { id: 'new', icon: 'fa-plus-circle', label: 'New Outreach' },
    { id: 'people', icon: 'fa-users', label: 'Prospects' },
    { id: 'users', icon: 'fa-user-shield', label: user.role === UserRole.TEAM_MEMBER ? 'Our Team' : 'Team Directory' },
    { id: 'profile', icon: 'fa-user-circle', label: 'My Profile' },
  ] as { id: string, icon: string, label: string }[];

  return (
    <>
      <aside className="w-20 md:w-64 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
              <i className="fas fa-cross text-xl"></i>
            </div>
            <span className="hidden md:block font-bold text-xl text-gray-800 truncate">HarvestHub</span>
          </div>
          <div className="hidden md:block">
            <div 
              className={`w-3 h-3 rounded-full transition-all duration-500 ${isFirebaseConfigured ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-amber-500'}`}
              title={isFirebaseConfigured ? 'Cloud Connected' : 'Local Mode Only'}
            ></div>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <i className={`fas ${tab.icon} text-lg shrink-0`}></i>
              <span className="hidden md:block">{tab.label}</span>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-50">
            <button 
              onClick={() => setShowInvite(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-blue-600 bg-blue-50/50 hover:bg-blue-50 transition-all group"
            >
              <i className="fas fa-paper-plane text-lg group-hover:rotate-12 transition-transform shrink-0"></i>
              <span className="hidden md:block font-bold text-sm">Invite Team</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 mb-4 p-2 w-full rounded-xl transition-all hover:bg-gray-50 text-left ${activeTab === 'profile' ? 'bg-blue-50 ring-1 ring-blue-100' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0 overflow-hidden">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate uppercase tracking-tighter">{user.role}</p>
            </div>
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <i className="fas fa-sign-out-alt text-lg shrink-0"></i>
            <span className="hidden md:block font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} currentUser={user} />}
    </>
  );
};

export default Sidebar;
