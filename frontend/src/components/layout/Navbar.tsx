import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSafety } from '../../context/SafetyContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  Users,
  Navigation,
  History,
  UserCheck,
  Settings as SettingsIcon,
  Sun,
  Moon,
  LogOut,
  Radio
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { mode, isMonitoring, overallRiskLevel } = useSafety();
  const { theme, toggleTheme } = useTheme();

  const getRiskColor = () => {
    switch (overallRiskLevel) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH_RISK': return '#ef4444';
      case 'SUSPICIOUS': return '#f97316';
      case 'CAUTION': return '#eab308';
      default: return '#10b981';
    }
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'safety', label: 'Safety Session', icon: <ShieldAlert size={16} />, badge: isMonitoring },
    { id: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
    { id: 'safe-route', label: 'Safe Route', icon: <Navigation size={16} /> },
    { id: 'incidents', label: 'Incidents', icon: <History size={16} /> },
    { id: 'profile', label: 'Profile', icon: <UserCheck size={16} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> }
  ];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '68px',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Left: Brand Logo & Title */}
      <div
        onClick={() => setActiveTab('dashboard')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
          }}
        >
          <Shield size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              GUARDIAN
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '6px'
              }}
            >
              AI
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
            Autonomous Multi-Agent Platform
          </p>
        </div>
      </div>

      {/* Center: Top Navigation Bar Tabs */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'var(--bg-subtle)',
          padding: '4px 6px',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          overflowX: 'auto'
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 13px',
                borderRadius: '9px',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--nav-active-text)' : 'var(--nav-inactive-text)',
                fontWeight: isActive ? 700 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                position: 'relative',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ color: isActive ? 'var(--nav-active-text)' : 'inherit', display: 'flex' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>

              {item.badge && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 8px #ef4444',
                    animation: 'pulseGlow 1.5s infinite'
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Theme Toggle + Status + Profile + Sign Out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Monitoring Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '20px',
            backgroundColor: isMonitoring ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-subtle)',
            border: `1px solid ${isMonitoring ? '#ef4444' : 'var(--border-light)'}`
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isMonitoring ? getRiskColor() : '#94a3b8',
              boxShadow: isMonitoring ? `0 0 8px ${getRiskColor()}` : 'none',
              animation: isMonitoring ? 'pulseGlow 1.5s infinite' : 'none'
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: isMonitoring ? getRiskColor() : 'var(--text-secondary)'
            }}
          >
            {isMonitoring ? overallRiskLevel : 'STANDBY'}
          </span>
        </div>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {theme === 'dark' ? (
            <Sun size={17} color="#fbbf24" />
          ) : (
            <Moon size={17} color="#475569" />
          )}
        </button>

        {/* User Avatar & Logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderLeft: '1px solid var(--border-light)',
            paddingLeft: '12px'
          }}
        >
          <div
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
                border: '1px solid var(--border-medium)'
              }}
            >
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.full_name || 'Protected User'}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {mode === 'LIVE' ? 'Live Mode' : mode === 'HYBRID' ? 'Hybrid Demo' : 'Demo Mode'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
