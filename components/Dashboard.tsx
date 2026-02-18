
import React, { useState, useEffect, useRef } from 'react';
import { Prospect, HungerLevel, User } from '../types';
import InviteModal from './InviteModal';
import { getSoulWinningStrategy } from '../services/geminiService';

// Declare L as any for simplicity with CDN usage in TSX
declare const L: any;

interface DashboardProps {
  prospects: Prospect[];
  users: User[];
  onSelectProspect: (id: string) => void;
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ prospects, users, onSelectProspect, currentUser }) => {
  const [showInvite, setShowInvite] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [nearbyProspects, setNearbyProspects] = useState<Prospect[]>([]);
  const [mapMode, setMapMode] = useState<'local' | 'global'>('local');
  
  // AI Strategy states
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const baptismCandidates = prospects.filter(p => p.signifiedForBaptism).length;
  const highHungerCount = prospects.filter(p => p.aiReview?.hungerLevel === HungerLevel.HIGH).length;
  
  const stats = [
    { label: 'Total Prospects', value: prospects.length, icon: 'fa-users', color: 'blue' },
    { label: 'Baptism Interests', value: baptismCandidates, icon: 'fa-water', color: 'cyan' },
    { label: 'High Hunger', value: highHungerCount, icon: 'fa-fire', color: 'orange' },
    { label: 'Followed Up', value: prospects.filter(p => p.status === 'Followed Up').length, icon: 'fa-check-circle', color: 'green' },
  ];

  const fetchStrategy = async () => {
    if (prospects.length === 0) return;
    setLoadingStrategy(true);
    try {
      const strategy = await getSoulWinningStrategy({ 
        total: prospects.length, 
        baptism: baptismCandidates, 
        highHunger: highHungerCount 
      });
      setAiStrategy(strategy);
    } catch (e) {
      console.error("Failed to load strategy", e);
    } finally {
      setLoadingStrategy(false);
    }
  };

  useEffect(() => {
    fetchStrategy();
  }, [prospects.length]);

  // Helper: Calculate distance in KM using Haversine formula
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Initialize Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(newLoc);
        
        const nearby = prospects.filter(p => {
          if (!p.coordinates) return false;
          return getDistance(newLoc.lat, newLoc.lng, p.coordinates.lat, p.coordinates.lng) <= 5;
        });
        setNearbyProspects(nearby);
      },
      (err) => console.error("Location access denied", err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [prospects]);

  // Initialize and update map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-loc-icon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-6 h-6 bg-green-500 rounded-full animate-ping opacity-25"></div>
              <div class="relative w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      }
      
      if (mapMode === 'local' && markersRef.current.length === 0) {
        map.setView([userLocation.lat, userLocation.lng], 13);
      }
    }

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const relevantProspects = prospects.filter(p => p.coordinates);

    relevantProspects.forEach(p => {
      const markerColor = p.aiReview?.hungerLevel === HungerLevel.HIGH ? '#f97316' : '#2563eb';
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const marker = L.marker([p.coordinates!.lat, p.coordinates!.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 5px;">
            <strong style="display: block; margin-bottom: 2px;">${p.name}</strong>
            <span style="font-size: 11px; color: #666;">Status: ${p.status}</span><br/>
            <button onclick="window.dispatchEvent(new CustomEvent('selectProspect', {detail: '${p.id}'}))" style="margin-top: 8px; font-size: 10px; background: #2563eb; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">View Profile</button>
          </div>
        `);
      
      markersRef.current.push(marker);
    });

    if (mapMode === 'global' && markersRef.current.length > 0) {
      const boundsArr = relevantProspects.map(p => [p.coordinates!.lat, p.coordinates!.lng]);
      if (boundsArr.length > 0) {
        const bounds = L.latLngBounds(boundsArr);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [prospects, userLocation, mapMode]);

  const recenterOnMe = () => {
    if (userLocation && mapInstanceRef.current) {
      setMapMode('local');
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
    }
  };

  useEffect(() => {
    const handleSelect = (e: any) => onSelectProspect(e.detail);
    window.addEventListener('selectProspect', handleSelect);
    return () => window.removeEventListener('selectProspect', handleSelect);
  }, [onSelectProspect]);

  const recent = prospects.slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Church Evangelism Dashboard</h1>
          <p className="text-gray-500 mt-1">Summary of outreach efforts and soul winning milestones.</p>
        </div>
        <button 
          id="tour-invite-header"
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <i className="fas fa-user-plus"></i>
          Invite Team
        </button>
      </header>

      {/* Primary Stats */}
      <div id="tour-dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

      {/* Map Section */}
      <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-map-marked-alt text-blue-600"></i>
            Geographical Outreach Map
          </h2>
          
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setMapMode('local')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mapMode === 'local' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fas fa-street-view mr-2"></i>My Area
            </button>
            <button 
              onClick={() => setMapMode('global')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mapMode === 'global' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fas fa-globe mr-2"></i>Global
            </button>
          </div>
        </div>

        <div className="relative group">
          <div ref={mapContainerRef} className="bg-gray-50 h-[450px] rounded-2xl overflow-hidden" />
          
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <button 
              onClick={recenterOnMe}
              className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-all"
              title="Recenter on Me"
            >
              <i className="fas fa-location-crosshairs"></i>
            </button>
          </div>
        </div>
      </section>

      {/* Gemini Strategy Advisor */}
      {prospects.length > 0 && (
        <section className="bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-6">
            <i className="fas fa-sparkles text-[120px]"></i>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center text-3xl shadow-xl border border-white/20 animate-pulse">
                <i className="fas fa-brain"></i>
              </div>
              <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-200">Gemini Strategy Advisor</span>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Weekly Soul-Winning Insight</h2>
                <button 
                  onClick={fetchStrategy}
                  className="text-white/60 hover:text-white transition-colors p-2"
                  title="Refresh Insight"
                >
                  <i className={`fas fa-sync-alt ${loadingStrategy ? 'fa-spin' : ''}`}></i>
                </button>
              </div>

              {loadingStrategy ? (
                <div className="space-y-4 py-4">
                  <div className="h-4 bg-white/10 rounded-full w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-white/10 rounded-full w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-white/10 rounded-full w-2/3 animate-pulse"></div>
                </div>
              ) : (
                <div className="text-lg leading-relaxed text-indigo-50/90 whitespace-pre-line font-medium italic">
                  {aiStrategy || "Analyzing the field for the best spiritual entry points..."}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
                    </div>
                    <p className="text-xs text-gray-500 truncate">{new Date(p.timestamp).toLocaleDateString()} &bull; {p.preacherName}</p>
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
                You have {baptismCandidates} people interested in baptism! Organize a special counseling session this Sunday.
              </p>
            </div>
          </div>
        </section>
      </div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} currentUser={currentUser} />}
    </div>
  );
};

export default Dashboard;
