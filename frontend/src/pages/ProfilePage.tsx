import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  HeartPulse,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Home,
  QrCode,
  FileBadge,
  Calendar,
  KeyRound,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  // Personal Profile Form States
  const [fullName, setFullName] = useState(user?.full_name || 'Priya Sharma');
  const [email, setEmail] = useState(user?.email || 'priya.sharma@guardian.ai');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [altPhone, setAltPhone] = useState('+91 91234 56789');
  const [dob, setDob] = useState('1998-05-14');
  const [gender, setGender] = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [medicalNotes, setMedicalNotes] = useState('Asthmatic (Carries inhaler). No known drug allergies.');

  // Safe Zones / Address States
  const [homeAddress, setHomeAddress] = useState('Flat 4B, Greenfield Residency, Anna Nagar, Chennai - 600040');
  const [workAddress, setWorkAddress] = useState('Olympia Technology Park, Guindy, Chennai - 600032');
  const [guardianId] = useState('GRD-2026-8942');

  // Security Toggles
  const [autoDispatchSms, setAutoDispatchSms] = useState(true);
  const [liveGpsShare, setLiveGpsShare] = useState(true);
  const [policeHelplineNotify, setPoliceHelplineNotify] = useState(true);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load from local storage or sync with user
  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.email) setEmail(user.email);
    if (user?.phone) setPhone(user.phone);

    const savedProfile = localStorage.getItem('guardian_user_profile');
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        if (p.fullName) setFullName(p.fullName);
        if (p.email) setEmail(p.email);
        if (p.phone) setPhone(p.phone);
        if (p.altPhone) setAltPhone(p.altPhone);
        if (p.dob) setDob(p.dob);
        if (p.gender) setGender(p.gender);
        if (p.bloodGroup) setBloodGroup(p.bloodGroup);
        if (p.medicalNotes) setMedicalNotes(p.medicalNotes);
        if (p.homeAddress) setHomeAddress(p.homeAddress);
        if (p.workAddress) setWorkAddress(p.workAddress);
      } catch (e) {
        // Fallback to defaults
      }
    }
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const profileData = {
      fullName,
      email,
      phone,
      altPhone,
      dob,
      gender,
      bloodGroup,
      medicalNotes,
      homeAddress,
      workAddress
    };
    localStorage.setItem('guardian_user_profile', JSON.stringify(profileData));
    setSaveSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={26} color="var(--primary-blue)" />
            User Profile & Emergency Identity
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Manage personal identification, medical notes, primary safe zones, and emergency responder records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            backgroundColor: isEditing ? 'var(--bg-subtle)' : 'var(--primary-blue)',
            color: isEditing ? 'var(--text-primary)' : '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            border: '1px solid var(--border-medium)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isEditing ? 'Cancel Edit' : 'Edit Profile Details'}
        </button>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-safe-bg)',
            border: '1px solid var(--color-safe-border)',
            color: '#16a34a',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          User Profile and Emergency Information successfully updated!
        </div>
      )}

      {/* Top Identity Hero Card */}
      <div
        className="guardian-card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-subtle) 100%)',
          border: '1px solid var(--border-medium)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Avatar */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                border: '3px solid #ffffff'
              }}
            >
              {fullName ? fullName.charAt(0) : 'U'}
            </div>

            {/* Basic Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {fullName}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-safe-bg)',
                    color: '#16a34a',
                    border: '1px solid var(--color-safe-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ShieldCheck size={12} /> Verified Citizen
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {email} • {phone}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>Guardian ID: <strong style={{ color: 'var(--primary-blue)' }}>{guardianId}</strong></span>
                <span>•</span>
                <span>Blood Group: <strong style={{ color: '#e11d48' }}>{bloodGroup}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Status Stats */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ padding: '12px 18px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>MONITORING</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>● 24/7 Active</div>
            </div>
            <div style={{ padding: '12px 18px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SAFE ZONES</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-blue)', marginTop: '2px' }}>2 Enrolled</div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Details Form & First Responder Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Personal Information & Safe Zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Personal Details Form Card */}
          <div className="guardian-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--primary-blue)" />
              Personal & Emergency Contact Details
            </h3>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                
                {/* Full Name */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Primary Email Address
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Primary Mobile (SOS Dispatch)
                  </label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                {/* Alternate Phone */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Alternate / Guardian Phone
                  </label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                {/* DOB */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Gender
                  </label>
                  <select
                    disabled={!isEditing}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Blood Group */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Blood Group (Medical Responder)
                  </label>
                  <select
                    disabled={!isEditing}
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: '#e11d48',
                      fontSize: '13px',
                      fontWeight: 800
                    }}
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>

                {/* Medical Notes */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Emergency Medical Notes / Allergies / Conditions
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isEditing}
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="E.g. Inhaler required, Diabetic, Penicillin allergy..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: isEditing ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      resize: 'none'
                    }}
                  />
                </div>

              </div>

              {isEditing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button
                    type="submit"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--primary-blue)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Safe Zones & Registered Locations */}
          <div className="guardian-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#16a34a" />
              Registered Safe Zones & Habitual Locations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Home Address */}
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Home size={16} color="var(--primary-blue)" />
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Primary Residence (Home Safe Zone)</strong>
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: isEditing ? 'var(--bg-surface)' : 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                />
              </div>

              {/* Work Address */}
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Building size={16} color="#10b981" />
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Workplace / College Campus (Secondary Safe Zone)</strong>
                </div>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={workAddress}
                  onChange={(e) => setWorkAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: isEditing ? 'var(--bg-surface)' : 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: First Responder Digital Medical ID Card & Protocols */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Emergency Responder Digital Pass */}
          <div
            className="guardian-card"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#ef4444" />
                <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
                  Emergency Medical Pass
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ef4444', color: '#fff' }}>
                PARAMEDIC ACCESS
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '10px',
                  backgroundColor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 900
                }}
              >
                {fullName ? fullName.charAt(0) : 'U'}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{fullName}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {guardianId}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>BLOOD GROUP</span>
                <strong style={{ fontSize: '14px', color: '#ef4444' }}>{bloodGroup}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>EMERGENCY PHONE</span>
                <strong>{phone}</strong>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.4 }}>
              <strong>Medical Alerts:</strong> {medicalNotes}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>National Police Helpline: 1091 / 112</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}>● GPS Enabled</span>
            </div>
          </div>

          {/* Automated Emergency Protocols */}
          <div className="guardian-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--primary-blue)" />
              Emergency Dispatch Protocols
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>SMS Emergency Dispatch</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Send instant SOS coordinates to trusted contacts</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoDispatchSms}
                  onChange={(e) => setAutoDispatchSms(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-blue)', cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Live GPS Location Sharing</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Broadcast real-time breadcrumbs during threats</div>
                </div>
                <input
                  type="checkbox"
                  checked={liveGpsShare}
                  onChange={(e) => setLiveGpsShare(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-blue)', cursor: 'pointer' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Women Police Helpline Link</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Direct API relay to 1091 on Level-4 Critical Emergency</div>
                </div>
                <input
                  type="checkbox"
                  checked={policeHelplineNotify}
                  onChange={(e) => setPoliceHelplineNotify(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-blue)', cursor: 'pointer' }}
                />
              </label>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ProfilePage;
