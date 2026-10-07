import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthorizedEvents, publishEvent, cancelEvent } from '../../services/eventService';
import { getClubs } from '../../services/clubService';
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
  Shield,
} from 'lucide-react';

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [filterTab, setFilterTab] = useState('ALL');
  const [selectedClubId, setSelectedClubId] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, clubsRes] = await Promise.all([getAuthorizedEvents(), getClubs()]);
      setEvents(eventsRes.data?.events || []);
      setClubs(clubsRes.data?.clubs || []);
    } catch (err) {
      setError(err.message || 'Failed to load platform events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublish = async (eventId, title) => {
    if (!window.confirm(`Publish "${title}" now?`)) return;
    try {
      const res = await publishEvent(eventId);
      setEvents((prev) => prev.map((e) => (e._id === eventId ? res.data.event : e)));
      setSuccessMsg(`Event "${title}" published!`);
    } catch (err) {
      setError(err.message || 'Failed to publish event.');
    }
  };

  const handleCancel = async (eventId, title) => {
    const reason = window.prompt(`Enter reason for cancelling "${title}":`);
    if (reason === null) return;
    try {
      const res = await cancelEvent(eventId, reason);
      setEvents((prev) => prev.map((e) => (e._id === eventId ? res.data.event : e)));
      setSuccessMsg(`Event "${title}" has been cancelled.`);
    } catch (err) {
      setError(err.message || 'Failed to cancel event.');
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesTab = filterTab === 'ALL' || e.status === filterTab.toLowerCase();
    const matchesClub = selectedClubId === 'ALL' || e.club?._id === selectedClubId;
    return matchesTab && matchesClub;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Shield size={28} color="var(--color-primary)" />
            <h1>Platform Event Oversight</h1>
          </div>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Global event management across all university clubs and student societies.
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Plus size={18} />
          <span>Create Campus Event</span>
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

      {/* Filter and Club Controls */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: filterTab === tab ? 'var(--color-primary)' : 'transparent',
                color: filterTab === tab ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-navy)' }}>Filter by Club:</label>
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '13px' }}
          >
            <option value="ALL">All Clubs</option>
            {clubs.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Events */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading platform events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>No events found for this filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredEvents.map((event) => {
            const badge = getPhaseBadgeConfig(event.phase || event.status);

            return (
              <div key={event._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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

                {event.status === 'cancelled' && (
                  <div style={{ padding: '6px 10px', backgroundColor: '#FEE2E2', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--color-error)' }}>
                    <strong>Cancelled:</strong> {event.cancellationReason || 'No reason specified'}
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    to={`/admin/events/${event._id}`}
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
                          to={`/admin/events/${event._id}/edit`}
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
