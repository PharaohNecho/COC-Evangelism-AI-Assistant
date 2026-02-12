
import React, { useState } from 'react';
import { Prospect, HungerLevel, User } from '../types';
import InviteModal from './InviteModal';

interface DashboardProps {
  prospects: Prospect[];
  users: User[];
  onSelectProspect: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ prospects, users, onSelectProspect }) => {
  const [showInvite, setShowInvite] = useState(false);
  const baptismCandidates = prospects.filter(p => p.signifiedForBaptism).length;
  
  const stats = [
    { label: 'Total Prospects', value: prospects.length, icon: 'fa-users', color: 'blue' },
    { label: 'Baptism Interests', value: baptismCandidates, icon: 'fa-water', color: 'cyan' },
    { label: 'High Hunger', value: prospects.filter(p => p.aiReview?.hungerLevel === HungerLevel.HIGH).length, icon: 'fa-fire', color: 'orange' },
    { label: 'Followed Up', value: prospects.filter(p => p.status === 'Followed Up').length, icon: 'fa-check-circle', color: 'green' },
  ];

  // Performance calculations
  const getTopPerformer = (roleFilter: 'Team Member' | 'Leader') => {
    const preacherStats: Record<string, number> = {};
    prospects.forEach(p => {
      preacherStats[p.preacherName] = (preacherStats[p.preacherName] || 0) + 1;
    });

    const relevantPreachers = Object.entries(preacherStats).filter(([name]) => {
      const user = users.find(u => u.name === name);
      if (!user) return false;
      if (roleFilter === 'Team Member') return user.role === 'Team Member';
      return user.role === 'Admin' || user.role === 'SuperAdmin';
    });

    if (relevantPreachers.length === 0) return null;
    relevantPreachers.sort((a, b) => b[1] - a[1]);
    return { name: relevantPreachers[0][0], count: relevantPreachers[0][1] };
  };

  const topTeamMember = getTopPerformer('Team Member');
  const topLeader = getTopPerformer('Leader');

  const recent = prospects.slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Church Evangelism Dashboard</h1>
          <p className="text-gray-500 mt-1">Summary of outreach efforts and soul winning milestones.</p>
        </div>
        <button 
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <i className="fas fa-user-plus"></i>
          Invite Team
        </button>
      </header>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:scale-[1.02]">
            <div className={`w-12 h-12 rounded-xl bg-${s.color}-100 flex items-center justify-center text-${s.color}-600`}>
              <i className={`fas ${s.icon} text-xl`}></i>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recognition Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gradient-to-r from-blue-600 to-blue-500 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
              <i className="fas fa-trophy"></i>
            </div>
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Top Team Member</p>
              <h3 className="text-xl font-bold truncate">{topTeamMember ? topTeamMember.name : 'Waiting...'}</h3>
              {topTeamMember && <p className="text-sm opacity-90">{topTeamMember.count} souls</p>}
            </div>
          </div>
        </div>
        <div className="md:col-span-1 bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
              <i className="fas fa-star"></i>
            </div>
            <div>
              <p className="text-purple-100 text-xs font-bold uppercase tracking-wider">Top Church Leader</p>
              <h3 className="text-xl font-bold truncate">{topLeader ? topLeader.name : 'Waiting...'}</h3>
              {topLeader && <p className="text-sm opacity-90">{topLeader.count} outreach</p>}
            </div>
          </div>
        </div>
        <div 
          onClick={() => setShowInvite(true)}
          className="md:col-span-1 bg-white p-6 rounded-2xl shadow-md border-2 border-dashed border-blue-200 flex items-center gap-4 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group"
        >
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl group-hover:scale-110 transition-transform">
            <i className="fas fa-plus"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Grow Your Team</h3>
            <p className="text-xs text-gray-500">Share with other preachers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Outreach</h2>
            <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {recent.length > 0 ? (
              recent.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => onSelectProspect(p.id)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold uppercase">
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      {p.signifiedForBaptism && (
                        <i className="fas fa-water text-cyan-500 text-[10px]" title="Baptism Candidate"></i>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{new Date(p.timestamp).toLocaleDateString()} &bull; {p.preacherName}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    p.aiReview?.hungerLevel === HungerLevel.HIGH ? 'bg-orange-100 text-orange-600' :
                    p.aiReview?.hungerLevel === HungerLevel.MEDIUM ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.aiReview?.hungerLevel || 'Pending'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <i className="fas fa-folder-open text-4xl mb-3 opacity-20"></i>
                <p>No records found. Start your first outreach!</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Strategic Insights</h2>
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <i className="fas fa-lightbulb"></i> Harvest Tip
              </h3>
              <p className="text-sm text-blue-700 mt-2">
                You have {baptismCandidates} people interested in baptism! Organize a special counseling session this Sunday to move them toward their next spiritual milestone.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-widest">Preacher Activity</h3>
              <div className="space-y-3">
                {Array.from(new Set(prospects.map(p => p.preacherName))).slice(0, 5).map((name, i) => {
                  const count = prospects.filter(p => p.preacherName === name).length;
                  const percentage = (count / prospects.length) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{name}</span>
                        <span className="text-gray-500">{count} souls</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
};

export default Dashboard;
