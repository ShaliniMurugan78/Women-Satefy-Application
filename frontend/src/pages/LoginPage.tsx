import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Shield, Lock, Mail, User as UserIcon, Phone, ArrowRight,
  ChevronLeft, Plus, Trash2, Heart, Star, Check, Eye, EyeOff
} from 'lucide-react';

interface ContactEntry {
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

const RELATIONSHIPS = ['Family', 'Friend', 'Partner', 'Parent', 'Sibling', 'Colleague', 'Neighbour'];

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();

  // View: 'login' | 'register-step1' | 'register-step2' | 'register-step3'
  const [view, setView] = useState<'login' | 'register-step1' | 'register-step2' | 'register-step3'>('login');

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Emergency contacts
  const [contacts, setContacts] = useState<ContactEntry[]>([
    { name: '', phone: '', relationship: 'Family', is_primary: true }
  ]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ─── Login ─────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Registration Step 1 Validation ────────────── */
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address.');
    if (!phone.trim()) return setError('Please enter your phone number.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setView('register-step2');
  };

  /* ─── Registration Step 2 Contacts ──────────────── */
  const addContact = () => {
    if (contacts.length >= 3) return;
    setContacts(prev => [...prev, { name: '', phone: '', relationship: 'Family', is_primary: false }]);
  };

  const updateContact = (idx: number, field: keyof ContactEntry, value: string | boolean) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeContact = (idx: number) => {
    setContacts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const primary = contacts.find(c => c.is_primary);
    if (!primary || !primary.name.trim() || !primary.phone.trim()) {
      return setError('Please add at least one primary emergency contact with name and phone.');
    }
    for (const c of contacts) {
      if (c.name && !c.phone) return setError(`Phone is required for contact "${c.name}".`);
    }
    setView('register-step3');
  };

  /* ─── Final Registration Submit ──────────────────── */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, fullName, phone);
      // Create contacts via API (user is now logged in)
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        if (c.name && c.phone) {
          await api.createContact({
            name: c.name,
            phone: c.phone,
            relationship: c.relationship,
            is_primary: c.is_primary,
            is_secondary: !c.is_primary && i === 1
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Common UI helpers ──────────────────────────── */
  const stepNum = view === 'register-step1' ? 1 : view === 'register-step2' ? 2 : 3;

  const inputStyle: React.CSSProperties = {
    border: 'none', outline: 'none', width: '100%',
    fontSize: '14px', background: 'transparent',
    color: 'var(--text-primary)',
  };

  const inputWrap: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1.5px solid var(--border-light)',
    background: 'var(--bg-subtle)',
    transition: 'border-color 0.15s ease',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff', fontWeight: 800, fontSize: '15px',
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)',
    transition: 'all 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 700,
    color: 'var(--text-secondary)', display: 'block', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.04em'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
        animation: 'pulse 6s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        animation: 'pulse 8s ease-in-out infinite reverse',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '480px', width: '100%',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.3))',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '28px 32px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.4)', marginBottom: '12px'
          }}>
            <Shield size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.01em' }}>
            {view === 'login' ? 'Guardian AI Shield' : 'Create Your Guardian Profile'}
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', margin: '4px 0 0 0' }}>
            {view === 'login'
              ? 'AI-powered women safety monitoring system'
              : `Step ${stepNum} of 3 — ${stepNum === 1 ? 'Account Details' : stepNum === 2 ? 'Emergency Contacts' : 'Review & Activate'}`}
          </p>

