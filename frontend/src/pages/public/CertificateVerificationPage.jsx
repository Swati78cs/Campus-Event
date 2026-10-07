import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Search, CheckCircle2, AlertCircle, Award, Calendar, Layers } from 'lucide-react';
import { certificateService } from '../../services/certificateService';
import { formatToIST } from '../../utils/dateUtils';

export default function CertificateVerificationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [certificateId, setCertificateId] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async (idToVerify) => {
    const trimmed = (idToVerify || certificateId).trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a valid Certificate ID (e.g. CERT-ABC123XYZ).');
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const data = await certificateService.verifyCertificate(trimmed);
      setResult(data);
      setSearchParams({ id: trimmed });
    } catch (err) {
      setError(err.message || 'Certificate not found or invalid.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      setCertificateId(idFromUrl);
      handleVerify(idFromUrl);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
          }}
        >
          <ShieldCheck size={32} />
        </div>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>Public Certificate Verification</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '500px' }}>
          Enter the official Certificate ID to verify genuine participation in campus events.
        </p>
      </div>

      {/* Verification Input Form */}
      <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
        <input
          type="text"
          value={certificateId}
          onChange={(e) => setCertificateId(e.target.value)}
          placeholder="e.g. CERT-A1B2C3D4E5"
          required
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: '15px',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        />
        <button
          type="submit"
          disabled={loading || !certificateId.trim()}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            fontSize: '15px',
            backgroundColor: '#10B981',
            borderColor: '#10B981',
          }}
        >
          <Search size={18} />
          <span>{loading ? 'Verifying...' : 'Verify'}</span>
        </button>
      </form>

      {/* Error / Not Found */}
      {error && (
        <div
          className="card"
          style={{
            padding: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#991B1B',
          }}
        >
          <AlertCircle size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Certificate Not Found</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B91C1C' }}>
              The entered Certificate ID is either invalid or has not been officially issued. Please double-check the ID.
            </p>
          </div>
        </div>
      )}

      {/* Verified Result Card */}
      {result && result.valid && (
        <div
          className="card"
          style={{
            padding: 'var(--space-8)',
            border: '2px solid #10B981',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#065F46',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              <CheckCircle2 size={16} />
              Officially Verified
            </span>

            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {result.certificateId}
            </span>
          </div>

          <div style={{ textAlign: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-6)' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Certificate of Participation Awarded to
            </span>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '26px', fontWeight: 800, color: '#1E3A8A' }}>
              {result.studentName}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Event Name
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 700 }}>
                {result.eventTitle}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Organizing Club
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Layers size={16} color="var(--color-primary)" />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>{result.clubName}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Event Date
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Calendar size={16} color="var(--color-text-secondary)" />
                <span style={{ fontSize: '14px' }}>{formatToIST(result.eventDate)}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Date of Issuance
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Award size={16} color="#D97706" />
                <span style={{ fontSize: '14px' }}>{formatToIST(result.issuedAt)}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-background)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
            }}
          >
            This verification record confirms authentic attendance and verified QR check-in recorded by the campus event administration.
          </div>
        </div>
      )}
    </div>
  );
}
