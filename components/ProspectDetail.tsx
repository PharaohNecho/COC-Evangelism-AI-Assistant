
import React, { useState } from 'react';
import { Prospect, User, HungerLevel, FollowUp, UserRole } from '../types';
import { generateFollowUpMessage } from '../services/geminiService';

interface ProspectDetailProps {
  prospect: Prospect;
  onBack: () => void;
  onUpdate: (updated: Prospect) => void;
  currentUser: User;
  allUsers?: User[];
}

const ProspectDetail: React.FC<ProspectDetailProps> = ({ prospect, onBack, onUpdate, currentUser, allUsers = [] }) => {
  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedMessage, setDraftedMessage] = useState<string | null>(null);

  const handleAddFollowUp = () => {
    const newFollowUp: FollowUp = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      notes: followUpNotes,
      preacherName: currentUser.name,
    };

    const updatedProspect: Prospect = {
      ...prospect,
      followUps: [newFollowUp, ...prospect.followUps],
      status: 'Followed Up'
    };

    onUpdate(updatedProspect);
    setFollowUpNotes('');
    setIsAddingFollowUp(false);
  };

  const handleDraftMessage = async () => {
    setIsDrafting(true);
    setDraftedMessage(null);
    try {
      const msg = await generateFollowUpMessage(prospect, currentUser.name);
      setDraftedMessage(msg);
    } catch (e) {
      alert("AI failed to draft message. Please try again.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleAssign = (userId: string) => {
    if (!userId) {
      onUpdate({ ...prospect, assignedToUserId: undefined, assignedToUserName: undefined });
      return;
    }
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      onUpdate({ 
        ...prospect, 
        assignedToUserId: target.id, 
        assignedToUserName: target.name 
      });
    }
  };

  const handleToggleStatus = () => {
    const nextStatusMap: Record<string, 'New' | 'Followed Up' | 'Member'> = {
      'New': 'Followed Up',
      'Followed Up': 'Member',
      'Member': 'New'
    };
    onUpdate({ ...prospect, status: nextStatusMap[prospect.status] });
  };

  const handleToggleBaptism = () => {
    onUpdate({ ...prospect, signifiedForBaptism: !prospect.signifiedForBaptism });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Message copied to clipboard!");
  };

  const canAssign = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <nav className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
          Back to list
        </button>
        <div className="flex gap-2">
          {canAssign && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1 shadow-sm">
              <i className="fas fa-hand-holding-heart text-blue-500 text-xs"></i>
              <select 
                value={prospect.assignedToUserId || ''}
                onChange={(e) => handleAssign(e.target.value)}
                className="text-xs font-bold text-gray-700 outline-none bg-transparent"
              >
                <option value="">No Assignment</option>
                {allUsers.filter(u => u.status === 'Approved').map(u => (
                  <option key={u.id} value={u.id}>Assign: {u.name}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={handleToggleBaptism}
            className={`px-4 py-2 border rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              prospect.signifiedForBaptism 
                ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-inner' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className={`fas fa-water ${prospect.signifiedForBaptism ? 'animate-pulse' : ''}`}></i>
            {prospect.signifiedForBaptism ? 'Baptism Candidate' : 'Mark for Baptism'}
          </button>
          <button 
            onClick={handleToggleStatus}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <i className="fas fa-sync-alt"></i>
            Status: <span className="text-blue-600 font-bold">{prospect.status}</span>
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Info Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-4xl font-bold relative">
                  {prospect.name.charAt(0)}
                  {prospect.signifiedForBaptism && (
                    <div className="absolute -bottom-2 -right-2 bg-cyan-400 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                      <i className="fas fa-water text-sm"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">{prospect.name}</h1>
                    {prospect.assignedToUserName && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        <i className="fas fa-user-check mr-1"></i> Assigned to {prospect.assignedToUserName}
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-gray-500 flex items-center gap-2 mt-1">
                    <i className="fas fa-phone-alt text-blue-500"></i>
                    {prospect.phone}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      prospect.status === 'Member' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {prospect.status}
                    </span>
                    {prospect.signifiedForBaptism && (
                      <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold uppercase flex items-center gap-1">
                        <i className="fas fa-tint"></i> Ready for Baptism
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   <button 
                    onClick={handleDraftMessage}
                    disabled={isDrafting}
                    className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isDrafting ? <i className="fas fa-sparkles fa-spin"></i> : <i className="fas fa-sparkles"></i>}
                     Draft Follow-up
                   </button>
                </div>
              </div>

              {draftedMessage && (
                <div className="mb-8 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl animate-in slide-in-from-top-4 duration-500 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-indigo-800 font-bold text-sm flex items-center gap-2">
                      <i className="fas fa-magic"></i>
                      Gemini Outreach Suggestion
                    </h3>
                    <button 
                      onClick={() => setDraftedMessage(null)}
                      className="text-indigo-300 hover:text-indigo-600"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <p className="text-sm text-indigo-700 italic leading-relaxed whitespace-pre-wrap">
                    "{draftedMessage}"
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => copyToClipboard(draftedMessage)}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <i className="fas fa-copy"></i>
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Encounter Notes</h3>
                  <div className="p-4 bg-gray-50 rounded-xl text-gray-700 leading-relaxed text-sm italic">
                    "{prospect.preachingNotes}"
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-4">
                    <span><i className="fas fa-user mr-1"></i> Preached by {prospect.preacherName}</span>
                    <span><i className="fas fa-calendar mr-1"></i> {new Date(prospect.timestamp).toLocaleDateString()}</span>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Location</h3>
                  {prospect.photoUrl && (
                    <img src={prospect.photoUrl} alt="Location" className="w-full h-40 object-cover rounded-xl shadow-sm border border-gray-100" />
                  )}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3 items-start">
                    <i className="fas fa-map-marker-alt text-blue-500 mt-1"></i>
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">Address Recorded:</p>
                      <p className="text-blue-700 mt-1">
                        {prospect.manualAddress || (prospect.coordinates ? `${prospect.coordinates.lat.toFixed(5)}, ${prospect.coordinates.lng.toFixed(5)}` : 'No location data')}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Follow-up History</h2>
                <button 
                  onClick={() => setIsAddingFollowUp(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all"
                >
                  <i className="fas fa-plus"></i> Add Log
                </button>
              </div>

              {isAddingFollowUp && (
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Log New Follow-up Interaction</h3>
                  <textarea 
                    value={followUpNotes}
                    onChange={e => setFollowUpNotes(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] mb-4"
                    placeholder="Describe what happened during this visit/call..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddingFollowUp(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                    <button onClick={handleAddFollowUp} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Save Log</button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {prospect.followUps.length > 0 ? (
                  prospect.followUps.map((fu) => (
                    <div key={fu.id} className="relative pl-8 border-l-2 border-gray-100 pb-2">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(fu.date).toLocaleDateString()}</p>
                        <p className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-500">{fu.preacherName}</p>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{fu.notes}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <i className="fas fa-history text-4xl mb-3 opacity-20"></i>
                    <p>No follow-ups recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Analysis Panel */}
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 shadow-xl text-white">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <i className="fas fa-brain"></i>
              Gemini AI Review
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/10">
                <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-1">Spiritual Hunger</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{prospect.aiReview?.hungerLevel}</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-2 h-5 rounded-full ${
                        prospect.aiReview?.hungerLevel === HungerLevel.HIGH || (prospect.aiReview?.hungerLevel === HungerLevel.MEDIUM && i <= 2) || (prospect.aiReview?.hungerLevel === HungerLevel.LOW && i === 1)
                          ? 'bg-blue-300' : 'bg-blue-300/20'
                      }`}></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-blue-200 uppercase tracking-widest">Suggested Verse</p>
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/5 italic text-sm leading-relaxed">
                  "{prospect.aiReview?.suggestedVerse}"
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black text-blue-200 uppercase tracking-widest">Next Strategy</p>
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  {prospect.aiReview?.suggestedNextAction}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">Executive Summary</p>
                <p className="text-xs text-blue-100 opacity-80 leading-relaxed italic">
                  "{prospect.aiReview?.summary}"
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">Team Reminders</h2>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start text-sm">
                <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5 text-green-600">
                  <i className="fas fa-check text-xs"></i>
                </div>
                <p className="text-gray-600">Call within 48 hours of initial preaching.</p>
              </li>
              <li className="flex gap-3 items-start text-sm">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600">
                  <i className="fas fa-info text-xs"></i>
                </div>
                <p className="text-gray-600">Bring a Welcome Bible if hunger is "High".</p>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetail;
