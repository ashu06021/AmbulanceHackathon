import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  // ==============================
  // 🔌 CONNECT TO BACKEND
  // ==============================
  connect(userRole = null) {
    try {
      this.socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to backend via Socket.IO');
        this.isConnected = true;

        // Identify the user's role (e.g., "ambulance" or "hospital")
        if (userRole) {
          this.socket.emit('identify', { role: userRole });
        }
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from backend');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('⚠️ Socket connection error:', error);
        this.isConnected = false;
      });

      return this.socket;
    } catch (error) {
      console.error('❌ Socket initialization error:', error);
      return null;
    }
  }

  // ==============================
  // 📡 DATA TRANSMISSION METHODS
  // ==============================

  // Send vitals data from ambulance
  transmitVitals(vitalsData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('transmit_vitals', vitalsData);
      console.log('📤 Transmitting vitals to hospital:', vitalsData);
    } else {
      console.error('❌ Socket not connected - cannot transmit vitals');
    }
  }

  // Start automatic vitals simulation (optional for testing)
  startVitalsSimulation(patientData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('start_vitals_simulation', patientData);
      console.log('🔄 Starting vitals simulation:', patientData);
    }
  }

  // Stop vitals simulation
  stopVitalsSimulation() {
    if (this.socket && this.isConnected) {
      this.socket.emit('stop_vitals_simulation');
      console.log('🛑 Stopping vitals simulation');
    }
  }

  // Update ambulance location in real time
  updateLocation(locationData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_location', locationData);
      console.log('📍 Updating location:', locationData);
    }
  }

  // Send emergency alert from ambulance
  sendEmergencyAlert(alertData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('emergency_alert', alertData);
      console.log('🚨 Sending emergency alert:', alertData);
    }
  }

  // Send critical patient alert
  sendCriticalAlert(patientData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('critical_patient_alert', {
        ...patientData,
        alertId: `ALERT_${Date.now()}`,
        timestamp: new Date().toISOString()
      });
      console.log('🚨 Critical patient alert sent:', patientData);
    }
  }

  // Acknowledge emergency alert (from hospital to ambulance)
  acknowledgeEmergencyAlert(alertData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('emergency_alert_ack', {
        ...alertData,
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: 'hospital'
      });
      console.log('✅ Emergency alert acknowledged:', alertData);
    }
  }

  // ==============================
  // 🔔 EVENT LISTENERS
  // ==============================

  // Listen for vitals updates (Hospital)
  onVitalsUpdate(callback) {
    if (this.socket) {
      this.socket.on('vitals_update', callback);
    }
  }

  // Listen for vitals confirmation (Ambulance)
  onVitalsReceived(callback) {
    if (this.socket) {
      this.socket.on('vitals_received', callback);
    }
  }

  // Listen for real-time location updates
  onLocationUpdate(callback) {
    if (this.socket) {
      this.socket.on('location_update', callback);
      console.log('📍 Location update listener registered');
    }
  }

  // Listen for emergency alerts (Hospital side)
  onEmergencyAlert(callback) {
    if (this.socket) {
      this.socket.on('emergency_alert', callback);
    }
  }

  // Listen for emergency alert acknowledgments
  onEmergencyAlertAck(callback) {
    if (this.socket) {
      this.socket.on('emergency_alert_ack', callback);
    }
  }

  // Listen for critical patient alerts (Hospital)
  onCriticalAlert(callback) {
    if (this.socket) {
      this.socket.on('critical_patient_alert', callback);
    }
  }

  // ==============================
  // 🧹 CLEANUP METHODS
  // ==============================

  // Remove all active listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      console.log('🧹 All socket listeners removed');
    }
  }

  // Disconnect socket safely
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('🔌 Socket disconnected');
    }
  }
}

export default new SocketService();
