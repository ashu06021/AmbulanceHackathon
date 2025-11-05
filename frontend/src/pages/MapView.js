import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';

// Fix default icon path problem in some setups
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom ambulance icon
const ambulanceIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDhIMjBWMjBIMThWOFoiIGZpbGw9IiMzODgzZmYiLz4KPHBhdGggZD0iTTE1IDRIMTZWMjBIMTVWNFoiIGZpbGw9IiMxZTNmYWYiLz4KPHBhdGggZD0iTTQgM0gxNFYyMUg0VjNaIiBmaWxsPSIjMWUzZmFmIi8+CjxwYXRoIGQ9Ik00IDhINlYxN0g0VjhaIiBmaWxsPSIjMzg4M2ZmIi8+CjxjaXJjbGUgY3g9IjciIGN5PSIxOCIgcj0iMiIgZmlsbD0iIzIyMiIvPgo8Y2lyY2xlIGN4PSIxNyIgY3k9IjE4IiByPSIyIiBmaWxsPSIjMjIyIi8+Cjwvc3ZnPgo=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Critical patient icon
const criticalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2RjMjYyNiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xMiA4VjEyIiBzdHJva2U9IiNkYzI2MjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMiAxNlYxNi4wMSIgc3Ryb2tlPSIjZGMyNjI2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Hospital icon
const hospitalIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDIxSDVDMy44OTU0MyAyMSAzIDIwLjEwNDYgMyAxOVY5QzMgNy44OTU0MyAzLjg5NTQzIDcgNSA3SDhWNUgxNlY3SDE5QzIwLjEwNDYgNyAyMSA3Ljg5NTQzIDIxIDlWMTlDMjEgMjAuMTA0NiAyMC4xMDQ2IDIxIDE5IDIxWiIgc3Ryb2tlPSIjZGMwMDAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPHBhdGggZD0iTTggMTJIMTZWIj4KPHBhdGggZD0iTTEyIDhWMTYiPgo8L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

const center = { lat: 18.5204, lng: 73.8567 }; // Pune default

// Nearby hospitals data
const nearbyHospitals = [
  { id: 1, name: 'Pune General Hospital', lat: 18.5204, lng: 73.8567, distance: '0 km', beds: 50 },
  { id: 2, name: 'Ruby Hall Clinic', lat: 18.5154, lng: 73.8417, distance: '2.1 km', beds: 35 },
  { id: 3, name: 'Sassoon Hospital', lat: 18.5254, lng: 73.8717, distance: '1.8 km', beds: 40 },
  { id: 4, name: 'Deenanath Mangeshkar Hospital', lat: 18.5304, lng: 73.8517, distance: '2.5 km', beds: 30 },
  { id: 5, name: 'Jehangir Hospital', lat: 18.5104, lng: 73.8617, distance: '1.2 km', beds: 25 }
];

