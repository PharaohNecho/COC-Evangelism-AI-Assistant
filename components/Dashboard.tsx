
import React, { useState, useEffect, useRef } from 'react';
import { Prospect, HungerLevel, User } from '../types';
import InviteModal from './InviteModal';

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
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const baptismCandidates = prospects.filter(p => p.signifiedForBaptism).length;
  
  const stats = [
    { label: 'Total Prospects', value: prospects.length, icon: 'fa-users', color: 'blue' },
    { label: 'Baptism Interests', value: baptismCandidates, icon: 'fa-water', color: 'cyan' },
    { label: 'High Hunger', value: prospects.filter(p => p.aiReview?.hungerLevel === HungerLevel.HIGH).length, icon: 'fa-fire', color: 'orange' },
    { label: 'Followed Up', value: prospects.filter(p => p.status === 'Followed Up').length, icon: 'fa-check-circle', color: 'green' },
  ];

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
        
        // Find nearby prospects (within 5km)
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

    // Manage User Location Marker
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
      
      // Auto-center on first location fix if in local mode
      if (mapMode === 'local' && markersRef.current.length === 0) {
        map.setView([userLocation.lat, userLocation.lng], 13);
      }
    }

    // Clear old prospect markers
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

    // Handle Bounds
    if (mapMode === 'global' && markersRef.current.length > 0) {
      const boundsArr = relevantProspects.map(p => [p.coordinates!.lat, p.coordinates!.lng]);
      if (boundsArr.length > 0) {
        const bounds = L.latLngBounds(boundsArr);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Cleanup Leaflet instance on unmount handled by ref but we ensure markers are managed
  }, [prospects, userLocation, mapMode]);

  const recenterOnMe = () => {
    if (userLocation && mapInstanceRef.current) {
      setMapMode('local');
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
    }
  };

  const showNearbyOnly = () => {
    if (nearbyProspects.length > 0 && userLocation && mapInstanceRef.current) {
      setMapMode('local');
      const boundsArr = [
        [userLocation.lat, userLocation.lng],
        ...nearbyProspects.map(p => [p.coordinates!.lat, p.coordinates!.lng])
      ];
      const bounds = L.latLngBounds(boundsArr);
      mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80], animate: true });
    }
  };

  // Handle popup button click
  useEffect(() => {
    const handleSelect = (e: any) => onSelectProspect(e.detail);
    window.addEventListener('selectProspect', handleSelect);
    return () => window.removeEventListener('selectProspect', handleSelect);
  }, [onSelectProspect]);

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
          
          {/* Floating UI Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <button 
              onClick={recenterOnMe}
              className="w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-all"
              title="Recenter on Me"
            >
              <i className="fas fa-location-crosshairs"></i>
            </button>
          </div>

          {nearbyProspects.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] animate-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={showNearbyOnly}
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl flex items-center gap-3 hover:bg-blue-700 hover:scale-105 transition-all"
              >
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">
                  {nearbyProspects.length}
                </div>
                Nearby Prospects Detected
                <i className="fas fa-chevron-up text-[10px]"></i>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-sm"></div>
            <span>Standard Prospect</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm"></div>
            <span>High Spiritual Hunger</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white ring-2 ring-green-200 ring-offset-2 animate-pulse"></div>
            <span>You (Current Location)</span>
          </div>
        </div>
      </section>

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
          id="tour-invite-card"
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
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} currentUser={currentUser} />}
    </div>
  );
};

export default Dashboard;
