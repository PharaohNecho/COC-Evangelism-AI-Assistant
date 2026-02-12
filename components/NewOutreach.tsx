
import React, { useState, useRef } from 'react';
import { User, Prospect, HungerLevel } from '../types';
import { analyzePreachingNotes } from '../services/geminiService';

interface NewOutreachProps {
  onSave: (prospect: Prospect) => void;
  currentUser: User;
}

const NewOutreach: React.FC<NewOutreachProps> = ({ onSave, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressMode: 'gps' as 'gps' | 'manual',
    manualAddress: '',
    notes: '',
    signifiedForBaptism: false,
  });
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        alert("Error getting location: " + err.message);
      }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const aiResult = await analyzePreachingNotes(formData.notes);

      // Create object without 'undefined' keys to satisfy Firestore
      const newProspect: Prospect = {
        id: crypto.randomUUID(),
        name: formData.name,
        phone: formData.phone,
        preachingNotes: formData.notes,
        aiReview: aiResult,
        followUps: [],
        timestamp: new Date().toISOString(),
        preacherName: currentUser.name,
        status: 'New',
        signifiedForBaptism: formData.signifiedForBaptism,
        // Conditional spreads ensure keys only exist if they have values
        ...(formData.addressMode === 'manual' && formData.manualAddress ? { manualAddress: formData.manualAddress } : {}),
        ...(formData.addressMode === 'gps' && coords ? { coordinates: coords } : {}),
        ...(photo ? { photoUrl: photo } : {})
      };

      onSave(newProspect);
    } catch (err) {
      console.error(err);
      alert("Something went wrong analyzing the notes. Attempting to save without AI review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">New Outreach Entry</h1>
        <p className="text-gray-500">Log information for a person you just preached to.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Prospect Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter prospect name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.signifiedForBaptism}
                  onChange={e => setFormData({...formData, signifiedForBaptism: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                  Signified for Baptism interest during encounter
                </span>
              </label>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Location Information</h3>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
              <button 
                type="button"
                onClick={() => setFormData({...formData, addressMode: 'gps'})}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.addressMode === 'gps' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Live GPS
              </button>
              <button 
                type="button"
                onClick={() => setFormData({...formData, addressMode: 'manual'})}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.addressMode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Manual Address
              </button>
            </div>

            {formData.addressMode === 'gps' ? (
              <div className="flex items-center gap-4 p-4 border border-dashed border-gray-300 rounded-xl">
                <button 
                  type="button"
                  onClick={handleGetLocation}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100 transition-colors"
                >
                  <i className="fas fa-location-arrow"></i>
                  Fetch GPS Coordinates
                </button>
                {coords ? (
                  <p className="text-sm text-green-600 font-medium">
                    <i className="fas fa-check-circle mr-1"></i>
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No coordinates captured yet</p>
                )}
              </div>
            ) : (
              <textarea 
                required
                value={formData.manualAddress}
                onChange={e => setFormData({...formData, manualAddress: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[100px]"
                placeholder="Enter physical address, house number, or landmarks..."
              />
            )}
          </div>

          {/* Multimedia and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Preaching Summary</h3>
              <textarea 
                required
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[200px]"
                placeholder="Briefly describe the conversation, spiritual responses, and specific prayer points..."
              />
              <p className="text-xs text-gray-400 italic">
                <i className="fas fa-magic mr-1"></i> Gemini AI will analyze these notes to suggest follow-up steps.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Location Photo</h3>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden"
              >
                {photo ? (
                  <img src={photo} alt="Outreach" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <i className="fas fa-camera text-3xl text-gray-300 group-hover:text-blue-400 mb-2"></i>
                    <p className="text-sm text-gray-400 group-hover:text-blue-500">Tap to capture or upload</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            type="button"
            className="px-6 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="px-10 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                AI Analyzing...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save Entry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewOutreach;
