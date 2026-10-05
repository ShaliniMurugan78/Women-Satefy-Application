import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Navigation,
  History,
  UserCheck,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 'dashboard' | 'safety' | 'contacts' | 'safe-route' | 'incidents' | 'profile' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isMonitoring } = useSafety();
  const { logout } = useAuth();

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'safety', label: 'Safety Session', icon: <ShieldAlert size={18} />, badge: isMonitoring },
    { id: 'contacts', label: 'Emergency Contacts', icon: <Users size={18} /> },
    { id: 'safe-route', label: 'Safe Route', icon: <Navigation size={18} /> },
    { id: 'incidents', label: 'Incident History', icon: <History size={18} /> },
    { id: 'profile', label: 'Profile & Baseline', icon: <UserCheck size={18} /> },
    { id: 'settings', label: 'Settings & Config', icon: <SettingsIcon size={18} /> }
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        minHeight: 'calc(100vh - 100px)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#94a3b8',
            padding: '4px 12px',
            marginBottom: '4px'
          }}
        >
          Navigation
        </span>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: isActive ? '#2563eb' : '#64748b' }}>
                  {item.icon}
                </span>
                {item.label}
              </div>

              {item.badge && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 8px #ef4444'
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#64748b',
            fontWeight: 500,
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
