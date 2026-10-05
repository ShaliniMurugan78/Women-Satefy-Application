import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string, phone?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (err) {
          console.warn('Invalid or expired token — clearing session');
          api.setToken(null);
        }
      }
      // No auto-demo login — user must authenticate manually
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name: string, phone?: string) => {
    const res = await api.register(email, pass, name, phone);
    setUser(res.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    // Clear permission flags so wizard re-runs on next login
    localStorage.removeItem('guardian_permissions_granted');
    localStorage.removeItem('guardian_mode');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
