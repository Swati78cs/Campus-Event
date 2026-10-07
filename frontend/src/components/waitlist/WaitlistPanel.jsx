import React, { useState, useEffect } from 'react';
import { Clock, UserX, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  getEventWaitlist,
  removeStudentFromWaitlist,
} from '../../services/waitlistService';
import { formatToIST } from '../../utils/dateUtils';

export default function WaitlistPanel({ eventId }) {
  const [entries, setEntries] = useState([]);
  const [activeWaitingCount, setActiveWaitingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadWaitlist();
  }, [eventId, statusFilter]);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEventWaitlist(eventId, { status: statusFilter, limit: 50 });
      if (res?.success && res?.data) {
        setEntries(res.data.entries || []);
        setActiveWaitingCount(res.data.activeWaitingCount || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load event waitlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName || 'this student'} from the waitlist?`)) {
      return;
    }

    try {
      setActionLoadingId(studentId);
      setError(null);
      setSuccessMsg(null);
      const res = await removeStudentFromWaitlist(eventId, studentId);
      if (res?.success) {
        setSuccessMsg(`Removed ${studentName || 'student'} from the waitlist.`);
        await loadWaitlist();
      }
    } catch (err) {
      setError(err.message || 'Failed to remove student from waitlist.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Clock size={20} color="var(--color-navy)" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>Event Waitlist</h2>
          <span
            className="badge"
            style={{
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            {activeWaitingCount} Waiting
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="all">All Entries</option>
            <option value="waiting">Waiting Only</option>
            <option value="promoted">Promoted</option>
            <option value="removed">Removed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={loadWaitlist}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', minHeight: '34px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Refresh waitlist"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            borderRadius: 'var(--radius-sm)',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#DCFCE7',
            borderRadius: 'var(--radius-sm)',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Waitlist Table */}
      {loading ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          Loading waitlist entries...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
          No waitlist entries found for this event.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px 8px' }}>Position</th>
                <th style={{ padding: '10px 8px' }}>Student</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Joined At</th>
                <th style={{ padding: '10px 8px' }}>Updated</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((item) => {
                const s = item.student;
                const isWaiting = item.status === 'waiting';
                const isOperating = actionLoadingId === s?._id;

                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 8px' }}>
                      {isWaiting ? (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          #{item.position}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 600 }}>{s?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                        {s?.email}
                      </div>
                      {!s?.isActive && (
                        <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 700, textTransform: 'uppercase' }}>
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor:
                            item.status === 'promoted'
                              ? '#DCFCE7'
                              : item.status === 'waiting'
                              ? '#FEF3C7'
                              : item.status === 'cancelled'
                              ? '#FEE2E2'
                              : '#E2E8F0',
                          color:
                            item.status === 'promoted'
                              ? '#166534'
                              : item.status === 'waiting'
                              ? '#92400E'
                              : item.status === 'cancelled'
                              ? '#991B1B'
                              : '#475569',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--color-text-secondary)' }}>
                      {formatToIST(item.joinedAt)}
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {item.promotedAt
                        ? `Promoted: ${formatToIST(item.promotedAt)}`
                        : item.removedAt
                        ? `Removed: ${formatToIST(item.removedAt)}`
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      {isWaiting ? (
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handleRemove(s?._id, s?.name)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #DC2626',
                            color: '#DC2626',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isOperating ? 'Removing...' : 'Remove'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
