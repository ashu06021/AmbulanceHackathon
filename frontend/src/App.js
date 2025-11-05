import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import AmbulanceDashboard from './components/AmbulanceDashboard';
import HospitalDashboard from './components/HospitalDashboard';
import PatientDetails from './pages/PatientDetails';
import Alerts from './pages/Alerts';
import MapView from './pages/MapView';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const RoleBasedDashboard = () => {
  const { user } = useAuth();
  
  if (user?.role === 'ambulance_staff') {
    return <AmbulanceDashboard />;
  } else if (user?.role === 'hospital_staff' || user?.role === 'admin') {
    return <HospitalDashboard />;
  } else {
    return <div>Unauthorized role</div>;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <RoleBasedDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/patients/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PatientDetails />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute>
                <Layout>
                  <Alerts />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/map" element={
              <ProtectedRoute>
                <Layout>
                  <MapView />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;