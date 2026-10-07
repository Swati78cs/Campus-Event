import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { getMyTickets } from '../../services/ticketService';
import QRCodeDisplay from '../../components/tickets/QRCodeDisplay';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyTickets({
        status: statusFilter,
        page,
        limit: 10,
      });
      setTickets(res.data?.tickets || []);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err.response?.data?.message || 'Failed to load your tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, page]);

  const formatToIST = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <TicketIcon size={28} color="var(--color-primary)" />
            <span>My Tickets</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Present your digital QR tickets at campus event entrances for entry.
          </p>
        </div>

        <Link to="/events" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Discover More Events</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        {[
          { key: 'active', label: 'Active Tickets' },
          { key: 'cancelled', label: 'Cancelled' },
          { key: 'all', label: 'All Tickets' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`btn ${statusFilter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: statusFilter === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading your tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <TicketIcon size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
          <h3>No {statusFilter !== 'all' ? statusFilter : ''} tickets found</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 'var(--space-4)' }}>
            {statusFilter === 'active'
              ? 'You do not have any active tickets right now. Explore upcoming events and register!'
              : 'You have no tickets in this category.'}
          </p>
          <Link to="/events" className="btn btn-primary">
            Explore Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {tickets.map((t) => {
            const isTicketActive = t.status === 'active';
            const event = t.event;

            return (
              <div
                key={t._id}
                className="card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 'var(--space-5)',
                  alignItems: 'center',
                  borderLeft: isTicketActive ? '4px solid var(--color-success)' : '4px solid var(--color-text-secondary)',
                  opacity: isTicketActive ? 1 : 0.8,
                  backgroundColor: '#FFFFFF',
                }}
              >
                {/* Event Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {event?.category && (
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {event.category}
                      </span>
                    )}
                    {event?.club?.name && (
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Layers size={13} />
                        <span>{event.club.name}</span>
                      </span>
                    )}
                    <span
                      className={`badge ${isTicketActive ? 'badge-success' : 'badge-error'}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                      }}
                    >
                      {isTicketActive ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Valid Ticket</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>Ticket Cancelled</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '20px', margin: '4px 0' }}>
                    <Link to={`/events/${event?._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {event?.title || 'Event Details'}
                    </Link>
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color="var(--color-primary)" />
                      <span>{formatToIST(event?.startDateTime)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={15} color="var(--color-qr)" />
                      <span>{event?.venue || 'Campus Venue'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '2px' }}>
                      <Calendar size={14} />
                      <span>Issued: {formatToIST(t.issuedAt)}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                    <Link
                      to={`/student/tickets/${t._id}`}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '44px',
                      }}
                    >
                      <TicketIcon size={14} />
                      <span>Full Ticket View</span>
                    </Link>

                    <Link
                      to={`/events/${event?._id}`}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '44px',
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>Event Details</span>
                    </Link>
                  </div>
                </div>

                {/* QR Code Container */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {isTicketActive ? (
                    <QRCodeDisplay token={t.token} size={160} label={`${event?.title || 'Event'} Ticket QR`} />
                  ) : (
                    <div
                      style={{
                        width: '160px',
                        height: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FEE2E2',
                        border: '2px dashed #FECACA',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-error)',
                        textAlign: 'center',
                        padding: '12px',
                      }}
                    >
                      <XCircle size={32} />
                      <strong style={{ fontSize: '13px', marginTop: '8px' }}>VOID / CANCELLED</strong>
                      <span style={{ fontSize: '11px', marginTop: '4px' }}>This QR code is invalidated</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '14px' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
