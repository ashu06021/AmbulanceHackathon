import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { testBackendConnection } from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    setBackendStatus('checking');
    const result = await testBackendConnection();
    if (result.success) {
      setBackendStatus('connected');
    } else {
      setBackendStatus('disconnected');
      setError(`Backend connection failed: ${result.error}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (backendStatus !== 'connected') {
      setError('Cannot connect to backend server. Please check if backend is running.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || 'Login failed - check credentials');
      }
    } catch (error) {
      console.error('Login catch error:', error);
      setError('Login failed - check console for details');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    if (role === 'hospital') {
      setUsername('hospital1');
      setPassword('password123');
    } else if (role === 'ambulance') {
      setUsername('ambulance1');
      setPassword('password123');
    }
  };

  const getStatusConfig = () => {
    switch (backendStatus) {
      case 'connected':
        return {
          text: '✅ Backend Connected',
          color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          icon: '🟢'
        };
      case 'disconnected':
        return {
          text: '❌ Backend Disconnected',
          color: 'bg-rose-50 border-rose-200 text-rose-700',
          icon: '🔴'
        };
      default:
        return {
          text: '⏳ Checking Connection...',
          color: 'bg-amber-50 border-amber-200 text-amber-700',
          icon: '🟡'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo Section */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <span className="text-3xl text-white">⚕️</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-30"></div>
            </div>
          </div>
          
          {/* Header Text */}
          <div className="text-center mt-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              LifeConnect
            </h1>
            <p className="mt-3 text-lg text-gray-600 font-medium">
              Bridging Emergency Care in Real Time
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Real-time patient monitoring & emergency response
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          {/* Connection Status */}
          <div className={`mb-6 border rounded-xl p-4 text-sm ${statusConfig.color} backdrop-blur-sm bg-opacity-80 transition-all duration-300`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{statusConfig.icon}</span>
                <span className="font-medium">{statusConfig.text}</span>
              </div>
              {backendStatus === 'disconnected' && (
                <button
                  onClick={checkBackendConnection}
                  className="text-sm bg-white px-3 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-200 font-medium"
                >
                  Retry
                </button>
              )}
            </div>
            {backendStatus === 'disconnected' && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-rose-100">
                <p className="text-xs text-rose-600 font-medium mb-2">🚨 Connection Required</p>
                <div className="text-xs text-rose-500 space-y-1">
                  <p>1. Open terminal in backend folder</p>
                  <p>2. Run: <code className="bg-rose-100 px-1 py-0.5 rounded">npm start</code></p>
                  <p>3. Wait for server startup message</p>
                </div>
              </div>
            )}
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-lg py-8 px-6 shadow-2xl rounded-2xl border border-white/20 transform hover:shadow-xl transition-all duration-300">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm backdrop-blur-sm animate-shake">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">⚠️</span>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}
              
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                  <span className="flex items-center">
                    <span className="mr-2">👤</span>
                    Username or Email
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your username or email"
                    disabled={loading || backendStatus !== 'connected'}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-gray-400">🔑</span>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  <span className="flex items-center">
                    <span className="mr-2">🔒</span>
                    Password
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your password"
                    disabled={loading || backendStatus !== 'connected'}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <span className="text-gray-400">👁️</span>
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || backendStatus !== 'connected'}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Sign in to Dashboard
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials Section */}
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 text-gray-500 font-medium rounded-lg backdrop-blur-sm">
                    Quick Access Demo
                  </span>
                </div>
              </div>

              {/* Demo Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('hospital')}
                  disabled={backendStatus !== 'connected'}
                  className="inline-flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white/50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50 transition-all duration-200 backdrop-blur-sm transform hover:scale-[1.02]"
                >
                  <span className="mr-2">🏥</span>
                  Hospital Staff
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('ambulance')}
                  disabled={backendStatus !== 'connected'}
                  className="inline-flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white/50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-50 transition-all duration-200 backdrop-blur-sm transform hover:scale-[1.02]"
                >
                  <span className="mr-2">🚑</span>
                  Ambulance Staff
                </button>
              </div>

              {/* Demo Credentials Details */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border border-blue-100 backdrop-blur-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  Demo Credentials
                </h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                    <span className="font-medium">Hospital Staff</span>
                    <code className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono">hospital1 / password123</code>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                    <span className="font-medium">Ambulance Staff</span>
                    <code className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-mono">ambulance1 / password123</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center">
                <span className="mr-1">🔐</span>
                Secure • Encrypted • HIPAA Compliant
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Emergency Medical Response System v2.0
            </p>
            <p className="text-xs text-gray-400 mt-1">
              For emergency use only • 24/7 Support
            </p>
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Login;