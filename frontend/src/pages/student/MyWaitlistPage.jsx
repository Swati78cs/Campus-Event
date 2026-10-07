import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Ticket, MapPin, Calendar, Layers, ChevronRight, UserX, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getMyWaitlistEvents, leaveWaitlist } from '../../services/waitlistService';
import { formatToIST } from '../../utils/dateUtils';

export default function MyWaitlistPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('waiting');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchWaitlistEntries();
  }, [page, statusFilter]);

  const fetchWaitlistEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyWaitlistEvents({ page, limit: 10, status: statusFilter });
      if (res?.success && res?.data) {
        setEntries(res.data.entries || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load waitlist entries.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to leave the waitlist for "${eventTitle || 'this event'}"?`)) {
      return;
    }

    try {
      setActionLoadingId(eventId);
      setError(null);
      setSuccessMsg(null);
      const res = await leaveWaitlist(eventId);
      if (res?.success) {
        setSuccessMsg(`Successfully removed from the waitlist for "${eventTitle}".`);
        await fetchWaitlistEntries();
      }
    } catch (err) {
      setError(err.message || 'Failed to leave waitlist.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Clock size={28} color="var(--color-primary)" />
            <span>My Waitlist</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Events where you are on the waitlist or were previously promoted.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="waiting">Waiting</option>
            <option value="promoted">Promoted</option>
            <option value="all">All</option>
          </select>

          <Link to="/events" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Explore Events</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Feedback Messages */}
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
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
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
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading your waitlist entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Clock size={40} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>No Waitlisted Events</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            {statusFilter === 'waiting'
              ? 'You are not currently waiting for any events.'
              : 'No entries matching this filter.'}
          </p>
          <Link to="/events" className="btn btn-primary">
            Browse Campus Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {entries.map((item) => {
            const ev = item.event;
            const isWaiting = item.status === 'waiting';
            const isPromoted = item.status === 'promoted';
            const isOperating = actionLoadingId === ev?._id;

            return (
              <div
                key={item._id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-4)',
                  borderLeft: isWaiting ? '4px solid #D97706' : isPromoted ? '4px solid #059669' : '4px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="badge badge-info" style={{ fontSize: '11px' }}>
                      {ev?.category}
                    </span>
                    {ev?.club?.name && (
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Layers size={13} />
                        <span>{ev.club.name}</span>
                      </span>
                    )}

                    {isWaiting && (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          fontWeight: 700,
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={12} />
                        <span>Position #{item.position || '—'}</span>
                      </span>
                    )}

                    {isPromoted && (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#DCFCE7',
                          color: '#166534',
                          fontWeight: 700,
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Promoted & Registered</span>
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '18px', margin: '2px 0' }}>
                    <Link to={`/events/${ev?._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {ev?.title}
                    </Link>
                  </h2>

                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--color-primary)" />
                      <span>{formatToIST(ev?.startDateTime)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} />
                      <span>{ev?.venue}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} />
                      <span>Joined: {formatToIST(item.joinedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  {isPromoted ? (
                    <Link
                      to="/student/my-tickets"
                      className="btn btn-primary"
                      style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '40px' }}
                    >
                      <Ticket size={14} />
                      <span>View My Ticket</span>
                    </Link>
                  ) : isWaiting ? (
                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleLeave(ev?._id, ev?.title)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #DC2626',
                        color: '#DC2626',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '40px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <UserX size={14} />
                      <span>{isOperating ? 'Leaving...' : 'Leave Waitlist'}</span>
                    </button>
                  ) : null}

                  <Link
                    to={`/events/${ev?._id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '8px 14px', minHeight: '40px' }}
                  >
                    View Event
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--color-text-secondary)', padding: '0 8px' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
