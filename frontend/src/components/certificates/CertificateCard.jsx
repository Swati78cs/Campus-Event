import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Download, Calendar, Layers, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { certificateService } from '../../services/certificateService';
import { formatToIST } from '../../utils/dateUtils';

export default function CertificateCard({ certificate }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const eventTitle = certificate.event?.title || certificate.metadata?.eventTitle || 'Campus Event';
  const clubName = certificate.event?.club?.name || certificate.metadata?.clubName || 'College Club';
  const eventDate = certificate.metadata?.eventDate || certificate.event?.startDateTime;
  const certificateId = certificate.certificateId;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      await certificateService.downloadCertificatePDF(certificateId);
    } catch (err) {
      setDownloadError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: '4px solid #D97706',
        position: 'relative',
        gap: 'var(--space-4)',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#D97706',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Award size={13} />
              Verified Certificate
            </span>
          </div>

          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {certificateId}
          </span>
        </div>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {eventTitle}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} />
            <span>{clubName}</span>
          </div>
          {eventDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} />
              <span>Event Date: {formatToIST(eventDate)}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <CheckCircle2 size={13} color="#10B981" />
            <span>Issued on: {formatToIST(certificate.issuedAt)}</span>
          </div>
        </div>
      </div>

      {downloadError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#DC2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <AlertCircle size={14} />
          <span>{downloadError}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn btn-primary"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            padding: '8px 12px',
          }}
        >
          <Download size={15} />
          <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
        </button>

        <Link
          to={`/verify-certificate?id=${certificateId}`}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            padding: '8px 12px',
            textDecoration: 'none',
          }}
          title="Public verification page"
        >
          <ShieldCheck size={15} />
          <span>Verify</span>
        </Link>
      </div>
    </div>
  );
}
