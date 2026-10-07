import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-4)',
        gap: 'var(--space-4)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShieldAlert size={36} color="var(--color-error)" />
      </div>

      <h1 style={{ fontSize: '36px' }}>403 &mdash; Access Forbidden</h1>
      <p style={{ maxWidth: '480px' }}>
        You do not have the required permissions to view this resource.
      </p>

      <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <ArrowLeft size={16} />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
