import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getEvent, publishEvent, cancelEvent } from '../../services/eventService';
import { getEventRegistrations } from '../../services/registrationService';
import VolunteerManager from '../../components/events/VolunteerManager';
import WaitlistPanel from '../../components/waitlist/WaitlistPanel';
import AnnouncementPanel from '../../components/notifications/AnnouncementPanel';
import CertificateManagement from '../../components/certificates/CertificateManagement';
import FeedbackManagement from '../../components/feedback/FeedbackManagement';
import EventAnalytics from '../../components/analytics/EventAnalytics';
import { formatToIST, getPhaseBadgeConfig } from '../../utils/dateUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Layers,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Edit2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const fetchEvent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvent(id);
      setEvent(res.data.event);

      // Fetch registrations for organizer/admin
      setLoadingAttendees(true);
      try {
        const regRes = await getEventRegistrations(id, { limit: 100 });
        setAttendees(regRes.data?.registrations || []);
      } catch (regErr) {
        console.error('Failed to load attendees:', regErr);
      } finally {
        setLoadingAttendees(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this event?')) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await publishEvent(id);
      setEvent(res.data.event);
      setSuccessMsg('Event has been successfully published!');
    } catch (err) {
      setError(err.message || 'Failed to publish event.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Please enter the reason for event cancellation:');
    if (reason === null) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await cancelEvent(id, reason);
      setEvent(res.data.event);
      setSuccessMsg('Event has been marked as cancelled.');
    } catch (err) {
      setError(err.message || 'Failed to cancel event.');
    } finally {
      setIsProcessing(false);
    }
  };

  const backUrl = user?.role === 'admin' ? '/admin/events' : '/organizer/events';
  const badge = event ? getPhaseBadgeConfig(event.phase || event.status) : {};

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Back Link */}
      <div>
        <Link
          to={backUrl}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', textDecoration: 'none', fontSize: '14px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Events List</span>
        </Link>
      </div>

      {successMsg && (
        <div
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

      {error && (
        <div
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

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading event information...</p>
        </div>
      ) : !event ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Event not found.</p>
        </div>
      ) : (
        <>
          {/* Main Event Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Banner if present */}
            {event.bannerUrl && (
              <div style={{ width: '100%', height: '240px', overflow: 'hidden', borderRadius: 'var(--radius-sm)', backgroundColor: '#E2E8F0' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                  <span className="badge badge-info">{event.category}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <Layers size={14} />
                    <span>{event.club?.name}</span>
                  </span>
                </div>
                <h1 style={{ fontSize: '28px' }}>{event.title}</h1>
              </div>

              <span
                className={`badge ${badge.className}`}
                style={badge.bg ? { backgroundColor: badge.bg, color: badge.color } : {}}
              >
                {badge.label}
              </span>
            </div>

            {/* Cancelled Banner */}
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
                    Reason: {event.cancellationReason || 'No reason specified by organizer.'}
                  </p>
                  <p style={{ fontSize: '12px', marginTop: '4px', color: '#991B1B' }}>
                    Cancelled on: {formatToIST(event.cancelledAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', backgroundColor: '#F8FAFC', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Start Time (IST)</span>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Clock size={16} color="var(--color-primary)" />
                  <span>{formatToIST(event.startDateTime)}</span>
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>End Time (IST)</span>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Clock size={16} color="var(--color-primary)" />
                  <span>{formatToIST(event.endDateTime)}</span>
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Registration Deadline (IST)</span>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Calendar size={16} color="var(--color-warning)" />
                  <span>{formatToIST(event.registrationDeadline)}</span>
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Venue</span>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <MapPin size={16} color="var(--color-qr)" />
                  <span>{event.venue}</span>
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Seating Capacity</span>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Users size={16} color="var(--color-navy)" />
                  <span>{event.capacity} Attendees</span>
                </strong>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: 'var(--space-2)' }}>Event Details</h2>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                {event.description}
              </p>
            </div>

            {/* Organizer Controls */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              {event.status === 'draft' && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePublish}
                  className="btn btn-primary"
                >
                  {isProcessing ? 'Processing...' : 'Publish Event'}
                </button>
              )}

              {event.status !== 'cancelled' && (
                <>
                  {event.status === 'published' && (
                    <Link
                      to={`/events/${event._id}/attendance`}
                      className="btn btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#ffffff',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Live Check-In & Scanner</span>
                    </Link>
                  )}

                  <Link
                    to={user?.role === 'admin' ? `/admin/events/${event._id}/edit` : `/organizer/events/${event._id}/edit`}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit2 size={16} />
                    <span>Edit Event</span>
                  </Link>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCancel}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-error)',
                      color: 'var(--color-error)',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <XCircle size={16} />
                    <span>Cancel Event</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Event Performance & Analytics Card (Organizer/Admin only) */}
          <EventAnalytics eventId={event._id} />

          {/* Registered Attendees Card (Organizer/Admin only) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Users size={20} color="var(--color-navy)" />
                <h2 style={{ fontSize: '18px', margin: 0 }}>Registered Attendees</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="badge" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>
                  {attendees.length} Registered / {event.capacity} Capacity
                </span>
                {event.capacityStatus === 'ALMOST_FULL' && (
                  <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                    Almost Full
                  </span>
                )}
                {event.capacityStatus === 'FULL' && (
                  <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 600 }}>
                    Full
                  </span>
                )}
              </div>
            </div>

            {loadingAttendees ? (
              <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-4)', textAlign: 'center' }}>
                Loading attendee registrations...
              </p>
            ) : attendees.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-4)', textAlign: 'center' }}>
                No students have registered for this event yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '10px 14px' }}>Student Name</th>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((reg) => (
                      <tr key={reg._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{reg.student?.name || 'Unknown'}</td>
                        <td style={{ padding: '10px 14px' }}>{reg.student?.email || 'N/A'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={`badge ${reg.status === 'active' ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                            {reg.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)' }}>
                          {formatToIST(reg.registeredAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Volunteer Management Card (Organizer/Admin only) */}
          <VolunteerManager eventId={event._id} />

          {/* Waitlist Management Card (Organizer/Admin only) */}
          <WaitlistPanel eventId={event._id} />

          {/* Broadcast Announcement Card (Organizer/Admin only) */}
          <AnnouncementPanel eventId={event._id} eventStatus={event.status} />

          {/* Certificate Management Card (Organizer/Admin only) */}
          <CertificateManagement
            eventId={event._id}
            eventStatus={event.status}
            isCompleted={event.phase === 'completed'}
            initialCertificateEnabled={event.certificateEnabled}
            onEventUpdated={fetchEvent}
          />

          {/* Feedback Management Card (Organizer/Admin only) */}
          <FeedbackManagement eventId={event._id} />
        </>
      )}
    </div>
  );
}
