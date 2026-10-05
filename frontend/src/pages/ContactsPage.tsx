import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EmergencyContact } from '../types';
import { Users, Plus, Phone, Trash2, CheckCircle2, Shield, Star, AlertCircle, Send } from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testSent, setTestSent] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [isPrimary, setIsPrimary] = useState(false);

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (e) {
      console.error('Error fetching contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      await api.createContact({
        name,
        phone,
        relationship,
        is_primary: isPrimary,
        is_secondary: !isPrimary && contacts.length === 1
      });
      setName('');
      setPhone('');
      setShowAddForm(false);
      fetchContacts();
    } catch (err: any) {
      alert(`Error creating contact: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;
    try {
      await api.deleteContact(id);
      fetchContacts();
    } catch (err: any) {
      alert(`Error removing contact: ${err.message}`);
    }
  };

  const handleSimulateAlert = (contact: EmergencyContact) => {
    setTestSent(`Simulated test SMS dispatched to ${contact.name} (${contact.phone}): "Guardian Safety Test Ping - All signals normal."`);
    setTimeout(() => setTestSent(null), 5000);
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Emergency Guardian Contacts
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Trusted contacts who receive instant location telemetry, SMS alerts, and voice calls upon critical safety escalation.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary-blue)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Plus size={16} />
          {showAddForm ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {testSent && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-safe-bg)',
            border: '1px solid var(--color-safe-border)',
            color: '#16a34a',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{testSent}</span>
        </div>
      )}

      {/* Add Contact Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddContact}
          className="guardian-card"
          style={{
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Register New Emergency Contact
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Relationship
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="isPrimary" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Set as Primary Guardian (Receives First Voice Call & Emergency Priority)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading Guardian Contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="guardian-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            No Emergency Contacts Registered
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
            Add your primary guardians so the platform can automatically alert them in unsafe situations.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-blue)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="guardian-card"
              style={{
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: contact.is_primary ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: contact.is_primary ? '#dc2626' : 'var(--primary-blue)',
                    border: `1px solid ${contact.is_primary ? 'rgba(220, 38, 38, 0.3)' : 'var(--border-light)'}`
                  }}
                >
                  <Phone size={20} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {contact.name}
                    </h3>
                    {contact.is_primary && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          backgroundColor: 'rgba(220, 38, 38, 0.15)',
                          color: '#dc2626',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          padding: '1px 8px',
                          borderRadius: '12px'
                        }}
                      >
                        PRIMARY GUARDIAN
                      </span>
                    )}
                    {contact.is_secondary && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)',
                          padding: '1px 8px',
                          borderRadius: '12px'
                        }}
                      >
                        SECONDARY
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {contact.phone}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      &bull; {contact.relationship}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handleSimulateAlert(contact)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={13} color="var(--primary-blue)" /> Test Ping
                </button>

                <button
                  onClick={() => handleDelete(contact.id)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                  title="Remove Contact"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
