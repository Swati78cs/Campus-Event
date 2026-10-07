import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicEvent } from '../../services/eventService';
import { getTicketForEvent } from '../../services/ticketService';
import { formatToIST } from '../../utils/dateUtils';
import QRCodeDisplay from '../../components/tickets/QRCodeDisplay';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Layers,
  ArrowRight,
  Ticket,
  ExternalLink,
} from 'lucide-react';

export default function RegistrationConfirmedPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, ticketRes] = await Promise.allSettled([
          getPublicEvent(id),
          getTicketForEvent(id),
        ]);

        if (eventRes.status === 'fulfilled') {
          setEvent(eventRes.value.data?.event);
        }
        if (ticketRes.status === 'fulfilled') {
          setTicket(ticketRes.value.data?.ticket);
        }
      } catch (err) {
        console.error('Failed to load confirmation details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Confirmation Success Header Card */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-3)',
          borderTop: '4px solid var(--color-success)',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-2)',
          }}
        >
          <CheckCircle2 size={36} color="var(--color-success)" />
        </div>

        <h1 style={{ fontSize: '26px', color: 'var(--color-navy)', margin: 0 }}>
          Registration Confirmed!
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', maxWidth: '440px' }}>
          Your seat has been reserved and your digital entry ticket has been issued.
        </p>

        {loading ? (
          <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Loading event details...</p>
        ) : (
          <>
            {/* Event Summary Card */}
            {event && (
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-5)',
                  marginTop: 'var(--space-2)',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                    <span className="badge badge-info">{event.category}</span>
                    {event.club && (
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={13} />
                        <span>{event.club.name}</span>
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: '18px', color: 'var(--color-navy)', margin: 0 }}>
                    {event.title}
                  </h2>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--color-primary)" />
                    <strong>Starts: {formatToIST(event.startDateTime)}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} color="var(--color-qr)" />
                    <span>Venue: {event.venue}</span>
                  </div>
                </div>
              </div>
            )}

            {/* QR Ticket Pass Box */}
            {ticket && ticket.status === 'active' && (
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-5)',
                  marginTop: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                }}
              >
                <span className="badge badge-success" style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Digital Entry Pass Ready
                </span>

                <QRCodeDisplay token={ticket.token} size={180} label="Event Entry QR" />

                <Link
                  to={`/student/tickets/${ticket._id}`}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px' }}
                >
                  <Ticket size={16} />
                  <span>Open Full Ticket Pass</span>
                </Link>
              </div>
            )}
          </>
        )}

        {/* Navigation Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-4)',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <Link
            to="/student/my-tickets"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}
          >
            <Ticket size={16} />
            <span>My Tickets</span>
          </Link>

          <Link
            to="/student/my-events"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}
          >
            <span>My Events</span>
          </Link>

          <Link
            to="/events"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}
          >
            <span>Browse Events</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
