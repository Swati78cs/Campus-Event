import React, { useEffect, useState } from 'react';
import { getSystemHealth } from '../../services/healthService';
import { CheckCircle2, AlertCircle, RefreshCw, Server, Database, Shield } from 'lucide-react';

export default function HomePage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSystemHealth();
      setHealthData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Hero Header */}
      <div>
        <h1>Campus Event Management Platform</h1>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Phase 0 Foundation &mdash; Core Architecture &amp; System Health
        </p>
      </div>

      {/* Connectivity & Health Status Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <h2 style={{ fontSize: '20px' }}>System Connectivity Verification</h2>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Check Again</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <p>Connecting to backend API...</p>
          </div>
        ) : error ? (
          <div
            style={{
              padding: 'var(--space-4)',
              backgroundColor: '#FEE2E2',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <AlertCircle size={22} />
            <div>
              <strong>Connection Error:</strong> {error}
              <p style={{ fontSize: '13px', marginTop: '2px', color: '#991B1B' }}>
                Ensure the backend Express server is running on the configured port.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            {/* Backend Server Status */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Server size={18} color="var(--color-primary)" />
                <strong>Backend API</strong>
              </div>
              <span className={`badge ${healthData?.status === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
                <CheckCircle2 size={14} />
                {healthData?.status?.toUpperCase()}
              </span>
              <p style={{ fontSize: '13px', marginTop: 'var(--space-2)' }}>
                Uptime: {healthData?.uptime}s
              </p>
            </div>

            {/* Database Status */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Database size={18} color="var(--color-qr)" />
                <strong>MongoDB Database</strong>
              </div>
              <span className={`badge ${healthData?.database?.status === 'connected' ? 'badge-success' : 'badge-error'}`}>
                <CheckCircle2 size={14} />
                {healthData?.database?.status?.toUpperCase()}
              </span>
              <p style={{ fontSize: '13px', marginTop: 'var(--space-2)' }}>
                Ready for replica set transactions
              </p>
            </div>

            {/* API Protocol & Envelope */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Shield size={18} color="var(--color-ai)" />
                <strong>Response Envelope</strong>
              </div>
              <span className="badge badge-info">
                APPROVED FORMAT
              </span>
              <p style={{ fontSize: '13px', marginTop: 'var(--space-2)' }}>
                Standard success &amp; error envelopes active
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Phase 0 Architecture Blueprint Card */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Phase 0 Foundation Checklist</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '14px' }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span>Node.js + Express backend modular architecture (Route → Middleware → Controller → Service → Model)</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '14px' }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span>MongoDB Atlas / local replica set connection via Mongoose</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '14px' }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span>Centralized error handling &amp; consistent 404 response handlers</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '14px' }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span>React + Vite frontend with React Router and centralized API service layer</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '14px' }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span>"Modern Campus Tech" design system with accessible focus and touch targets</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '14px' }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span>Zero business logic or fake data premature implementation</span>
          </li>
        </ul>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
