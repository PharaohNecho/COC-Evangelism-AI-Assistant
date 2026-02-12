
import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { isFirebaseConfigured } from '../services/firebase';

interface UserManagementProps {
  users: User[];
  onUpdateStatus: (userId: string, status: UserStatus, role?: UserRole, updates?: Partial<User>) => void;
  currentUser: User;
  onGoToCloud: () => void;
}

const TeamDirectory: React.FC<UserManagementProps> = ({ users, onUpdateStatus, currentUser, onGoToCloud }) => {
  const [filterRole, setFilterRole] = useState<'ALL' | UserRole>('ALL');
  const [editingTeamUserId, setEditingTeamUserId] = useState<string | null>(null);
  const [tempTeam, setTempTeam] = useState('');

  const filteredUsers = users.filter(u => filterRole === 'ALL' || u.role === filterRole);

  const canEdit = (targetUser: User) => {
    if (currentUser.role === UserRole.SUPER_ADMIN) return targetUser.id !== currentUser.id;
    return false;
  };

  const handleSaveTeam = (userId: string) => {
    onUpdateStatus(userId, UserStatus.APPROVED, undefined, { team: tempTeam });
    setEditingTeamUserId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Directory</h1>
          <p className="text-gray-500">View your fellow laborers and manage organizational structure.</p>
        </div>
        
        <select 
          value={filterRole}
          onChange={e => setFilterRole(e.target.value as any)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-sm"
        >
          <option value="ALL">All Roles</option>
          <option value={UserRole.SUPER_ADMIN}>SuperAdmins</option>
          <option value={UserRole.ADMIN}>Admins</option>
          <option value={UserRole.TEAM_MEMBER}>Team Members</option>
        </select>
      </header>

      {currentUser.role !== UserRole.TEAM_MEMBER && (
        <div className={`p-6 rounded-2xl border ${isFirebaseConfigured ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold flex items-center gap-2 ${isFirebaseConfigured ? 'text-green-800' : 'text-amber-800'}`}>
              <i className={`fas ${isFirebaseConfigured ? 'fa-cloud' : 'fa-cloud-slash'}`}></i>
              Cloud Sync Status
            </h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isFirebaseConfigured ? 'bg-green-200 text-green-700' : 'bg-amber-200 text-amber-700'}`}>
              {isFirebaseConfigured ? 'Live' : 'Local Only'}
            </span>
          </div>
          
          {!isFirebaseConfigured && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-amber-900 leading-relaxed max-w-md">
                Invite links may not sync correctly until Cloud mode is enabled.
              </p>
              <button 
                onClick={onGoToCloud}
                className="px-6 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 shadow-lg"
              >
                Connect Firebase
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-5">Laborer</th>
                <th className="px-6 py-5">Team / Group</th>
                <th className="px-6 py-5">Role</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5">Status</th>
                {currentUser.role !== UserRole.TEAM_MEMBER && <th className="px-6 py-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                        {u.photoUrl ? <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.name} {u.id === currentUser.id && '(You)'}</p>
                        <p className="text-[10px] text-gray-400">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingTeamUserId === u.id ? (
                      <div className="flex items-center gap-2 animate-in zoom-in duration-200">
                        <input 
                          autoFocus
                          type="text" 
                          value={tempTeam} 
                          onChange={e => setTempTeam(e.target.value)}
                          className="px-2 py-1 border border-blue-200 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveTeam(u.id)}
                        />
                        <button onClick={() => handleSaveTeam(u.id)} className="text-green-500 hover:text-green-700"><i className="fas fa-check-circle"></i></button>
                        <button onClick={() => setEditingTeamUserId(null)} className="text-gray-400"><i className="fas fa-times"></i></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 italic">
                          {u.team || 'Unassigned'}
                        </span>
                        {canEdit(u) && (
                          <button 
                            onClick={() => { setEditingTeamUserId(u.id); setTempTeam(u.team || ''); }}
                            className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <i className="fas fa-edit text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                      u.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-600' :
                      u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 flex items-center gap-2">
                        <i className="fas fa-envelope text-[10px] opacity-40"></i>
                        {u.email}
                      </p>
                      {u.phone && (
                        <p className="text-xs text-gray-600 flex items-center gap-2">
                          <i className="fas fa-phone text-[10px] opacity-40"></i>
                          {u.phone}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      u.status === UserStatus.APPROVED ? 'bg-green-100 text-green-600' : 
                      u.status === UserStatus.PENDING ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  {currentUser.role !== UserRole.TEAM_MEMBER && (
                    <td className="px-6 py-4 text-right">
                      {canEdit(u) ? (
                        <div className="flex justify-end gap-2">
                          {u.status === UserStatus.PENDING && (
                            <button 
                              onClick={() => onUpdateStatus(u.id, UserStatus.APPROVED)}
                              className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 shadow-md shadow-green-100"
                            >
                              Approve
                            </button>
                          )}
                          <select 
                            onChange={(e) => onUpdateStatus(u.id, UserStatus.APPROVED, e.target.value as UserRole)}
                            className="text-[10px] font-bold border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                            defaultValue={u.role}
                          >
                            <option value={UserRole.TEAM_MEMBER}>Team Member</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                            {currentUser.role === UserRole.SUPER_ADMIN && <option value={UserRole.SUPER_ADMIN}>SuperAdmin</option>}
                          </select>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 italic font-medium uppercase">Restricted</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamDirectory;
