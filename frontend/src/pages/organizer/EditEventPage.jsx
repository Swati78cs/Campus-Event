import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getEvent, updateEvent } from '../../services/eventService';
import { toDatetimeLocalIST, fromISTLocalToUTC } from '../../utils/dateUtils';
import { Edit2, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import AIDescriptionPanel from '../../components/ai/AIDescriptionPanel';

export default function EditEventPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    venue: '',
    capacity: 50,
    startDateTimeIST: '',
    endDateTimeIST: '',
    registrationDeadlineIST: '',
    bannerUrl: '',
    status: '',
    clubName: '',
  });

  const categories = ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getEvent(id);
        const ev = res.data.event;

        setFormData({
          title: ev.title,
          description: ev.description,
          category: ev.category,
          venue: ev.venue,
          capacity: ev.capacity,
          startDateTimeIST: toDatetimeLocalIST(ev.startDateTime),
          endDateTimeIST: toDatetimeLocalIST(ev.endDateTime),
          registrationDeadlineIST: toDatetimeLocalIST(ev.registrationDeadline),
          bannerUrl: ev.bannerUrl || '',
          status: ev.status,
          clubName: ev.club?.name || '',
        });
      } catch (err) {
        setError(err.message || 'Failed to load event for editing.');
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (new Date(formData.endDateTimeIST) <= new Date(formData.startDateTimeIST)) {
      setError('Event end date and time must be after the start date and time.');
      return;
    }

    if (new Date(formData.registrationDeadlineIST) > new Date(formData.startDateTimeIST)) {
      setError('Registration deadline cannot be after the event start time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue: formData.venue,
        capacity: Number(formData.capacity),
        startDateTime: fromISTLocalToUTC(formData.startDateTimeIST),
        endDateTime: fromISTLocalToUTC(formData.endDateTimeIST),
        registrationDeadline: fromISTLocalToUTC(formData.registrationDeadlineIST),
        bannerUrl: formData.bannerUrl,
      };

      await updateEvent(id, payload);
      navigate(user?.role === 'admin' ? '/admin/events' : '/organizer/events');
    } catch (err) {
      setError(err.message || 'Failed to update event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <Link
          to={user?.role === 'admin' ? '/admin/events' : '/organizer/events'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', textDecoration: 'none', fontSize: '14px', marginBottom: 'var(--space-2)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Edit2 size={28} color="var(--color-primary)" />
          <h1>Edit Event</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Editing event for <strong>{formData.clubName}</strong>. Timestamps are formatted and edited in IST.
        </p>
      </div>

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
      ) : formData.status === 'cancelled' ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <h2>Cannot Edit Cancelled Event</h2>
          <p style={{ marginTop: 'var(--space-2)' }}>
            This event has been cancelled and cannot be modified.
          </p>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={labelStyle}>Event Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label style={labelStyle}>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={inputStyle}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Seating Capacity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Venue / Location *</label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Timings in IST */}
            <div style={{ backgroundColor: '#F8FAFC', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <strong style={{ fontSize: '14px', color: 'var(--color-navy)' }}>
                Event Timings (Indian Standard Time — IST)
              </strong>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                <div>
                  <label style={labelStyle}>Start Date &amp; Time (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDateTimeIST}
                    onChange={(e) => setFormData({ ...formData, startDateTimeIST: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>End Date &amp; Time (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDateTimeIST}
                    onChange={(e) => setFormData({ ...formData, endDateTimeIST: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Registration Deadline (IST) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.registrationDeadlineIST}
                    onChange={(e) => setFormData({ ...formData, registrationDeadlineIST: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description *</label>

              <AIDescriptionPanel
                title={formData.title}
                eventId={id}
                category={formData.category}
                venue={formData.venue}
                startDateTimeIST={formData.startDateTimeIST}
                endDateTimeIST={formData.endDateTimeIST}
                currentDescription={formData.description}
                onApplyDescription={(desc) => setFormData((prev) => ({ ...prev, description: desc }))}
              />

              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Banner Image URL</label>
              <input
                type="url"
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                placeholder="https://example.com/banner.jpg"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <Link to={user?.role === 'admin' ? '/admin/events' : '/organizer/events'} className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  fontSize: '14px',
};