          {/* Step progress bar */}
          {view !== 'login' && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '16px', justifyContent: 'center' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  height: '4px', flex: 1, maxWidth: '60px', borderRadius: '4px',
                  background: s <= stepNum
                    ? 'linear-gradient(90deg, #2563eb, #7c3aed)'
                    : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '28px 32px 32px' }}>
          {/* Error Banner */}
          {error && (
            <div style={{
              padding: '11px 14px', borderRadius: '10px',
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5', fontSize: '13px', fontWeight: 600,
              marginBottom: '18px'
            }}>
              ⚠ {error}
            </div>
          )}

          {/* ═══ LOGIN ══════════════════════════════════════════════════ */}
          {view === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={inputWrap}>
                  <Mail size={16} color="#64748b" />
                  <input type="email" placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={inputWrap}>
                  <Lock size={16} color="#64748b" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'Signing In...' : 'Sign In to Guardian'}
                {!loading && <ArrowRight size={18} />}
              </button>
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Don't have an account? </span>
                <button type="button" onClick={() => { setView('register-step1'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* ═══ REGISTER STEP 1 — Account Details ══════════════════════ */}
          {view === 'register-step1' && (
            <form onSubmit={handleStep1Next} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={inputWrap}>
                  <UserIcon size={16} color="#64748b" />
                  <input type="text" placeholder="Your full name" value={fullName}
                    onChange={e => setFullName(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <div style={inputWrap}>
                  <Mail size={16} color="#64748b" />
                  <input type="email" placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Your Phone Number</label>
                <div style={inputWrap}>
                  <Phone size={16} color="#64748b" />
                  <input type="tel" placeholder="+91 98765 43210" value={phone}
                    onChange={e => setPhone(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={inputWrap}>
                    <Lock size={16} color="#64748b" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars" value={password}
                      onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={{ ...inputWrap, borderColor: confirmPassword && confirmPassword !== password ? 'rgba(220,38,38,0.5)' : inputWrap.borderColor }}>
                    <Lock size={16} color="#64748b" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Repeat" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', padding: '0' }}>
                {showPassword ? '🙈 Hide password' : '👁 Show password'}
              </button>
              <button type="submit" style={btnPrimary}>
                Continue to Contacts <ArrowRight size={18} />
              </button>
              <button type="button" onClick={() => { setView('login'); setError(null); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <ChevronLeft size={14} /> Back to Sign In
              </button>
            </form>
          )}

          {/* ═══ REGISTER STEP 2 — Emergency Contacts ════════════════════ */}
          {view === 'register-step2' && (
            <form onSubmit={handleStep2Next} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd', fontWeight: 600 }}>
                  🛡️ These contacts will be automatically alerted with your live location during an emergency. Add up to 3.
                </p>
              </div>

              {contacts.map((c, idx) => (
                <div key={idx} style={{
                  padding: '16px', borderRadius: '12px',
                  border: `1.5px solid ${c.is_primary ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: c.is_primary ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.03)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: c.is_primary ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 800, color: '#fff'
                      }}>{idx + 1}</span>
                      {c.is_primary && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', background: 'rgba(37,99,235,0.2)', padding: '2px 8px', borderRadius: '20px' }}>
                          ⭐ PRIMARY
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!c.is_primary && (
                        <button type="button" onClick={() => setContacts(prev => prev.map((x, i) => ({ ...x, is_primary: i === idx })))}
                          title="Set as primary"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
                          <Star size={15} />
                        </button>
                      )}
                      {contacts.length > 1 && (
                        <button type="button" onClick={() => removeContact(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '2px' }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <div style={inputWrap}>
                        <UserIcon size={14} color="#64748b" />
                        <input type="text" placeholder="Contact name" value={c.name}
                          onChange={e => updateContact(idx, 'name', e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <div style={inputWrap}>
                        <Phone size={14} color="#64748b" />
                        <input type="tel" placeholder="+91 98765 43210" value={c.phone}
                          onChange={e => updateContact(idx, 'phone', e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Relationship</label>
                    <select value={c.relationship} onChange={e => updateContact(idx, 'relationship', e.target.value)}
                      style={{ ...inputWrap, cursor: 'pointer', width: '100%', color: '#cbd5e1', fontSize: '14px' } as any}>
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              ))}

              {contacts.length < 3 && (
                <button type="button" onClick={addContact}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                    padding: '11px', borderRadius: '10px', border: '1.5px dashed rgba(255,255,255,0.15)',
                    background: 'none', color: '#60a5fa', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  <Plus size={16} /> Add Another Contact ({contacts.length}/3)
                </button>
              )}

              <button type="submit" style={btnPrimary}>
                Review & Activate <ArrowRight size={18} />
              </button>
              <button type="button" onClick={() => { setView('register-step1'); setError(null); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <ChevronLeft size={14} /> Back
              </button>
            </form>
          )}

          {/* ═══ REGISTER STEP 3 — Review & Submit ════════════════════════ */}
          {view === 'register-step3' && (
            <form onSubmit={handleFinalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Account summary */}
              <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Account</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserIcon size={20} color="#fff" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#f1f5f9', fontSize: '15px' }}>{fullName}</p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{email} · {phone}</p>
                  </div>
                </div>
              </div>

              {/* Contacts summary */}
              <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Emergency Contacts</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {contacts.filter(c => c.name && c.phone).map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Heart size={14} color={c.is_primary ? '#f472b6' : '#64748b'} />
                      <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{c.phone}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>({c.relationship})</span>
                      {c.is_primary && <span style={{ fontSize: '10px', fontWeight: 800, color: '#60a5fa', background: 'rgba(37,99,235,0.15)', padding: '1px 6px', borderRadius: '8px' }}>PRIMARY</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissions notice */}
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>
                  ✅ After activation, the app will guide you through granting GPS, Microphone, and Bluetooth permissions.
                </p>
              </div>

              <button type="submit" disabled={loading} style={btnPrimary}>
                {loading ? 'Activating Guardian...' : <><Check size={18} /> Activate Guardian Account</>}
              </button>
              <button type="button" onClick={() => { setView('register-step2'); setError(null); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <ChevronLeft size={14} /> Back to Contacts
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        input::placeholder { color: #475569; }
        select option { background: #1e293b; color: #cbd5e1; }
      `}</style>
    </div>
  );
};
