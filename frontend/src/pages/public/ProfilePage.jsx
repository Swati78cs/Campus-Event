import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    setError(null);

    try {
      await updateProfile({ name });
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1>My Account Profile</h1>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Manage your personal details and account preferences.
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#DCFCE7',
            borderRadius: 'var(--radius-sm)',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Account Details Card */}
      <div className="card">
        <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Shield size={20} color="var(--color-primary)" />
          <span>Account Information</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Account Role</span>
            <span
              className="badge"
              style={{
                marginTop: '4px',
                backgroundColor: user?.role === 'admin' ? '#FEF3C7' : user?.role === 'organizer' ? '#EDE9FE' : '#DBEAFE',
                color: user?.role === 'admin' ? '#92400E' : user?.role === 'organizer' ? '#6D28D9' : '#1E40AF',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {user?.role}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Account Status</span>
            <span
              className={`badge ${user?.isActive ? 'badge-success' : 'badge-error'}`}
              style={{ marginTop: '4px' }}
            >
              {user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Email Address</span>
            <strong style={{ fontSize: '14px' }}>{user?.email}</strong>
          </div>

          <div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Member Since</span>
            <span style={{ fontSize: '14px' }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-4) 0' }} />

        {/* Update Profile Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label
              htmlFor="name"
              style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-1)' }}
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '15px',
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <User size={16} />
              <span>{isUpdating ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
