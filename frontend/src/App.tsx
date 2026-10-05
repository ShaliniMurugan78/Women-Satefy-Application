import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SafetyProvider, useSafety } from './context/SafetyContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { NavTab } from './components/layout/Sidebar';
import { ModeBanner } from './components/safety/ModeBanner';
import { EmergencyEscalationModal } from './components/safety/EmergencyEscalationModal';
import { PermissionSetupPage } from './pages/PermissionSetupPage';

import { DashboardPage } from './pages/DashboardPage';
import { SafetySessionPage } from './pages/SafetySessionPage';
import { ContactsPage } from './pages/ContactsPage';
import { SafeRoutePage } from './pages/SafeRoutePage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

/**
 * GlobalEmergencyModal — rendered at the App root level inside SafetyProvider
 * so it fires from ANY active page when escalationTriggered becomes true.
 */
const GlobalEmergencyModal: React.FC<{ onNavigate: (tab: NavTab) => void }> = ({ onNavigate }) => {
  const { escalationTriggered, resetSessionState } = useSafety();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (escalationTriggered) {
      setVisible(true);
    }
  }, [escalationTriggered]);

  if (!visible) return null;

  return (
    <EmergencyEscalationModal
      onClose={() => {
        setVisible(false);
        resetSessionState();
      }}
      onViewIncidents={() => {
        setVisible(false);
        resetSessionState();
        onNavigate('incidents');
      }}
    />
  );
};

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Track whether the user has completed the permission wizard
  const [permissionsGranted, setPermissionsGranted] = React.useState(
    () => localStorage.getItem('guardian_permissions_granted') === '1'
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          color: '#60a5fa',
          fontSize: '15px',
          fontWeight: 700
        }}
      >
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        Initializing Guardian AI Engine...
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
      </div>
    );
  }

  // Not logged in → show Login
  if (!user) {
    return <LoginPage />;
  }

  // Logged in but permissions not granted → Permission wizard
  if (!permissionsGranted) {
    return <PermissionSetupPage onComplete={() => setPermissionsGranted(true)} />;
  }

  return (
    <SafetyProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
        {/* Persistent Global Mode Banner */}
        <ModeBanner />

        {/* Global Top Navbar with Navigation Tabs & Theme Switcher */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Workspace Layout (Full Width, No Side Bar) */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'safety' && <SafetySessionPage onNavigate={setActiveTab} />}
          {activeTab === 'contacts' && <ContactsPage />}
          {activeTab === 'safe-route' && <SafeRoutePage />}
          {activeTab === 'incidents' && <IncidentsPage />}
          {activeTab === 'profile' && <ProfilePage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        {/* GLOBAL Emergency Escalation Modal — fires on any page when emergency triggers */}
        <GlobalEmergencyModal onNavigate={setActiveTab} />
      </div>
    </SafetyProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
