import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';

const HospitalDashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('patients');

  // Use a ref to track processed patient IDs to prevent duplicates
  const processedPatientIds = useRef(new Set());
  const audioRef = useRef(null);

  // Load alert history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('hospitalAlertHistory');
    if (savedHistory) {
      setAlertHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    console.log('🏥 Hospital Dashboard mounted - setting up socket listeners');
    
    // Connect to socket with hospital role
    const socket = socketService.connect('hospital_staff');
    
    if (socket) {
      socket.on('connect', () => {
        console.log('✅ Hospital socket connected');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ Hospital socket disconnected');
        setIsConnected(false);
      });

      // Listen for real-time vitals updates - FIXED DUPLICATE BUG
      socketService.onVitalsUpdate((vitalsData) => {
        console.log('📊 Hospital received vitals update:', vitalsData);
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Create a unique key for this patient transmission
        const patientKey = `${vitalsData.patientId}_${vitalsData.timestamp}`;
        
        // Check if we've already processed this exact transmission
        if (processedPatientIds.current.has(patientKey)) {
          console.log('🔄 Skipping duplicate vitals update:', patientKey);
          return; // Skip duplicate
        }
        
        // Mark this transmission as processed
        processedPatientIds.current.add(patientKey);
        
        setPatients(prev => {
          // Use patientId as the main identifier (not patientKey)
          const existingIndex = prev.findIndex(p => p.patientId === vitalsData.patientId);
          
          if (existingIndex >= 0) {
            // Update existing patient - REPLACE, don't add new
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...vitalsData,
              lastUpdate: new Date().toLocaleTimeString(),
              updateCount: (updated[existingIndex].updateCount || 0) + 1
            };
            console.log('✅ Updated existing patient:', vitalsData.patientName);
            return updated;
          } else {
            // Add new patient with unique ID
            const newPatient = {
              ...vitalsData,
              lastUpdate: new Date().toLocaleTimeString(),
              admitted: false,
              updateCount: 1,
              uniqueId: vitalsData.patientId // Use patientId as unique identifier
            };
            console.log('➕ Added new patient:', vitalsData.patientName);
            return [...prev, newPatient];
          }
        });

        // If critical, add to emergency alerts (with duplicate check)
        if (vitalsData.emergencyLevel === 'critical') {
          setEmergencyAlerts(prev => {
            const alertKey = `${vitalsData.patientId}_${vitalsData.timestamp}`;
            const isDuplicate = prev.some(alert => 
              alert.patientId === vitalsData.patientId && 
              alert.timestamp === vitalsData.timestamp
            );
            
            if (!isDuplicate) {
              console.log('🚨 Critical patient alert added');
              
              // Play alert sound
              playAlertSound();
              
              // Add to alert history
              addToAlertHistory({
                ...vitalsData,
                type: 'critical_vitals',
                status: 'active',
                receivedAt: new Date().toLocaleTimeString()
              });
              
              return [vitalsData, ...prev.slice(0, 4)];
            }
            return prev;
          });
        }
      });

      // Listen for emergency alerts
      socketService.onEmergencyAlert((alertData) => {
        console.log('🚨 Hospital received emergency alert:', alertData);
        
        // Check for duplicate emergency alerts
        setEmergencyAlerts(prev => {
          const isDuplicate = prev.some(alert => 
            alert.alertId === alertData.alertId || 
            (alert.patientId === alertData.patientId && alert.timestamp === alertData.timestamp)
          );
          
          if (!isDuplicate) {
            // Play emergency sound
            playEmergencySound();
            
            // Add to alert history
            addToAlertHistory({
              ...alertData,
              type: 'emergency_alert',
              status: 'active',
              receivedAt: new Date().toLocaleTimeString()
            });
            
            return [alertData, ...prev.slice(0, 4)];
          }
          return prev;
        });
        
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('🚨 EMERGENCY ALERT', {
            body: `Patient: ${alertData.patientName}\nCondition: ${alertData.condition}\nAmbulance: ${alertData.ambulanceId}`,
            icon: '/ambulance-icon.png',
            requireInteraction: true
          });
        }
        
       
      });
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup processed IDs periodically to prevent memory leaks
    const cleanupInterval = setInterval(() => {
      // Keep only IDs from last 10 minutes to prevent memory issues
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      processedPatientIds.current = new Set(
        Array.from(processedPatientIds.current).filter(id => {
          const timestamp = parseInt(id.split('_').pop());
          return timestamp > tenMinutesAgo;
        })
      );
    }, 60000); // Clean every minute

    return () => {
      console.log('🏥 Hospital Dashboard unmounting - cleaning up listeners');
      socketService.removeAllListeners();
      clearInterval(cleanupInterval);
    };
  }, []);

  const playAlertSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/250/250-preview.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.log('Sound error:', error);
    }
  };

  const playEmergencySound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/250/250-preview.mp3');
      audio.volume = 0.7;
      audio.play().catch(e => console.log('Emergency audio play failed:', e));
    } catch (error) {
      console.log('Emergency sound error:', error);
    }
  };

  const addToAlertHistory = (alert) => {
    const newHistory = [alert, ...alertHistory.slice(0, 49)]; // Keep last 50 alerts
    setAlertHistory(newHistory);
    localStorage.setItem('hospitalAlertHistory', JSON.stringify(newHistory));
  };

  const admitPatient = (patientId) => {
    setPatients(prev => 
      prev.map(patient => 
        patient.patientId === patientId 
          ? { ...patient, admitted: true, admittedBy: user?.name, admittedAt: new Date().toLocaleTimeString() }
          : patient
      )
    );
    console.log('✅ Admitted patient:', patientId);
  };

  const dismissAlert = (index) => {
    const dismissedAlert = emergencyAlerts[index];
    setEmergencyAlerts(prev => prev.filter((_, i) => i !== index));
    
    // Update alert history status
    if (dismissedAlert) {
      const updatedHistory = alertHistory.map(alert => 
        alert.patientId === dismissedAlert.patientId && alert.status === 'active'
          ? { ...alert, status: 'dismissed', dismissedAt: new Date().toLocaleTimeString() }
          : alert
      );
      setAlertHistory(updatedHistory);
      localStorage.setItem('hospitalAlertHistory', JSON.stringify(updatedHistory));
    }
  };

  const clearAllPatients = () => {
    setPatients([]);
    processedPatientIds.current.clear();
    console.log('🗑️ Cleared all patients');
  };

  const clearAlertHistory = () => {
    setAlertHistory([]);
    localStorage.removeItem('hospitalAlertHistory');
  };

  const getEmergencyColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'moderate': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'stable': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getVitalStatus = (patient) => {
    if (patient.heartRate < 50 || patient.heartRate > 140 || patient.spo2 < 90) return 'critical';
    if (patient.heartRate < 60 || patient.heartRate > 120 || patient.spo2 < 95) return 'moderate';
    return 'stable';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-8 rounded-2xl shadow-lg mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-3">🏥 Hospital Dashboard</h1>
            <p className="text-green-100 text-xl">Welcome, Dr. {user?.name} | {user?.department}</p>
            <p className="text-green-200">Real-time patient monitoring system</p>
          </div>
          <div className={`px-5 py-3 rounded-full text-sm font-semibold shadow-md ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
            {isConnected ? '✅ Live Connected' : '❌ Disconnected'}
          </div>
        </div>
        {lastUpdate && (
          <p className="text-green-200 mt-3 text-sm">Last update: {lastUpdate}</p>
        )}
      </div>

      {/* Emergency Alerts */}
      {emergencyAlerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center">
            🚨 Emergency Alerts 
            <span className="ml-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              {emergencyAlerts.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyAlerts.map((alert, index) => (
              <div key={alert.alertId || `alert_${index}`} className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl p-5 shadow-lg animate-pulse">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl mb-2">{alert.patientName}</h3>
                    <p className="font-semibold text-lg">{alert.condition}</p>
                    <p className="text-red-100">Ambulance: {alert.ambulanceId}</p>
                    <p className="text-red-200 text-sm mt-2">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => dismissAlert(index)}
                    className="bg-white text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-50 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('patients')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeTab === 'patients' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            👥 Active Patients ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeTab === 'history' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📋 Alert History ({alertHistory.length})
          </button>
        </div>
      </div>

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Active Patient Monitoring</h2>
            <div className="flex items-center space-x-4">
              <div className="bg-white px-4 py-2 rounded-xl border border-gray-300 shadow-sm">
                <span className="text-sm text-gray-600">Monitoring </span>
                <span className="font-bold text-blue-600">{patients.length}</span>
                <span className="text-sm text-gray-600"> patient(s)</span>
              </div>
              {patients.length > 0 && (
                <button
                  onClick={clearAllPatients}
                  className="bg-gray-500 text-white px-4 py-2 rounded-xl hover:bg-gray-600 transition-colors font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {patients.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center shadow-sm">
              <div className="text-8xl mb-6 text-gray-400">📊</div>
              <h3 className="text-2xl font-semibold text-gray-600 mb-4">No Active Patients</h3>
              <p className="text-gray-500 mb-6 text-lg">Waiting for ambulance transmissions...</p>
              <div className="text-gray-400 space-y-2 max-w-md mx-auto">
                <p className="flex items-center justify-center">
                  <span className="mr-2">💡</span>
                  Make sure ambulance staff are logged in and transmitting data
                </p>
                <p className="flex items-center justify-center">
                  <span className="mr-2">💡</span>
                  Check that both systems are connected to the backend
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {patients.map((patient) => {
                const emergencyLevel = patient.emergencyLevel || getVitalStatus(patient);
                return (
                  <div key={patient.patientId} className={`bg-white rounded-2xl border-2 p-5 shadow-lg transition-all hover:shadow-xl ${getEmergencyColor(emergencyLevel)}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-xl text-gray-800">{patient.patientName}</h3>
                        <p className="text-gray-600">
                          Ambulance: <span className="font-semibold">{patient.ambulanceId || 'Unknown'}</span>
                        </p>
                        {patient.paramedicName && (
                          <p className="text-sm text-gray-500">Paramedic: {patient.paramedicName}</p>
                        )}
                        <p className="text-xs text-blue-500 mt-2">
                          Updates: {patient.updateCount || 1} | ID: {patient.patientId}
                        </p>
                      </div>
                      <span className={`px-3 py-2 rounded-full text-xs font-bold ${
                        emergencyLevel === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                        emergencyLevel === 'moderate' ? 'bg-orange-500 text-white' :
                        'bg-green-500 text-white'
                      }`}>
                        {emergencyLevel.toUpperCase()}
                      </span>
                    </div>

                    {/* Vitals Display */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        { label: 'Heart Rate', value: patient.heartRate, unit: 'bpm', color: 'border-red-200' },
                        { label: 'SpO₂', value: patient.spo2, unit: '%', color: 'border-green-200' },
                        { label: 'Blood Pressure', value: `${patient.bloodPressure?.systolic || patient.bloodPressureSystolic}/${patient.bloodPressure?.diastolic || patient.bloodPressureDiastolic}`, unit: 'mmHg', color: 'border-purple-200' },
                        { label: 'Temperature', value: patient.temperature, unit: '°C', color: 'border-orange-200' }
                      ].map(({ label, value, unit, color }) => (
                        <div key={label} className={`border-2 rounded-xl p-3 text-center bg-white ${color}`}>
                          <div className="text-lg font-bold text-gray-800">{value}</div>
                          <div className="text-xs text-gray-600">{label}</div>
                          <div className="text-xs text-gray-500">{unit}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-sm border-t pt-3">
                      <span className="text-gray-500">Updated: {patient.lastUpdate}</span>
                      {!patient.admitted ? (
                        <button
                          onClick={() => admitPatient(patient.patientId)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-semibold transition-colors"
                        >
                          Admit Patient
                        </button>
                      ) : (
                        <span className="text-green-600 font-semibold flex items-center">
                          ✅ Admitted by {patient.admittedBy}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Alert History Tab */}
      {activeTab === 'history' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Alert History</h2>
            {alertHistory.length > 0 && (
              <button
                onClick={clearAlertHistory}
                className="bg-gray-500 text-white px-4 py-2 rounded-xl hover:bg-gray-600 transition-colors font-semibold"
              >
                Clear History
              </button>
            )}
          </div>

          {alertHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center shadow-sm">
              <div className="text-8xl mb-6 text-gray-400">📋</div>
              <h3 className="text-2xl font-semibold text-gray-600 mb-4">No Alert History</h3>
              <p className="text-gray-500 mb-6 text-lg">Emergency alerts and critical vitals will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Condition</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alertHistory.map((alert, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{alert.patientName}</div>
                          <div className="text-sm text-gray-500">{alert.ambulanceId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.type === 'emergency_alert' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {alert.type === 'emergency_alert' ? '🚨 EMERGENCY' : '⚠️ CRITICAL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.condition}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.status === 'active' ? 'ACTIVE' : 'DISMISSED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alert.receivedAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Status */}
      <div className="bg-white rounded-2xl border p-6 shadow-md mt-6">
        <h3 className="font-semibold text-lg mb-4 text-gray-800">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className={`flex items-center p-3 rounded-xl ${isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected ? 'Real-time Connection Active' : 'Connection Lost'}
          </div>
          <div className="flex items-center p-3 rounded-xl bg-blue-50 text-blue-700">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            Monitoring {patients.length} patient(s)
          </div>
          <div className="flex items-center p-3 rounded-xl bg-red-50 text-red-700">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
            {emergencyAlerts.length} active alert(s)
          </div>
          <div className="flex items-center p-3 rounded-xl bg-purple-50 text-purple-700">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
            {alertHistory.length} historical alerts
          </div>
        </div>
        
        {/* Debug Information */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl text-xs text-gray-600">
          <p><strong>Debug Info:</strong> Socket connected: {isConnected ? 'Yes' : 'No'} | Patients in state: {patients.length}</p>
          <p>Backend: http://localhost:5000 | Last vitals received: {lastUpdate || 'Never'}</p>
          <p>Duplicate protection: Active (processed {processedPatientIds.current.size} transmissions)</p>
        </div>
      </div>

      {/* Hidden audio element for emergency sounds */}
      <audio ref={audioRef} preload="auto">
        <source src="https://assets.mixkit.co/active_storage/sfx/250/250-preview.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
};

export default HospitalDashboard;