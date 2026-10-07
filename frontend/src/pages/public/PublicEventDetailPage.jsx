import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPublicEvent } from '../../services/eventService';
import {
  registerForEvent,
  cancelRegistration,
  getMyRegistration,
} from '../../services/registrationService';
import { formatToIST, getPhaseBadgeConfig } from '../../utils/dateUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Layers,
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Ticket,
} from 'lucide-react';
import WaitlistStatus from '../../components/waitlist/WaitlistStatus';
import FeedbackForm from '../../components/feedback/FeedbackForm';

export default function PublicEventDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);

  const fetchEventData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublicEvent(id);
      setEvent(res.data.event);

      // If student is logged in, check their existing registration
      if (isAuthenticated && user?.role === 'student') {
        try {
          const regRes = await getMyRegistration(id);
          setMyRegistration(regRes.data?.registration || null);
        } catch {
          setMyRegistration(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Event could not be found or is not available for public discovery.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, isAuthenticated, user]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'student') {
      setError('Only students can register for events.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await registerForEvent(id);
      setMyRegistration(res.data?.registration);
      // Update local event registered count and available seats
      if (res.data?.event) {
        setEvent((prev) => ({
          ...prev,
          registeredCount: res.data.event.registeredCount,
          availableSeats: res.data.event.availableSeats,
          capacityStatus: res.data.event.capacityStatus,
        }));
      }
      navigate(`/student/events/${id}/confirmed`);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration for this event?')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await cancelRegistration(id);
      setMyRegistration(null);
      if (res.data?.event) {
        setEvent((prev) => ({
          ...prev,
          registeredCount: res.data.event.registeredCount,
          availableSeats: res.data.event.availableSeats,
          capacityStatus: res.data.event.capacityStatus,
        }));
      }
      setActionSuccess('Your registration has been cancelled.');
    } catch (err) {
      setError(err.message || 'Failed to cancel registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const badge = event ? getPhaseBadgeConfig(event.phase || event.status) : {};

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Back Link */}
      <div>
        <Link
          to="/events"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Event Discovery</span>
        </Link>
      </div>

      {/* Error / Not Found Message */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-4)',
            backgroundColor: '#FEE2E2',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={20} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Unable to Display Event</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading event details...</p>
        </div>
      ) : !event ? null : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Banner if present */}
          {event.bannerUrl && (
            <div
              style={{
                width: '100%',
                maxHeight: '300px',
                overflow: 'hidden',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#F1F5F9',
              }}
            >
              <img
                src={event.bannerUrl}
                alt={event.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <span className="badge badge-info">{event.category}</span>
                {event.club && (
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Layers size={14} />
                    <span>{event.club.name}</span>
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '28px', color: 'var(--color-navy)', lineHeight: 1.25 }}>{event.title}</h1>
            </div>

            <span
              className={`badge ${badge.className}`}
              style={badge.bg ? { backgroundColor: badge.bg, color: badge.color } : {}}
            >
              {badge.label}
            </span>
          </div>

          {/* Cancellation Notice if cancelled */}
          {event.status === 'cancelled' && (
            <div
              style={{
                padding: 'var(--space-4)',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
              }}
            >
              <ShieldAlert size={22} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong>This event has been cancelled</strong>
                <p style={{ fontSize: '14px', marginTop: '4px' }}>
                  Reason: {event.cancellationReason || 'No reason specified by organizers.'}
                </p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-4)',
              backgroundColor: '#F8FAFC',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Start Time (IST)
              </span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Clock size={16} color="var(--color-primary)" />
                <span>{formatToIST(event.startDateTime)}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                End Time (IST)
              </span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Clock size={16} color="var(--color-primary)" />
                <span>{formatToIST(event.endDateTime)}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Registration Deadline (IST)
              </span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Calendar size={16} color="var(--color-warning)" />
                <span>{formatToIST(event.registrationDeadline)}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Venue Location
              </span>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <MapPin size={16} color="var(--color-qr)" />
                <span>{event.venue}</span>
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Availability Status
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <Users size={16} color="var(--color-navy)" />
                <strong style={{ fontSize: '14px' }}>
                  {event.capacityStatus === 'FULL'
                    ? '0 Seats Left'
                    : `${event.availableSeats ?? (event.capacity - (event.registeredCount || 0))} Available`}
                </strong>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  ({event.registeredCount || 0} / {event.capacity} registered)
                </span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--color-navy)', marginBottom: 'var(--space-2)' }}>
              About This Event
            </h2>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
              {event.description}
            </p>
          </div>

          {/* Club Info Section if available */}
          {event.club && (
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <h3 style={{ fontSize: '15px', color: 'var(--color-navy)' }}>
                Organized by {event.club.name}
              </h3>
              {event.club.description && (
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {event.club.description}
                </p>
              )}
            </div>
          )}

          {/* Success Message Banner */}
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

          {/* Registration Action Controls */}
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 'var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            {/* Condition 1: Student is Already Registered */}
            {myRegistration ? (
              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Ticket size={24} color="#059669" />
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#065F46', margin: 0 }}>
                      You Are Registered!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#047857', marginTop: '2px' }}>
                      Registered on {formatToIST(myRegistration.registeredAt)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    to="/student/my-tickets"
                    className="btn btn-primary"
                    style={{ fontSize: '13px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Ticket size={14} />
                    <span>View My Ticket</span>
                  </Link>

                  <Link
                    to="/student/my-events"
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', minHeight: '40px' }}
                  >
                    View in My Events
                  </Link>

                  {event.allowCancellation && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleCancelRegistration}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-error)',
                        color: 'var(--color-error)',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minHeight: '40px',
                      }}
                    >
                      {actionLoading ? 'Cancelling...' : 'Cancel Registration'}
                    </button>
                  )}
                </div>
              </div>
            ) : event.status === 'cancelled' ? (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Registration is closed because this event has been cancelled.
              </div>
            ) : event.phase !== 'registration_open' ? (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <AlertCircle size={16} color="var(--color-warning)" />
                <span>
                  {event.phase === 'completed'
                    ? 'This event has concluded. Registration is closed.'
                    : event.phase === 'in_progress'
                    ? 'This event is currently in progress. Registration is closed.'
                    : 'Registration deadline has passed. Registration is closed.'}
                </span>
              </div>
            ) : event.capacityStatus === 'FULL' ? (
              <WaitlistStatus
                eventId={event._id}
                event={event}
                onStatusChange={() => {
                  loadEventDetails();
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  {event.capacityStatus === 'ALMOST_FULL' ? (
                    <div>
                      <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        Almost Full
                      </span>
                      <p style={{ fontSize: '13px', color: '#92400E', marginTop: '4px' }}>
                        Only {event.availableSeats ?? (event.capacity - (event.registeredCount || 0))} seats remaining!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: 'var(--color-navy)', display: 'block' }}>Seats Available</strong>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        {event.availableSeats ?? (event.capacity - (event.registeredCount || 0))} of {event.capacity} seats remaining
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRegister}
                  className="btn btn-primary"
                  style={{
                    minHeight: '44px',
                    padding: '10px 24px',
                    fontSize: '15px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Ticket size={18} />
                  <span>{actionLoading ? 'Confirming...' : 'Register for Event'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Student Feedback Form for Completed Events */}
          {isAuthenticated && (
            <FeedbackForm
              eventId={event._id}
              isCompleted={event.phase === 'completed'}
            />
          )}
        </div>
      )}
    </div>
  );
}
