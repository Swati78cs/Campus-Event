import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
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
          backgroundColor: '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HelpCircle size={36} color="var(--color-primary)" />
      </div>

      <h1 style={{ fontSize: '36px' }}>404 &mdash; Page Not Found</h1>
      <p style={{ maxWidth: '480px' }}>
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <ArrowLeft size={16} />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
