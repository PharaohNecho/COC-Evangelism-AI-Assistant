
import React, { useState, useRef } from 'react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
  onUpdate: (updates: Partial<User>) => Promise<void>;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    photoUrl: user.photoUrl || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await onUpdate(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = () => {
    switch(user.role) {
      case 'SuperAdmin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Admin': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your church identity and contact preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl text-center space-y-6">
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden shadow-2xl border-4 border-white">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center text-blue-600 hover:text-blue-700 transition-all hover:scale-110"
              >
                <i className="fas fa-camera"></i>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${getRoleBadgeColor()}`}>
              <i className="fas fa-user-shield"></i>
              {user.role}
            </div>

            <div className="pt-6 border-t border-gray-50 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                <p className="text-sm font-bold text-green-600">{user.status}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</p>
                <p className="text-sm font-bold text-gray-700">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-8">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-cog text-blue-600"></i>
              Account Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block ml-1">Full Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-5 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block ml-1">Church Phone Number</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-5 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 block ml-1">Email Address (Locked)</label>
                <input 
                  disabled
                  type="email"
                  value={user.email}
                  className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 block ml-1">Member Role (Locked)</label>
                <input 
                  disabled
                  type="text"
                  value={user.role}
                  className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
              {success ? (
                <div className="text-green-600 font-bold text-sm animate-in fade-in slide-in-from-left-4">
                  <i className="fas fa-check-circle mr-2"></i>
                  Changes saved successfully!
                </div>
              ) : <div></div>}
              
              <button 
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
              >
                {loading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-save"></i>
                )}
                Update Profile
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
              <i className="fas fa-info-circle"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Security Note</p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Changes to your role or email must be requested through a SuperAdmin for organizational integrity. 
                Your profile picture and phone number help other team members contact you during outreach events.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