export default function MapView() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [criticalPatients, setCriticalPatients] = useState([]);
  const [showHospitals, setShowHospitals] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentAmbulance, setCurrentAmbulance] = useState(null);

  // Initialize with multiple ambulances
  useEffect(() => {
    const initialAmbulances = [
      { id: 'AMB001', name: 'Ambulance 001', lat: 18.5154, lng: 73.8517, status: 'on_mission', patient: 'Rahul Sharma' },
      { id: 'AMB002', name: 'Ambulance 002', lat: 18.5254, lng: 73.8617, status: 'available', patient: null },
      { id: 'AMB003', name: 'Ambulance 003', lat: 18.5304, lng: 73.8417, status: 'on_mission', patient: 'Priya Patel' },
      { id: 'AMB004', name: 'Ambulance 004', lat: 18.5104, lng: 73.8667, status: 'maintenance', patient: null }
    ];
    
    setLocations(initialAmbulances);

    // Set current ambulance for ambulance staff
    if (user?.role === 'ambulance_staff') {
      const userAmbulance = initialAmbulances.find(amb => amb.id === user.ambulanceId) || initialAmbulances[0];
      setCurrentAmbulance(userAmbulance);
    }

    // Connect to Socket.IO for real-time updates
    const socket = socketService.connect(user?.role);
    
    if (socket) {
      socket.on('connect', () => {
        console.log('🗺️ MapView connected to Socket.IO');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ MapView disconnected');
        setIsConnected(false);
      });

      // Listen for location updates from ambulances
      socketService.onLocationUpdate((locationData) => {
        console.log('📍 Received location update:', locationData);
        
        setLocations(prev => 
          prev.map(ambulance => 
            ambulance.id === locationData.ambulanceId 
              ? { 
                  ...ambulance, 
                  lat: locationData.latitude || locationData.lat,
                  lng: locationData.longitude || locationData.lng,
                  lastUpdate: new Date().toLocaleTimeString()
                }
              : ambulance
          )
        );
      });

      // Listen for emergency alerts to show critical patients
      socketService.onEmergencyAlert((alertData) => {
        console.log('🚨 Emergency alert on map:', alertData);
        
        setCriticalPatients(prev => {
          const exists = prev.find(p => p.patientId === alertData.patientId);
          if (!exists) {
            const newPatient = {
              patientId: alertData.patientId || `PAT_${Date.now()}`,
              patientName: alertData.patientName,
              condition: alertData.condition,
              ambulanceId: alertData.ambulanceId,
              lat: alertData.location?.lat || (Math.random() * 0.02 + 18.51),
              lng: alertData.location?.lng || (Math.random() * 0.02 + 73.85),
              timestamp: alertData.timestamp,
              priority: 'critical'
            };
            
            // If this is the current ambulance's patient, show hospitals
            if (user?.role === 'ambulance_staff' && alertData.ambulanceId === user.ambulanceId) {
              setShowHospitals(true);
              setSelectedPatient(newPatient);
            }
            
            return [...prev, newPatient];
          }
          return prev;
        });
      });

      // Listen for vitals updates to track critical patients
      socketService.onVitalsUpdate((vitalsData) => {
        if (vitalsData.emergencyLevel === 'critical') {
          setCriticalPatients(prev => {
            const exists = prev.find(p => p.patientId === vitalsData.patientId);
            if (!exists) {
              const newPatient = {
                patientId: vitalsData.patientId,
                patientName: vitalsData.patientName,
                condition: 'Critical Condition',
                ambulanceId: vitalsData.ambulanceId,
                lat: vitalsData.location?.lat || (Math.random() * 0.02 + 18.51),
                lng: vitalsData.location?.lng || (Math.random() * 0.02 + 73.85),
                timestamp: vitalsData.timestamp,
                priority: 'critical',
                vitals: {
                  heartRate: vitalsData.heartRate,
                  spo2: vitalsData.spo2,
                  bloodPressure: vitalsData.bloodPressure
                }
              };
              
              // If this is the current ambulance's patient, show hospitals
              if (user?.role === 'ambulance_staff' && vitalsData.ambulanceId === user.ambulanceId) {
                setShowHospitals(true);
                setSelectedPatient(newPatient);
              }
              
              return [...prev, newPatient];
            }
            return prev;
          });
        }
      });
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, [user]);

  // Function for ambulance driver to mark patient as critical and see hospitals
  const markPatientCritical = () => {
    if (user?.role === 'ambulance_staff' && currentAmbulance) {
      const criticalPatient = {
        patientId: `PAT_CRITICAL_${Date.now()}`,
        patientName: 'Critical Patient',
        condition: 'EMERGENCY - Need Immediate Hospital',
        ambulanceId: currentAmbulance.id,
        lat: currentAmbulance.lat,
        lng: currentAmbulance.lng,
        timestamp: new Date().toISOString(),
        priority: 'critical'
      };
      
      setCriticalPatients(prev => [...prev, criticalPatient]);
      setShowHospitals(true);
      setSelectedPatient(criticalPatient);
      
      // Send emergency alert to hospital
      socketService.sendEmergencyAlert({
        patientName: 'Critical Patient',
        condition: 'Patient condition critical - Need immediate hospital transfer',
        ambulanceId: currentAmbulance.id,
        location: {
          lat: currentAmbulance.lat,
          lng: currentAmbulance.lng
        }
      });
      
      alert('🚨 Patient marked as CRITICAL! Nearby hospitals are now visible on map.');
    }
  };

  // Function to send location update (for ambulance drivers)
  const sendLocationUpdate = () => {
    if (user?.role === 'ambulance_staff' && currentAmbulance) {
      const newLocation = {
        ambulanceId: currentAmbulance.id,
        latitude: currentAmbulance.lat + (Math.random() * 0.001 - 0.0005),
        longitude: currentAmbulance.lng + (Math.random() * 0.001 - 0.0005),
        timestamp: new Date().toISOString(),
        speed: `${Math.floor(40 + Math.random() * 40)} km/h`
      };
      
      socketService.updateLocation(newLocation);
      alert('📍 Location update sent!');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">🗺️ Live Ambulance Tracking</h1>
            <p className="mt-2 opacity-90">
              {user?.role === 'ambulance_staff' 
                ? 'Driver View - Track your location and find nearby hospitals for critical patients'
                : 'Hospital View - Monitor all ambulances and critical patients'
              }
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
            {isConnected ? '✅ Live Updates' : '❌ Disconnected'}
          </div>
        </div>
        
        {/* Ambulance Driver Controls */}
        {user?.role === 'ambulance_staff' && (
          <div className="mt-4 bg-blue-700 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2">🚑 Ambulance Driver Controls</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={sendLocationUpdate}
                className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 font-semibold"
              >
                📍 Update My Location
              </button>
              <button
                onClick={markPatientCritical}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
              >
                🚨 Mark Patient Critical
              </button>
              {showHospitals && (
                <button
                  onClick={() => setShowHospitals(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold"
                >
                  ❌ Hide Hospitals
                </button>
              )}
            </div>
            {showHospitals && (
              <p className="text-sm mt-2 text-yellow-300">
                💡 <strong>CRITICAL MODE:</strong> Nearby hospitals are visible. Choose the nearest one for emergency transfer.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Ambulance List */}
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-xl font-bold mb-4">🚑 Ambulances</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.map(ambulance => (
                <div 
                  key={ambulance.id}
                  className={`p-3 border-2 rounded-lg ${
                    ambulance.status === 'on_mission' ? 'border-blue-300 bg-blue-50' :
                    ambulance.status === 'available' ? 'border-green-300 bg-green-50' :
                    'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{ambulance.name}</h3>
                      <p className={`text-sm font-medium ${
                        ambulance.status === 'on_mission' ? 'text-blue-600' :
                        ambulance.status === 'available' ? 'text-green-600' :
                        'text-yellow-600'
                      }`}>
                        {ambulance.status.replace('_', ' ').toUpperCase()}
                      </p>
                      {ambulance.patient && (
                        <p className="text-xs text-gray-600 mt-1">
                          Patient: {ambulance.patient}
                        </p>
                      )}
                    </div>
                    <div className="text-lg">
                      {ambulance.status === 'on_mission' ? '🚑' : '🚐'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Patients */}
          {criticalPatients.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-xl font-bold mb-4 text-red-600">🚨 Critical Patients</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {criticalPatients.map(patient => (
                  <div 
                    key={patient.patientId} 
                    className="p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <h3 className="font-semibold text-red-800">{patient.patientName}</h3>
                    <p className="text-sm text-red-700">{patient.condition}</p>
                    <p className="text-xs text-red-600">Ambulance: {patient.ambulanceId}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Hospitals (Only for ambulance drivers when showHospitals is true) */}
          {user?.role === 'ambulance_staff' && showHospitals && (
            <div className="bg-white rounded-lg border p-4 border-green-300">
              <h2 className="text-xl font-bold mb-4 text-green-600">🏥 Nearest Hospitals</h2>
              <div className="space-y-3">
                {nearbyHospitals.map(hospital => (
                  <div key={hospital.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800">{hospital.name}</h3>
                    <p className="text-sm text-green-700">Distance: {hospital.distance}</p>
                    <p className="text-xs text-green-600">Available Beds: {hospital.beds}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                💡 <strong>Emergency Protocol:</strong> Proceed to the nearest hospital immediately. 
                Notify hospital staff about critical patient arrival.
              </p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Live Tracking Map</h2>
              {user?.role === 'ambulance_staff' && showHospitals && (
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold animate-pulse">
                  🚨 CRITICAL PATIENT MODE
                </span>
              )}
            </div>
            
            <div style={{ width: '100%', height: '600px' }}>
              <MapContainer 
                center={[center.lat, center.lng]} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                {/* OpenStreetMap tile layer */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Ambulance Markers */}
                {locations.map(ambulance => (
                  <Marker 
                    key={ambulance.id} 
                    position={[ambulance.lat, ambulance.lng]}
                    icon={ambulanceIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <strong className="text-blue-600">{ambulance.name}</strong><br/>
                        Status: <span className={
                          ambulance.status === 'on_mission' ? 'text-blue-600 font-semibold' :
                          ambulance.status === 'available' ? 'text-green-600 font-semibold' :
                          'text-yellow-600 font-semibold'
                        }>
                          {ambulance.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {ambulance.patient && (
                          <><br/>Patient: <strong>{ambulance.patient}</strong></>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Critical Patient Markers */}
                {criticalPatients.map(patient => (
                  <Marker 
                    key={patient.patientId} 
                    position={[patient.lat, patient.lng]}
                    icon={criticalIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <strong className="text-red-600">🚨 CRITICAL PATIENT</strong><br/>
                        <strong>{patient.patientName}</strong><br/>
                        Condition: {patient.condition}<br/>
                        Ambulance: {patient.ambulanceId}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Hospital Markers (Only shown to ambulance drivers in critical mode) */}
                {user?.role === 'ambulance_staff' && showHospitals && nearbyHospitals.map(hospital => (
                  <Marker 
                    key={hospital.id} 
                    position={[hospital.lat, hospital.lng]}
                    icon={hospitalIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <strong className="text-green-600">🏥 {hospital.name}</strong><br/>
                        Distance: <strong>{hospital.distance}</strong><br/>
                        Available Beds: {hospital.beds}<br/>
                        <span className="text-xs text-green-600">
                          Emergency services available 24/7
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Map Legend */}
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Map Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🚑</span>
                  <span>Ambulance (On Mission)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🚨</span>
                  <span>Critical Patient</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏥</span>
                  <span>Hospital</span>
                </div>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🚐</span>
                  <span>Available Ambulance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}