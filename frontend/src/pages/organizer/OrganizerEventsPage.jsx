import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthorizedEvents, publishEvent, cancelEvent } from '../../services/eventService';
import { formatToIST, getPhaseBadgeConfig } from '../../utils/dateUtils';
import {
  Calendar,
  Plus,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Edit2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL');

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuthorizedEvents();
      setEvents(res.data?.events || []);
    } catch (err) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handlePublish = async (eventId, title) => {
    if (!window.confirm(`Publish "${title}" now? Students will be able to discover and register.`)) return;
    setError(null);
    try {
      const res = await publishEvent(eventId);
      setEvents((prev) => prev.map((e) => (e._id === eventId ? res.data.event : e)));
      setSuccessMsg(`Event "${title}" has been published!`);
    } catch (err) {
      setError(err.message || 'Failed to publish event.');
    }
  };

  const handleCancel = async (eventId, title) => {
    const reason = window.prompt(`Enter reason for cancelling "${title}":`);
    if (reason === null) return;
    setError(null);
    try {
      const res = await cancelEvent(eventId, reason);
      setEvents((prev) => prev.map((e) => (e._id === eventId ? res.data.event : e)));
      setSuccessMsg(`Event "${title}" has been cancelled.`);
    } catch (err) {
      setError(err.message || 'Failed to cancel event.');
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'DRAFT') return e.status === 'draft';
    if (filterTab === 'PUBLISHED') return e.status === 'published';
    if (filterTab === 'CANCELLED') return e.status === 'cancelled';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Calendar size={28} color="var(--color-primary)" />
            <h1>Event Management</h1>
          </div>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Create, draft, publish, and oversee events belonging to your assigned clubs.
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Plus size={18} />
          <span>Create New Event</span>
        </Link>
      </div>

      {/* Notifications */}
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

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        {['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: filterTab === tab ? 'var(--color-primary)' : 'transparent',
              color: filterTab === tab ? '#FFFFFF' : 'var(--color-text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {tab} ({events.filter((e) => (tab === 'ALL' ? true : e.status === tab.toLowerCase())).length})
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Calendar size={36} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-2)' }} />
          <h2>No Events Found</h2>
          <p style={{ marginTop: 'var(--space-2)' }}>
            No events match the selected filter. Click &quot;Create New Event&quot; to schedule your first club activity.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredEvents.map((event) => {
            const badge = getPhaseBadgeConfig(event.phase || event.status);

            return (
              <div key={event._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Header with Club & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={14} />
                      <span>{event.club?.name || 'Club'}</span>
                    </span>
                    <h2 style={{ fontSize: '18px', marginTop: '4px' }}>{event.title}</h2>
                  </div>

                  <span
                    className={`badge ${badge.className}`}
                    style={badge.bg ? { backgroundColor: badge.bg, color: badge.color } : {}}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Event Metadata (IST) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--color-navy)" />
                    <span>{formatToIST(event.startDateTime)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} color="var(--color-navy)" />
                    <span>{event.venue}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} color="var(--color-navy)" />
                    <span>Capacity: {event.capacity} seats</span>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', flex: 1 }}>
                  {event.description?.length > 130 ? `${event.description.substring(0, 130)}...` : event.description}
                </p>

                {/* Cancellation Alert if cancelled */}
                {event.status === 'cancelled' && (
                  <div style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-error)' }}>
                    <strong>Cancelled:</strong> {event.cancellationReason || 'No reason provided'}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <Link
                    to={`/organizer/events/${event._id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 10px', minHeight: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={14} />
                    <span>Details</span>
                  </Link>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {event.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(event._id, event.title)}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '4px 10px', minHeight: '30px' }}
                      >
                        Publish
                      </button>
                    )}

                    {event.status !== 'cancelled' && (
                      <>
                        <Link
                          to={`/organizer/events/${event._id}/edit`}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '4px 10px', minHeight: '30px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleCancel(event._id, event.title)}
                          style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            minHeight: '30px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-error)',
                            color: 'var(--color-error)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <XCircle size={13} />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
