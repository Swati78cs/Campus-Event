import React, { useState, useEffect } from 'react';
import { Award, ChevronLeft, ChevronRight, AlertCircle, FileText } from 'lucide-react';
import CertificateCard from '../../components/certificates/CertificateCard';
import { certificateService } from '../../services/certificateService';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await certificateService.getMyCertificates({ page, limit: 12 });
      setCertificates(data?.certificates || []);
      setPagination(data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [page]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>My Certificates</h1>
              {pagination.total > 0 && (
                <span
                  style={{
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {pagination.total}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Official participation certificates for completed events you attended
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#991B1B',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
          <p>Loading your certificates...</p>
        </div>
      ) : certificates.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 'var(--space-12)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-background)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <FileText size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>You don't have any certificates yet</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '420px' }}>
            Certificates are issued by club organizers for completed events you have attended and checked into with your QR pass.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {certificates.map((cert) => (
            <CertificateCard key={cert._id} certificate={cert} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '6px 12px' }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '6px 12px' }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
