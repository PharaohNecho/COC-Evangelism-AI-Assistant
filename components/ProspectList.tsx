
import React, { useState } from 'react';
import { Prospect, HungerLevel } from '../types';

interface ProspectListProps {
  prospects: Prospect[];
  onSelectProspect: (id: string) => void;
}

const ProspectList: React.FC<ProspectListProps> = ({ prospects, onSelectProspect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHunger, setFilterHunger] = useState<'ALL' | HungerLevel | 'BAPTISM'>('ALL');

  const filtered = prospects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.phone.includes(searchTerm);
    if (filterHunger === 'BAPTISM') return matchesSearch && p.signifiedForBaptism;
    const matchesHunger = filterHunger === 'ALL' || p.aiReview?.hungerLevel === filterHunger;
    return matchesSearch && matchesHunger;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospect Directory</h1>
          <p className="text-gray-500">Manage and search for everyone we've reached.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          <select 
            value={filterHunger}
            onChange={e => setFilterHunger(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-sm"
          >
            <option value="ALL">All Categories</option>
            <option value="BAPTISM">Baptism Candidates</option>
            <option value={HungerLevel.HIGH}>High Hunger</option>
            <option value={HungerLevel.MEDIUM}>Medium Hunger</option>
            <option value={HungerLevel.LOW}>Low Hunger</option>
          </select>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Person</th>
                <th className="px-6 py-4">Outreach Info</th>
                <th className="px-6 py-4">AI Insight</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold relative">
                        {p.name.charAt(0)}
                        {p.signifiedForBaptism && (
                          <div className="absolute -right-1 -top-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-white flex items-center justify-center">
                            <i className="fas fa-water text-[7px] text-white"></i>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 flex items-center gap-1">
                          {p.name}
                          {p.signifiedForBaptism && (
                            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{p.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-1">
                      <p className="text-gray-700"><i className="fas fa-user-tag mr-2 opacity-50"></i>{p.preacherName}</p>
                      <p className="text-gray-500"><i className="fas fa-calendar mr-2 opacity-50"></i>{new Date(p.timestamp).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                        p.aiReview?.hungerLevel === HungerLevel.HIGH ? 'bg-orange-100 text-orange-600' :
                        p.aiReview?.hungerLevel === HungerLevel.MEDIUM ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.aiReview?.hungerLevel || 'No Data'}
                      </span>
                      <p className="text-xs text-gray-500 italic max-w-[150px] truncate">{p.aiReview?.suggestedNextAction}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      p.status === 'Member' ? 'bg-green-100 text-green-600' : 
                      p.status === 'Followed Up' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onSelectProspect(p.id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Details
                      <i className="fas fa-chevron-right text-[10px]"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-search text-5xl mb-4 opacity-10"></i>
            <p className="text-lg">No prospects found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProspectList;
