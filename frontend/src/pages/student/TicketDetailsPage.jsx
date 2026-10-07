import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  User,
  Mail,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { getTicketById } from '../../services/ticketService';
import QRCodeDisplay from '../../components/tickets/QRCodeDisplay';

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getTicketById(ticketId);
        setTicket(res.data?.ticket || null);
      } catch (err) {
        console.error('Failed to load ticket:', err);
        setError(err.response?.data?.message || 'Failed to load ticket details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  const formatToIST = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading your ticket pass...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto' }}>
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--color-error)" style={{ margin: '0 auto var(--space-3)' }} />
          <h2>Ticket Unavailable</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 'var(--space-4)' }}>
            {error || 'This ticket could not be found or you do not have permission to view it.'}
          </p>
          <Link to="/student/my-tickets" className="btn btn-primary" style={{ minHeight: '44px' }}>
            Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  const isTicketActive = ticket.status === 'active';
  const event = ticket.event;
  const student = ticket.student;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Back button */}
      <Link
        to="/student/my-tickets"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          fontSize: '14px',
          minHeight: '44px',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to My Tickets</span>
      </Link>

      {/* Ticket Pass Card */}
      <div
        className="card"
        style={{
          padding: '0',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--color-border)',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Pass Header Banner */}
        <div
          style={{
            backgroundColor: isTicketActive ? 'var(--color-navy)' : '#64748B',
            color: '#FFFFFF',
            padding: 'var(--space-5)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {event?.category || 'Event'}
            </span>

            {event?.club?.name && (
              <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                <Layers size={13} />
                <span>{event.club.name}</span>
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '22px', margin: '4px 0', color: '#FFFFFF' }}>{event?.title}</h1>

          {/* Status Badge */}
          <div style={{ marginTop: '10px' }}>
            <span
              className={`badge ${isTicketActive ? 'badge-success' : 'badge-error'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 12px',
              }}
            >
              {isTicketActive ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Valid Entry Pass</span>
                </>
              ) : (
                <>
                  <XCircle size={14} />
                  <span>Cancelled / Invalid</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* QR Code Presentation Section */}
        <div
          style={{
            padding: 'var(--space-6) var(--space-4)',
            backgroundColor: '#F8FAFC',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '2px dashed var(--color-border)',
          }}
        >
          {isTicketActive ? (
            <QRCodeDisplay token={ticket.token} size={220} label={`${event?.title} Entry QR`} />
          ) : (
            <div
              style={{
                width: '200px',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FEE2E2',
                border: '2px dashed #FECACA',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                padding: '16px',
              }}
            >
              <XCircle size={44} />
              <strong style={{ marginTop: '10px', fontSize: '15px' }}>CANCELLED</strong>
              <p style={{ fontSize: '12px', marginTop: '6px' }}>This ticket was invalidated and cannot be used for entry.</p>
            </div>
          )}

          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px' }}>
            {isTicketActive
              ? 'Present this barcode to event volunteers at check-in.'
              : 'Registration has been cancelled.'}
          </p>
        </div>

        {/* Event & Attendee Metadata Body */}
        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Attendee Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Attendee</span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <User size={14} color="var(--color-primary)" />
                <span>{student?.name || 'Student'}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Email</span>
              <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: 'var(--color-text-secondary)' }}>
                <Mail size={14} />
                <span>{student?.email || 'N/A'}</span>
              </span>
            </div>
          </div>

          {/* Event Time & Venue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Start Time (IST)</span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Clock size={15} color="var(--color-primary)" />
                <span>{formatToIST(event?.startDateTime)}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Venue</span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <MapPin size={15} color="var(--color-qr)" />
                <span>{event?.venue || 'Campus Venue'}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Issued Timestamp</span>
              <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: 'var(--color-text-secondary)' }}>
                <Calendar size={14} />
                <span>{formatToIST(ticket.issuedAt)}</span>
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#EFF6FF',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #DBEAFE',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#1E40AF',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Digital Ticket Pass verified by campus event security.</span>
          </div>

          {/* Action Links */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Link
              to={`/events/${event?._id}`}
              className="btn btn-secondary"
              style={{ flex: 1, textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Event Page
            </Link>
            <Link
              to="/student/my-tickets"
              className="btn btn-primary"
              style={{ flex: 1, textAlign: 'center', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              My Tickets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
