import React, { useState, useEffect } from "react";
import { patientService } from "../services/api";
import socketService from "../services/socket";
import { EncryptionService, DataSimulator } from "../utils/encryption";
import PatientCard from "../components/PatientCard";
import VitalsChart from "../components/VitalsChart";

const Dashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Load patients & setup live socket connection
  useEffect(() => {
    loadPatients();
    setupSocketConnection();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Fetch patient data from backend
  const loadPatients = async () => {
    try {
      const response = await patientService.getAll();
      setPatients(response.data);
    } catch (error) {
      console.error("❌ Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  // Setup socket listeners for real-time updates
  const setupSocketConnection = async () => {
    try {
      await socketService.connect();
      console.log("✅ Socket connected to backend for real-time vitals");

      // Live patient vitals update listener
      socketService.on("patient_vitals_update", (encryptedData) => {
        try {
          const decryptedData = EncryptionService.decrypt(encryptedData);
          console.log("📡 Live vitals received:", decryptedData);
          updatePatientVitals(decryptedData.patient);
        } catch (error) {
          console.error("❌ Error processing vitals update:", error);
        }
      });

      // Critical patient alert listener
      socketService.on("critical_alert", (alert) => {
        console.warn("🚨 Critical alert received:", alert);
        alertBrowserNotification(alert);
      });
    } catch (error) {
      console.error("Socket connection error:", error);
    }
  };

  // Update patient vitals in state
  const updatePatientVitals = (updatedPatient) => {
    setPatients((prevPatients) =>
      prevPatients.map((patient) =>
        patient._id === updatedPatient._id ? updatedPatient : patient
      )
    );

    // Auto-refresh chart if same patient selected
    if (selectedPatient && selectedPatient._id === updatedPatient._id) {
      setSelectedPatient(updatedPatient);
    }
  };

  // Browser alert for doctor when critical
  const alertBrowserNotification = (alert) => {
    if (Notification.permission === "granted") {
      new Notification("🚨 Critical Patient Alert", {
        body: `${alert.patientName} - ${alert.emergencyLevel.toUpperCase()} level`,
      });
    }
  };

  // Simulate ambulance data (for testing)
  const simulateVitalsTransmission = () => {
    if (patients.length === 0) return;

    const randomPatient = patients[Math.floor(Math.random() * patients.length)];
    const simulatedData = DataSimulator.generateVitals(randomPatient._id);

    try {
      const encryptedData = EncryptionService.encrypt(simulatedData);
      socketService.emit("transmit_vitals", encryptedData);
      console.log("🚑 Simulated vitals sent:", simulatedData);
    } catch (error) {
      console.error("❌ Error transmitting vitals:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🚑 Patient Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time monitoring of ambulance patients
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={simulateVitalsTransmission}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Simulate Vitals Update
          </button>

          <div className="bg-white px-4 py-2 rounded border text-center">
            <div className="text-sm text-gray-600">Total Patients</div>
            <div className="text-xl font-bold">{patients.length}</div>
          </div>
        </div>
      </div>

      {/* Emergency Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          color="red"
          label="Critical"
          count={patients.filter((p) => p.emergencyLevel === "critical").length}
        />
        <SummaryCard
          color="orange"
          label="Moderate"
          count={patients.filter((p) => p.emergencyLevel === "moderate").length}
        />
        <SummaryCard
          color="green"
          label="Stable"
          count={patients.filter((p) => p.emergencyLevel === "stable").length}
        />
      </div>

      {/* Main Grid - Patients List + Vitals Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Active Patients</h2>
          {patients.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-gray-500">
                No patients currently being monitored
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((patient) => (
                <PatientCard
                  key={patient._id}
                  patient={patient}
                  onSelect={setSelectedPatient}
                />
              ))}
            </div>
          )}
        </div>

        {/* Live Vitals Chart */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Vitals Monitoring</h2>
          <div className="bg-white rounded-lg border p-4">
            {selectedPatient ? (
              <VitalsChart patient={selectedPatient} />
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select a patient to view real-time vitals
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 🔹 Helper Component for Emergency Summary Cards
const SummaryCard = ({ color, label, count }) => (
  <div
    className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4 text-${color}-800`}
  >
    <div className="flex items-center">
      <div className={`w-3 h-3 bg-${color}-500 rounded-full mr-2`}></div>
      <span className="font-semibold">{label}</span>
    </div>
    <div className="text-2xl font-bold mt-2">{count}</div>
  </div>
);

export default Dashboard;
