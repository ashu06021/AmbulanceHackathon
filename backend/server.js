const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://ambulance-dashboard.onrender.com", "https://your-app-name.onrender.com"]
    : "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// =============================================
// SERVE REACT BUILD IN PRODUCTION
// =============================================

// Serve frontend build in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React build
  app.use(express.static(path.join(__dirname, "../client/build")));

  // Handle React routing, return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
  console.log('🚀 Production mode: Serving React build from ../client/build');
} else {
  console.log('🔧 Development mode: React app runs on separate port (3000)');
}

// =============================================
// API ROUTES
// =============================================

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend API is working!',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password });
  
  if ((username === 'hospital1' && password === 'password123') || 
      (username === 'ambulance1' && password === 'password123')) {
    
    const user = {
      id: 1,
      username: username,
      name: username === 'hospital1' ? 'Dr. Smith' : 'Paramedic John',
      role: username === 'hospital1' ? 'hospital_staff' : 'ambulance_staff',
      department: username === 'hospital1' ? 'Emergency Medicine' : 'Ambulance Service',
      ambulanceId: username === 'ambulance1' ? 'AMB007' : null
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      token: 'demo_jwt_token_2024',
      user: user
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// =============================================
// SOCKET.IO SECTION - FIXED DUPLICATE VITALS BUG
// =============================================

const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? ["https://ambulance-dashboard.onrender.com", "https://your-app-name.onrender.com"]
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected clients by role and track last transmissions
const connectedClients = {
  hospital: [],
  ambulance: []
};

const lastTransmissions = new Map(); // Track last transmission per ambulance

// Real-time vitals transmission - FIXED DUPLICATE VERSION
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Handle client role identification
  socket.on('identify', (userData) => {
    const role = userData.role;
    console.log(`👤 Client ${socket.id} identified as: ${role}`);
    
    if (role === 'hospital_staff') {
      connectedClients.hospital.push(socket.id);
      socket.join('hospital_room');
    } else if (role === 'ambulance_staff') {
      connectedClients.ambulance.push(socket.id);
      socket.join('ambulance_room');
    }
    
    console.log('📊 Connected clients:', {
      hospital: connectedClients.hospital.length,
      ambulance: connectedClients.ambulance.length
    });
  });

  // Handle manual vitals transmission from ambulance - FIXED DUPLICATE
  socket.on('transmit_vitals', (vitalsData) => {
    console.log('📊 Received vitals from ambulance:', vitalsData);
    
    // Create unique transmission ID to prevent duplicates
    const transmissionId = `${vitalsData.patientId}_${Date.now()}`;
    const lastTransmission = lastTransmissions.get(socket.id);
    
    // Check if this is a duplicate transmission (within 1 second)
    if (lastTransmission && lastTransmission.patientId === vitalsData.patientId && 
        Date.now() - lastTransmission.timestamp < 1000) {
      console.log('🔄 Skipping duplicate transmission from same ambulance');
      
      // Still send confirmation to ambulance
      socket.emit('vitals_received', {
        status: 'warning',
        message: 'Duplicate transmission skipped - please wait 1 second between transmissions',
        timestamp: new Date().toISOString(),
        transmissionId: transmissionId
      });
      return;
    }
    
    // Store this transmission
    lastTransmissions.set(socket.id, {
      patientId: vitalsData.patientId,
      timestamp: Date.now()
    });
    
    // Add emergency level classification
    const classifiedVitals = {
      ...vitalsData,
      emergencyLevel: classifyEmergencyLevel(vitalsData),
      timestamp: new Date().toISOString(),
      transmissionType: 'manual',
      transmissionId: transmissionId // Add unique transmission ID
    };
    
    // Broadcast to ALL hospital clients (ONCE)
    io.to('hospital_room').emit('vitals_update', classifiedVitals);
    console.log('📨 Sent vitals to hospital room - Transmission ID:', transmissionId);
    
    // Send confirmation back to ambulance
    socket.emit('vitals_received', {
      status: 'success',
      message: 'Vitals transmitted to hospital successfully',
      timestamp: new Date().toISOString(),
      transmissionId: transmissionId
    });
  });

  // Handle automatic simulation - FIXED DUPLICATE
  socket.on('start_vitals_simulation', (patientData) => {
    console.log('🔄 Starting simulation for:', patientData.patientName);
    
    // Clear any existing simulation for this socket
    if (socket.simulationInterval) {
      clearInterval(socket.simulationInterval);
      console.log('🛑 Cleared existing simulation');
    }
    
    let simulationCount = 0;
    const interval = setInterval(() => {
      simulationCount++;
      
      const simulatedVitals = {
        patientId: patientData.patientId || `PAT_SIM_${Math.random().toString(36).substr(2, 6)}`,
        patientName: patientData.patientName || 'Emergency Patient',
        heartRate: Math.floor(60 + Math.random() * 40),
        bloodPressure: {
          systolic: Math.floor(110 + Math.random() * 30),
          diastolic: Math.floor(70 + Math.random() * 20)
        },
        spo2: Math.floor(95 + Math.random() * 5),
        temperature: (36.5 + Math.random() * 1.5).toFixed(1),
        respiratoryRate: Math.floor(12 + Math.random() * 12),
        ambulanceId: patientData.ambulanceId || 'AMB001',
        paramedicName: patientData.paramedicName || 'Sujal Patil'
      };
      
      const transmissionId = `${simulatedVitals.patientId}_${Date.now()}_${simulationCount}`;
      
      const classifiedVitals = {
        ...simulatedVitals,
        emergencyLevel: classifyEmergencyLevel(simulatedVitals),
        timestamp: new Date().toISOString(),
        transmissionType: 'simulated',
        transmissionId: transmissionId,
        simulationCount: simulationCount
      };
      
      // Broadcast to hospital room (ONCE)
      io.to('hospital_room').emit('vitals_update', classifiedVitals);
      console.log(`🔄 Sent simulated vitals #${simulationCount} to hospital - ID:`, transmissionId);
      
    }, 3000); // Every 3 seconds

    socket.simulationInterval = interval;
    socket.simulationCount = 0;
    
    // Send simulation started confirmation
    socket.emit('simulation_started', {
      status: 'success',
      message: 'Vitals simulation started - transmitting every 3 seconds',
      patientData: patientData,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('stop_vitals_simulation', () => {
    if (socket.simulationInterval) {
      clearInterval(socket.simulationInterval);
      socket.simulationInterval = null;
      console.log('🛑 Simulation stopped for socket:', socket.id);
      
      // Send simulation stopped confirmation
      socket.emit('simulation_stopped', {
        status: 'success',
        message: 'Vitals simulation stopped',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle location updates
socket.on('update_location', (locationData) => {
  console.log('📍 Location update received:', locationData);
  
  const locationUpdate = {
    ...locationData,
    timestamp: new Date().toISOString(),
    socketId: socket.id
  };
  
  // Broadcast location to hospital
  socket.broadcast.emit('location_update', locationUpdate);
  console.log('🗺️ Location update sent to hospital');
});
    
  // Handle emergency alerts
  socket.on('emergency_alert', (alertData) => {
    console.log('🚨 Emergency alert received:', alertData);
    
    const alertWithTimestamp = {
      ...alertData,
      timestamp: new Date().toISOString(),
      alertId: `ALERT_${Date.now()}`,
      socketId: socket.id
    };
    
    // Broadcast emergency alert to hospital
    io.to('hospital_room').emit('emergency_alert', alertWithTimestamp);
    console.log('📢 Emergency alert sent to hospital - ID:', alertWithTimestamp.alertId);
    
    // Send confirmation back to ambulance
    socket.emit('emergency_alert_sent', {
      status: 'success',
      message: 'Emergency alert sent to hospital successfully',
      alertId: alertWithTimestamp.alertId,
      timestamp: new Date().toISOString()
    });
  });

  // Handle connection status check
  socket.on('check_connection', () => {
    socket.emit('connection_status', {
      status: 'connected',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      hospitalClients: connectedClients.hospital.length,
      ambulanceClients: connectedClients.ambulance.length
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    
    // Remove from connected clients
    connectedClients.hospital = connectedClients.hospital.filter(id => id !== socket.id);
    connectedClients.ambulance = connectedClients.ambulance.filter(id => id !== socket.id);
    
    // Clear transmission history
    lastTransmissions.delete(socket.id);
    
    // Stop any running simulation
    if (socket.simulationInterval) {
      clearInterval(socket.simulationInterval);
      socket.simulationInterval = null;
      console.log('🛑 Stopped simulation on disconnect');
    }
    
    console.log('📊 Remaining clients:', {
      hospital: connectedClients.hospital.length,
      ambulance: connectedClients.ambulance.length
    });
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });
});

// Emergency level classification function
function classifyEmergencyLevel(vitals) {
  let score = 0;
  
  // Heart rate check
  if (vitals.heartRate < 50 || vitals.heartRate > 130) score += 2;
  else if (vitals.heartRate < 60 || vitals.heartRate > 100) score += 1;
  
  // SpO2 check
  if (vitals.spo2 < 90) score += 2;
  else if (vitals.spo2 < 95) score += 1;
  
  // Blood pressure check (simplified)
  const systolic = vitals.bloodPressure?.systolic || vitals.bloodPressureSystolic;
  const diastolic = vitals.bloodPressure?.diastolic || vitals.bloodPressureDiastolic;
  
  if (systolic > 180 || systolic < 90 || diastolic > 120 || diastolic < 60) score += 2;
  else if (systolic > 140 || systolic < 100 || diastolic > 90 || diastolic < 70) score += 1;
  
  // Temperature check
  if (vitals.temperature > 39.5 || vitals.temperature < 35) score += 2;
  else if (vitals.temperature > 38 || vitals.temperature < 36) score += 1;
  
  // Respiratory rate check
  if (vitals.respiratoryRate < 10 || vitals.respiratoryRate > 30) score += 2;
  else if (vitals.respiratoryRate < 12 || vitals.respiratoryRate > 24) score += 1;
  
  // Determine level
  if (score >= 3) return 'critical';
  if (score >= 2) return 'moderate';
  return 'stable';
}

// Clean up old transmissions periodically (prevent memory leaks)
setInterval(() => {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  let cleanedCount = 0;
  
  for (const [socketId, transmission] of lastTransmissions.entries()) {
    if (transmission.timestamp < fifteenMinutesAgo) {
      lastTransmissions.delete(socketId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} old transmissions from memory`);
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚑 BACKEND SERVER RUNNING on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.IO ready for real-time communication`);
  console.log(`🛡️  Duplicate protection: ACTIVE`);
  
  if (process.env.NODE_ENV === "production") {
    console.log(`🚀 Production mode: Serving React app from same domain`);
  } else {
    console.log(`🔧 Development mode: React app runs on http://localhost:3000`);
  }
});