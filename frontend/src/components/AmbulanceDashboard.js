import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';

const AmbulanceDashboard = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [patientData, setPatientData] = useState({
    patientName: '',
    patientAge: '',
    condition: ''
  });
  const [vitals, setVitals] = useState({
    heartRate: 75,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    spo2: 98,
    temperature: 36.8,
    respiratoryRate: 16
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [transmissionStatus, setTransmissionStatus] = useState('');
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);

  // Hospital data with specialties and 24/7 status - YOUR ORIGINAL DATA
  const hospitals = [
    {
      id: 1,
      name: "City General Hospital",
      distance: "2.3 km",
      eta: "8 mins",
      is24x7: true,
      specialties: ["Cardiology", "Oncology", "Neurology", "Radiology", "Orthopaedics"],
      contact: "+1-555-0101",
      bedsAvailable: 12,
      emergencyCapacity: "High"
    },
    {
      id: 2,
      name: "Metropolitan Medical Center",
      distance: "4.1 km",
      eta: "12 mins",
      is24x7: true,
      specialties: ["Pediatrics", "Obstetrics & Gynecology", "Dermatology", "Cardiology"],
      contact: "+1-555-0102",
      bedsAvailable: 8,
      emergencyCapacity: "Medium"
    },
    {
      id: 3,
      name: "Unity Health Campus",
      distance: "3.7 km",
      eta: "10 mins",
      is24x7: false,
      specialties: ["Orthopaedics", "Ophthalmology", "Radiology", "Neurology"],
      contact: "+1-555-0103",
      bedsAvailable: 5,
      emergencyCapacity: "Medium"
    },
    {
      id: 4,
      name: "Riverside Emergency Hospital",
      distance: "5.2 km",
      eta: "14 mins",
      is24x7: true,
      specialties: ["Cardiology", "Neurology", "Radiology", "Orthopaedics", "Pediatrics"],
      contact: "+1-555-0104",
      bedsAvailable: 15,
      emergencyCapacity: "High"
    },
    {
      id: 5,
      name: "Sunrise Medical Institute",
      distance: "6.8 km",
      eta: "18 mins",
      is24x7: true,
      specialties: ["Oncology", "Obstetrics & Gynecology", "Dermatology", "Ophthalmology"],
      contact: "+1-555-0105",
      bedsAvailable: 6,
      emergencyCapacity: "Low"
    }
  ];

  // Specialty icons mapping
  const specialtyIcons = {
    "Cardiology": "❤️",
    "Oncology": "🦠",
    "Dermatology": "🔬",
    "Orthopaedics": "🦴",
    "Pediatrics": "👶",
    "Obstetrics & Gynecology": "👩",
    "Neurology": "🧠",
    "Ophthalmology": "👁️",
    "Radiology": "📡"
  };

  // Load critical alerts history from localStorage
  useEffect(() => {
    const savedAlerts = localStorage.getItem('ambulanceCriticalAlerts');
    if (savedAlerts) {
      setCriticalAlerts(JSON.parse(savedAlerts));
    }
  }, []);

  useEffect(() => {
    console.log('🚑 Ambulance Dashboard mounted');
    
    // Connect to Socket.IO with ambulance role
    const socket = socketService.connect('ambulance_staff');
    
    if (socket) {
      socket.on('connect', () => {
        console.log('✅ Ambulance socket connected');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ Ambulance socket disconnected');
        setIsConnected(false);
      });

      socketService.onVitalsReceived((data) => {
        setTransmissionStatus(`✅ ${data.message} at ${new Date(data.timestamp).toLocaleTimeString()}`);
        console.log('📨 Vitals transmission confirmed:', data);
      });
    }

    return () => {
      console.log('🚑 Ambulance Dashboard unmounting');
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  const handleVitalChange = (field, value) => {
    setVitals(prev => ({
      ...prev,
      [field]: parseInt(value) || value
    }));
  };

  const transmitVitals = () => {
    const vitalsData = {
      patientId: `PAT_${Date.now()}`,
      patientName: patientData.patientName || 'Unknown Patient',
      ...vitals,
      bloodPressure: {
        systolic: vitals.bloodPressureSystolic,
        diastolic: vitals.bloodPressureDiastolic
      },
      ambulanceId: user?.ambulanceId || 'AMB001',
      paramedicName: 'Sujal Patil',
      timestamp: new Date().toISOString(),
      emergencyLevel: calculateEmergencyLevel(vitals)
    };

    socketService.transmitVitals(vitalsData);
    setTransmissionStatus('🔄 Transmitting vitals...');
  };

  const calculateEmergencyLevel = (vitals) => {
    if (vitals.heartRate < 50 || vitals.heartRate > 140 || 
        vitals.spo2 < 90 || vitals.bloodPressureSystolic < 90 || 
        vitals.bloodPressureSystolic > 180) {
      return 'critical';
    } else if (vitals.heartRate < 60 || vitals.heartRate > 120 || 
               vitals.spo2 < 95) {
      return 'moderate';
    }
    return 'stable';
  };

  const toggleSimulation = () => {
    if (!isSimulating) {
      socketService.startVitalsSimulation({
        patientId: `PAT_SIM_${Date.now()}`,
        patientName: patientData.patientName || 'Simulation Patient',
        patientAge: patientData.patientAge,
        condition: patientData.condition
      });
      setIsSimulating(true);
      setTransmissionStatus('🔄 Simulation started - transmitting vitals every 3 seconds');
    } else {
      socketService.stopVitalsSimulation();
      setIsSimulating(false);
      setTransmissionStatus('🛑 Simulation stopped');
    }
  };

  const sendEmergencyAlert = () => {
    const emergencyData = {
      patientName: patientData.patientName || 'Emergency Patient',
      condition: patientData.condition || 'Critical condition',
      location: 'Ambulance in transit',
      priority: 'high',
      ambulanceId: user?.ambulanceId || 'AMB001',
      patientId: `PAT_EMG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      vitals: vitals,
      paramedicName: 'Sujal Patil'
    };

    socketService.sendEmergencyAlert(emergencyData);
    setTransmissionStatus('🚨 EMERGENCY ALERT SENT TO HOSPITAL!');
    
    // Add to critical alerts history
    const newAlert = {
      ...emergencyData,
      id: Date.now(),
      status: 'active',
      sentAt: new Date().toLocaleTimeString()
    };
    
    const updatedAlerts = [newAlert, ...criticalAlerts.slice(0, 9)];
    setCriticalAlerts(updatedAlerts);
    localStorage.setItem('ambulanceCriticalAlerts', JSON.stringify(updatedAlerts));
    
    setActiveEmergency(newAlert);
  };

  const resolveEmergency = () => {
    if (activeEmergency) {
      const updatedAlerts = criticalAlerts.map(alert => 
        alert.id === activeEmergency.id 
          ? { ...alert, status: 'resolved', resolvedAt: new Date().toLocaleTimeString() }
          : alert
      );
      setCriticalAlerts(updatedAlerts);
      localStorage.setItem('ambulanceCriticalAlerts', JSON.stringify(updatedAlerts));
      setActiveEmergency(null);
      setTransmissionStatus('✅ Emergency resolved and marked in history');
    }
  };

  const clearAlertHistory = () => {
    setCriticalAlerts([]);
    localStorage.removeItem('ambulanceCriticalAlerts');
  };

  const getCapacityColor = (capacity) => {
    switch (capacity) {
      case 'High': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-orange-600 bg-orange-100';
      case 'Low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-2xl shadow-lg mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">🚑 Ambulance Dashboard</h1>
            <p className="text-blue-100 text-lg">Welcome, Sujal Patil | {user?.ambulanceId || 'AMB007'}</p>
            <p className="text-blue-200">Real-time patient monitoring & transmission</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isConnected ? '✅ Live Connected' : '❌ Disconnected'}
          </div>
        </div>
      </div>

      {/* Transmission Status */}
      {transmissionStatus && (
        <div className={`p-4 rounded-xl mb-6 shadow-md ${
          transmissionStatus.includes('🚨') ? 'bg-red-50 border-l-4 border-red-500 text-red-700' :
          transmissionStatus.includes('✅') ? 'bg-green-50 border-l-4 border-green-500 text-green-700' :
          'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
        }`}>
          <div className="flex items-center">
            <span className="text-lg mr-3">
              {transmissionStatus.includes('🚨') ? '🚨' : 
               transmissionStatus.includes('✅') ? '✅' : '🔄'}
            </span>
            <span className="font-medium">{transmissionStatus}</span>
          </div>
        </div>
      )}

      {/* Active Emergency Banner */}
      {activeEmergency && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-5 rounded-2xl shadow-lg mb-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold mb-2">🚨 ACTIVE EMERGENCY</h3>
              <p><strong>Patient:</strong> {activeEmergency.patientName}</p>
              <p><strong>Condition:</strong> {activeEmergency.condition}</p>
              <p><strong>Sent:</strong> {activeEmergency.sentAt}</p>
              <p><strong>By:</strong> Sujal Patil</p>
            </div>
            <button
              onClick={resolveEmergency}
              className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors"
            >
              ✅ Resolve Emergency
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Patient Info & Controls */}
        <div className="xl:col-span-2 space-y-6">
          {/* Patient Information */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
                <input
                  type="text"
                  value={patientData.patientName}
                  onChange={(e) => setPatientData(prev => ({...prev, patientName: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={patientData.patientAge}
                  onChange={(e) => setPatientData(prev => ({...prev, patientAge: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <input
                  type="text"
                  value={patientData.condition}
                  onChange={(e) => setPatientData(prev => ({...prev, condition: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter condition"
                />
              </div>
            </div>
          </div>

          {/* Vitals Input */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Vital Signs Monitor
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Heart Rate', field: 'heartRate', unit: 'bpm', color: 'text-red-500' },
                { label: 'SpO₂', field: 'spo2', unit: '%', color: 'text-green-500' },
                { label: 'Systolic BP', field: 'bloodPressureSystolic', unit: 'mmHg', color: 'text-purple-500' },
                { label: 'Diastolic BP', field: 'bloodPressureDiastolic', unit: 'mmHg', color: 'text-purple-500' },
                { label: 'Temperature', field: 'temperature', unit: '°C', color: 'text-orange-500' },
                { label: 'Respiratory Rate', field: 'respiratoryRate', unit: 'bpm', color: 'text-blue-500' }
              ].map(({ label, field, unit, color }) => (
                <div key={field} className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input
                    type="number"
                    value={vitals[field]}
                    onChange={(e) => handleVitalChange(field, e.target.value)}
                    className={`w-full border border-gray-300 rounded-xl px-3 py-3 text-center font-semibold text-lg ${color} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                  <div className="text-xs text-gray-500 mt-1">{unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
              Transmission Controls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={transmitVitals}
                disabled={!isConnected}
                className="bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md flex items-center justify-center space-x-2"
              >
                <span>📤</span>
                <span>Transmit Vitals</span>
              </button>
              
              <button
                onClick={toggleSimulation}
                disabled={!isConnected}
                className={`px-6 py-4 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md flex items-center justify-center space-x-2 ${
                  isSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <span>{isSimulating ? '🛑' : '🔄'}</span>
                <span>{isSimulating ? 'Stop Sim' : 'Start Sim'}</span>
              </button>
              
              <button
                onClick={sendEmergencyAlert}
                disabled={!isConnected}
                className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md flex items-center justify-center space-x-2"
              >
                <span>🚨</span>
                <span>Emergency Alert</span>
              </button>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="font-semibold">Manual Transmission</p>
                <p>Send current vitals once</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="font-semibold">Simulation Mode</p>
                <p>Auto-send every 3 seconds</p>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="font-semibold">Emergency Alert</p>
                <p>Immediate hospital notification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Vitals Display, History & Hospitals */}
        <div className="space-y-6">
          {/* Current Vitals Display */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></span>
              Current Vitals
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Heart Rate', value: vitals.heartRate, unit: 'bpm', color: 'border-red-200 bg-red-50' },
                { label: 'SpO₂', value: vitals.spo2, unit: '%', color: 'border-green-200 bg-green-50' },
                { label: 'Blood Pressure', value: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`, unit: 'mmHg', color: 'border-purple-200 bg-purple-50' },
                { label: 'Temperature', value: vitals.temperature, unit: '°C', color: 'border-orange-200 bg-orange-50' },
                { label: 'Resp. Rate', value: vitals.respiratoryRate, unit: 'bpm', color: 'border-blue-200 bg-blue-50' },
                { label: 'Status', value: isConnected ? 'Online' : 'Offline', unit: '', color: isConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50' }
              ].map(({ label, value, unit, color }) => (
                <div key={label} className={`border-2 rounded-xl p-3 text-center ${color}`}>
                  <div className="text-lg font-bold text-gray-800">{value}</div>
                  <div className="text-xs text-gray-600">{label}</div>
                  {unit && <div className="text-xs text-gray-500">{unit}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Critical Alerts History */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Alert History
              </h2>
              {criticalAlerts.length > 0 && (
                <button
                  onClick={clearAlertHistory}
                  className="text-xs bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {criticalAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No alert history</p>
                  <p className="text-sm">Emergency alerts will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {criticalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`border-l-4 rounded-r-lg p-3 ${
                        alert.status === 'active' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{alert.patientName}</p>
                          <p className="text-sm text-gray-600">{alert.condition}</p>
                          <p className="text-xs text-gray-500">Sent: {alert.sentAt}</p>
                          <p className="text-xs text-blue-600">By: Paramedic John</p>
                          {alert.resolvedAt && (
                            <p className="text-xs text-green-600">Resolved: {alert.resolvedAt}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          alert.status === 'active' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                        }`}>
                          {alert.status === 'active' ? 'ACTIVE' : 'RESOLVED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hospital Information - YOUR ORIGINAL LAYOUT */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Nearby Hospitals
              </h2>
              <span className="text-sm text-gray-500">{hospitals.length} hospitals</span>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-4">
              {hospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className={`border-2 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer ${
                    hospital.is24x7 
                      ? 'border-green-300 bg-green-50 hover:border-green-400' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  } ${
                    selectedHospital?.id === hospital.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedHospital(hospital)}
                >
                  {/* Hospital Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{hospital.name}</h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-gray-600">📍 {hospital.distance} • ⏱️ {hospital.eta}</span>
                        {hospital.is24x7 && (
                          <span className="flex items-center text-green-600 text-sm font-semibold">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            24/7
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${getCapacityColor(hospital.emergencyCapacity)}`}>
                      {hospital.emergencyCapacity}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {hospital.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium"
                          title={specialty}
                        >
                          <span className="mr-1">{specialtyIcons[specialty]}</span>
                          {specialty.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hospital Details */}
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span>🛏️ {hospital.bedsAvailable} beds</span>
                      <span>📞 {hospital.contact}</span>
                    </div>
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Here you would implement navigation or communication
                        console.log(`Navigating to ${hospital.name}`);
                      }}
                    >
                      Navigate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Hospital Details */}
            {selectedHospital && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Selected: {selectedHospital.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Distance:</strong> {selectedHospital.distance}</div>
                  <div><strong>ETA:</strong> {selectedHospital.eta}</div>
                  <div><strong>Beds Available:</strong> {selectedHospital.bedsAvailable}</div>
                  <div><strong>Contact:</strong> {selectedHospital.contact}</div>
                </div>
                <div className="mt-2">
                  <strong>Full Specialties:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedHospital.specialties.map((specialty, index) => (
                      <span key={index} className="text-xs bg-white px-2 py-1 rounded border">
                        {specialtyIcons[specialty]} {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceDashboard;