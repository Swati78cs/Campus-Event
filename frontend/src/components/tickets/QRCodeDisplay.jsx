import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ token, size = 200, label = 'Ticket QR Code' }) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setDataUrl('');
      return;
    }

    QRCode.toDataURL(token, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A', // Navy dark color for sharp contrast
        light: '#FFFFFF', // Clean white background
      },
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error generating QR code:', err);
          setError('Failed to render QR Code');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, size]);

  if (error) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F1F5F9',
          color: 'var(--color-error)',
          fontSize: '12px',
          textAlign: 'center',
          padding: '8px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          color: 'var(--color-text-secondary)',
          fontSize: '12px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      <img
        src={dataUrl}
        alt={label}
        width={size}
        height={size}
        style={{
          display: 'block',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <span
        style={{
          marginTop: '6px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Present at Event Entry
      </span>
    </div>
  );
}
