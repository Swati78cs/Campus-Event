import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyEvents, cancelRegistration } from '../../services/registrationService';
import { formatToIST } from '../../utils/dateUtils';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
} from 'lucide-react';

export default function MyEventsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEvents({ page, limit: 20, status: statusFilter });
      setRegistrations(res.data?.registrations || []);
      setPagination(res.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load your event registrations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [page, statusFilter]);

  const handleCancel = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to cancel your registration for "${eventTitle}"?`)) {
      return;
    }

    setCancellingId(eventId);
    setError(null);
    setActionSuccess(null);

    try {
      await cancelRegistration(eventId);
      setActionSuccess(`Registration for "${eventTitle}" has been cancelled.`);
      fetchRegistrations();
    } catch (err) {
      setError(err.message || 'Failed to cancel registration.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Ticket size={28} color="var(--color-primary)" />
            <h1 style={{ fontSize: '28px', color: 'var(--color-navy)' }}>My Registered Events</h1>
          </div>
          <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
            View and manage all your campus event registrations.
          </p>
        </div>

        <Link
          to="/events"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '40px' }}
        >
          <Compass size={16} />
          <span>Discover More Events</span>
        </Link>
      </div>

      {/* Success Alert */}
      {actionSuccess && (
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
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
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

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {['active', 'cancelled', 'all'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)',
              backgroundColor: statusFilter === tab ? 'var(--color-primary)' : '#FFFFFF',
              color: statusFilter === tab ? '#FFFFFF' : 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '36px',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'active' ? 'Active Registrations' : tab === 'cancelled' ? 'Cancelled History' : 'All Registrations'}
          </button>
        ))}
      </div>

      {/* Registrations List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading your events...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Ticket size={40} color="var(--color-text-muted)" style={{ margin: '0 auto var(--space-3)' }} />
          <h2 style={{ fontSize: '18px', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
            No Registrations Found
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto var(--space-4)' }}>
            {statusFilter === 'active'
              ? 'You have not registered for any upcoming events yet. Discover events happening on campus and reserve your seat.'
              : 'No registration records found for this filter.'}
          </p>
          <Link
            to="/events"
            className="btn btn-primary"
            style={{ margin: '0 auto', display: 'inline-flex', minHeight: '40px' }}
          >
            Browse Campus Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {registrations.map((reg) => {
            const ev = reg.event;
            if (!ev) return null;

            const isCancelled = reg.status === 'cancelled';

            return (
              <div
                key={reg._id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-4)',
                  opacity: isCancelled ? 0.75 : 1,
                  borderLeft: isCancelled ? '4px solid var(--color-error)' : '4px solid var(--color-success)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="badge badge-info">{ev.category}</span>
                    {ev.club && (
                      <span style={{ fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <Layers size={13} />
                        <span>{ev.club.name}</span>
                      </span>
                    )}
                    <span
                      className={`badge ${isCancelled ? 'badge-error' : 'badge-success'}`}
                      style={{ fontSize: '11px', textTransform: 'uppercase' }}
                    >
                      {reg.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', color: 'var(--color-navy)', margin: 0 }}>
                    {ev.title}
                  </h3>

                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="var(--color-primary)" />
                      <span>{formatToIST(ev.startDateTime)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="var(--color-qr)" />
                      <span>{ev.venue}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="var(--color-text-muted)" />
                      <span>Registered on: {formatToIST(reg.registeredAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {!isCancelled && (
                    <Link
                      to="/student/my-tickets"
                      className="btn btn-primary"
                      style={{ fontSize: '13px', minHeight: '38px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Ticket size={14} />
                      <span>View Ticket</span>
                    </Link>
                  )}

                  <Link
                    to={`/events/${ev._id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', minHeight: '38px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View Event</span>
                    <ArrowRight size={14} />
                  </Link>

                  {!isCancelled && ev.allowCancellation && (
                    <button
                      type="button"
                      disabled={cancellingId === ev._id}
                      onClick={() => handleCancel(ev._id, ev.title)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-error)',
                        color: 'var(--color-error)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '38px',
                      }}
                    >
                      {cancellingId === ev._id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)',
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '40px' }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)' }}>
            {pagination.page} / {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '40px' }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
