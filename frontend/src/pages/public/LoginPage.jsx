import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });

      // Determine destination based on previous location or user role
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'organizer') {
        navigate('/organizer', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '440px',
        margin: 'var(--space-8) auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px' }}>Sign In to Campus Events</h1>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Enter your credentials to access your campus account.
        </p>
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
              htmlFor="email"
              style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: 'var(--space-1)' }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@campus.edu"
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
              placeholder="••••••••"
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
            <LogIn size={18} />
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        Don't have an account yet?{' '}
        <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          Create a Student Account
        </Link>
      </div>
    </div>
  );
}
