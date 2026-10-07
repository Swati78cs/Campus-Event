import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyClubs, getClubs } from '../../services/clubService';
import { createEvent } from '../../services/eventService';
import { fromISTLocalToUTC } from '../../utils/dateUtils';
import { CalendarPlus, AlertCircle, ArrowLeft, Info } from 'lucide-react';
import AIDescriptionPanel from '../../components/ai/AIDescriptionPanel';

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields in IST local format
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clubId: '',
    category: 'Technical',
    venue: '',
    capacity: 50,
    startDateTimeIST: '',
    endDateTimeIST: '',
    registrationDeadlineIST: '',
    bannerUrl: '',
    status: 'draft',
  });

  const categories = ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];

  useEffect(() => {
    const loadClubs = async () => {
      setLoadingClubs(true);
      try {
        // Organizers fetch their assigned clubs; Admins can select any active club
        const res = user?.role === 'admin' ? await getClubs() : await getMyClubs();
        const availableClubs = res.data?.clubs || [];
        setClubs(availableClubs);
        if (availableClubs.length > 0) {
          setFormData((prev) => ({ ...prev, clubId: availableClubs[0]._id }));
        }
      } catch (err) {
        setError(err.message || 'Failed to load authorized clubs.');
      } finally {
        setLoadingClubs(false);
      }
    };
    loadClubs();
  }, [user]);

  const handleSubmit = async (targetStatus) => {
    setError(null);

    // Basic frontend sanity checks
    if (!formData.startDateTimeIST || !formData.endDateTimeIST || !formData.registrationDeadlineIST) {
      setError('Please provide all event dates (Start, End, and Registration Deadline).');
      return;
    }

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
      // Convert IST local input strings into standard UTC ISO strings for server storage
      const payload = {
        title: formData.title,
        description: formData.description,
        clubId: formData.clubId,
        category: formData.category,
        venue: formData.venue,
        capacity: Number(formData.capacity),
        startDateTime: fromISTLocalToUTC(formData.startDateTimeIST),
        endDateTime: fromISTLocalToUTC(formData.endDateTimeIST),
        registrationDeadline: fromISTLocalToUTC(formData.registrationDeadlineIST),
        bannerUrl: formData.bannerUrl,
        status: targetStatus,
      };

      await createEvent(payload);
      navigate(user?.role === 'admin' ? '/admin/events' : '/organizer/events');
    } catch (err) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Back button and Header */}
      <div>
        <Link
          to={user?.role === 'admin' ? '/admin/events' : '/organizer/events'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', textDecoration: 'none', fontSize: '14px', marginBottom: 'var(--space-2)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Events</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <CalendarPlus size={28} color="var(--color-primary)" />
          <h1>Create Campus Event</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)' }}>
          All event dates and times are displayed and entered in Indian Standard Time (IST) and stored in UTC.
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

      {loadingClubs ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Verifying authorized clubs...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <Info size={32} color="var(--color-warning)" style={{ margin: '0 auto var(--space-2)' }} />
          <h2>No Authorized Clubs Found</h2>
          <p style={{ marginTop: 'var(--space-2)' }}>
            You cannot create events because you are not currently assigned to any active campus club. Please contact a Campus Administrator.
          </p>
        </div>
      ) : (
        <div className="card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit('draft');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            {/* Title */}
            <div>
              <label style={labelStyle}>Event Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. National Hackathon 2026"
                style={inputStyle}
              />
            </div>

            {/* Club and Category */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label style={labelStyle}>Host Club *</label>
                <select
                  required
                  value={formData.clubId}
                  onChange={(e) => setFormData({ ...formData, clubId: e.target.value })}
                  style={inputStyle}
                >
                  {clubs.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.category})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'block' }}>
                  {user?.role === 'admin' ? 'All active campus clubs' : 'Only clubs assigned to you'}
                </span>
              </div>

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
            </div>

            {/* Venue and Capacity */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              <div>
                <label style={labelStyle}>Venue / Location *</label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Main Auditorium / Lab 3"
                  style={inputStyle}
                />
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

            {/* Date and Times (IST) */}
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

            {/* Description & AI Assistant */}
            <div>
              <label style={labelStyle}>Event Description * (min 10 characters)</label>

              <AIDescriptionPanel
                title={formData.title}
                clubId={formData.clubId}
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
                placeholder="Detailed description of schedule, prerequisites, rules, and speaker information..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Banner URL */}
            <div>
              <label style={labelStyle}>Banner Image URL (Optional external URL)</label>
              <input
                type="url"
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                placeholder="https://example.com/banner.jpg"
                style={inputStyle}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('draft')}
                className="btn btn-secondary"
              >
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('published')}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Publishing...' : 'Create & Publish Immediately'}
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
