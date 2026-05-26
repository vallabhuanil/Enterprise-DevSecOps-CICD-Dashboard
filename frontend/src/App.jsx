import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import Pipelines from './pages/Pipelines';
import Security from './pages/Security';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import Register from './pages/Register';

function DashboardApp() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="flex-center animate-pulse" style={{ height: '100vh', background: '#0a0e1a', color: '#6366f1', fontSize: '1.2rem', fontWeight: 'bold' }}>
        Bootstrapping DevSecOps Console...
      </div>
    );
  }

  if (!user) {
    return authView === 'login' 
      ? <Login onRegisterRedirect={() => setAuthView('register')} /> 
      : <Register onLoginRedirect={() => setAuthView('login')} />;
  }

  const renderTab = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'repositories': return <Repositories />;
      case 'pipelines': return <Pipelines />;
      case 'security': return <Security />;
      case 'users': return <UserManagement />;
      default: return <Dashboard />;
    }
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Operations Telemetry Overview';
      case 'repositories': return 'VCS Integrations Registry';
      case 'pipelines': return 'CI/CD Pipelines Panel';
      case 'security': return 'DevSecOps Auditing Reports';
      case 'users': return 'Operator Profiles & Auditing';
      default: return 'DevSecOps Hub';
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="main-content">
        <Navbar title={getTitle()} />
        <div style={{ flex: 1, marginTop: '8px' }}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}
