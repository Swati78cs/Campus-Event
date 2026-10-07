import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, AlertCircle, Send, CheckCheck, Download, RefreshCw, UserCheck } from 'lucide-react';
import { certificateService } from '../../services/certificateService';
import { updateEvent } from '../../services/eventService';
import { formatToIST } from '../../utils/dateUtils';

export default function CertificateManagement({ eventId, eventStatus, isCompleted, initialCertificateEnabled, onEventUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [enabling, setEnabling] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await certificateService.getEventCertificates(eventId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load certificate data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [eventId]);

  const handleEnableCertificates = async () => {
    try {
      setEnabling(true);
      setError(null);
      await updateEvent(eventId, { certificateEnabled: true });
      setSuccessMsg('Certificates enabled for this event!');
      if (onEventUpdated) onEventUpdated();
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to enable certificates.');
    } finally {
      setEnabling(false);
    }
  };

  const handleIssueSingle = async (studentId, studentName) => {
    try {
      setActionId(studentId);
      setError(null);
      setSuccessMsg(null);
      const res = await certificateService.issueCertificate(eventId, studentId);
      setSuccessMsg(`Certificate successfully issued to ${studentName}!`);
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to issue certificate.');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkIssue = async () => {
    if (!window.confirm('Are you sure you want to issue certificates to all eligible attendees?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);
      const res = await certificateService.bulkIssueCertificates(eventId);
      setSuccessMsg(`Bulk issuance complete: ${res.newlyIssued} new certificates issued (${res.alreadyIssued} were already issued).`);
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to complete bulk issuance.');
    } finally {
      setActionLoading(false);
    }
  };

  const certificateEnabled = data?.event?.certificateEnabled ?? initialCertificateEnabled;
  const eventCompleted = data?.event?.isCompleted ?? isCompleted;

  return (
    <div className="card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Certificates</h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: certificateEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.15)',
                  color: certificateEnabled ? '#065F46' : 'var(--color-text-secondary)',
                }}
              >
                {certificateEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Issue participation certificates to verified checked-in attendees
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!certificateEnabled && (
            <button
              type="button"
              onClick={handleEnableCertificates}
              disabled={enabling}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '6px 14px', backgroundColor: '#D97706', borderColor: '#D97706' }}
            >
              {enabling ? 'Enabling...' : 'Enable Certificates'}
            </button>
          )}

          {certificateEnabled && eventCompleted && data?.stats?.pendingIssuance > 0 && (
            <button
              type="button"
              onClick={handleBulkIssue}
              disabled={actionLoading}
              className="btn btn-primary"
              style={{
                fontSize: '13px',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#D97706',
                borderColor: '#D97706',
              }}
            >
              <CheckCheck size={16} />
              <span>{actionLoading ? 'Issuing All...' : `Issue All (${data.stats.pendingIssuance})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchSummary}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '6px 10px' }}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#065F46',
            fontSize: '13px',
            marginBottom: 'var(--space-3)',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#991B1B',
            fontSize: '13px',
            marginBottom: 'var(--space-3)',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* State Notices */}
      {!certificateEnabled ? (
        <div
          style={{
            padding: 'var(--space-6)',
            textAlign: 'center',
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
          }}
        >
          <p style={{ margin: 0 }}>
            Certificates are not enabled for this event. Click <strong>Enable Certificates</strong> above to allow issuing participation certificates once the event concludes.
          </p>
        </div>
      ) : !eventCompleted ? (
        <div
          style={{
            padding: 'var(--space-6)',
            textAlign: 'center',
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
          }}
        >
          <p style={{ margin: 0 }}>
            Certificates can only be issued once the event is completed. Attendees verified through QR check-in will automatically become eligible.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          {data?.stats && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Attended</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800 }}>{data.stats.totalAttended}</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Issued</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#10B981' }}>{data.stats.totalIssued}</p>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Pending</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#D97706' }}>{data.stats.pendingIssuance}</p>
              </div>
            </div>
          )}

          {/* Attendees Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', color: 'var(--color-text-secondary)' }}>
              Loading attendees...
            </div>
          ) : data?.attendees?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', color: 'var(--color-text-secondary)' }}>
              No attendees verified for this event yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '10px 12px' }}>Attendee</th>
                    <th style={{ padding: '10px 12px' }}>Email</th>
                    <th style={{ padding: '10px 12px' }}>Check-in</th>
                    <th style={{ padding: '10px 12px' }}>Certificate Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.attendees?.map((att) => (
                    <tr key={att.studentId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{att.name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{att.email}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          className={`badge ${att.attendanceStatus === 'checked_in' ? 'badge-success' : 'badge-warning'}`}
                          style={{ fontSize: '10px', textTransform: 'uppercase' }}
                        >
                          {att.attendanceStatus} ({att.method})
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {att.hasCertificate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-success" style={{ fontSize: '10px' }}>
                              ISSUED
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {att.certificateId}
                            </span>
                          </div>
                        ) : (
                          <span className="badge" style={{ fontSize: '10px', backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#D97706' }}>
                            PENDING
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {att.hasCertificate ? (
                          <button
                            type="button"
                            onClick={() => certificateService.downloadCertificatePDF(att.certificateId)}
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Download PDF"
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleIssueSingle(att.studentId, att.name)}
                            disabled={actionId === att.studentId}
                            className="btn btn-primary"
                            style={{
                              fontSize: '12px',
                              padding: '4px 10px',
                              backgroundColor: '#D97706',
                              borderColor: '#D97706',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Award size={13} />
                            <span>{actionId === att.studentId ? 'Issuing...' : 'Issue'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
