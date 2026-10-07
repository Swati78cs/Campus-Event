import React from 'react';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-6) var(--space-4)',
        textAlign: 'center',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Campus Event Management & QR Ticketing Platform &mdash; Phase 0 Foundation
        </p>
      </div>
    </footer>
  );
}
