import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, AlertCircle, Info } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/student', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: 'var(--space-8) auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>Create Student Account</h1>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Sign up to explore campus events and reserve tickets.
        </p>
      </div>

      {/* Scope banner explaining Student-only public registration */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-sm)',
          color: '#1E40AF',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: '13px',
        }}
      >
        <Info size={18} />
        <span>Public registration creates Student accounts. Club Organizer access is assigned by Administrators.</span>
      </div>

      <div className="card">
        {error && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: '#FEE2E2',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              marginBottom: 'var(--space-4)',
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
              placeholder="e.g. Jane Doe"
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
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-1)' }}
            >
              Campus Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@campus.edu"
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
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-1)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: '15px',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
            }}
          >
            <UserPlus size={18} />
            <span>{isSubmitting ? 'Creating account...' : 'Register'}</span>
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
