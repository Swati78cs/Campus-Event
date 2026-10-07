import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OrganizerAnalytics from '../../components/analytics/OrganizerAnalytics';
import { Briefcase, CalendarPlus, Users, BarChart3 } from 'lucide-react';

export default function OrganizerDashboard() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Briefcase size={28} color="var(--color-primary)" />
          <h1>Organizer Dashboard</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Welcome back, <strong>{user?.name}</strong>! Manage your club events, attendees, and volunteers.
        </p>
      </div>

      {/* Organizer Performance Overview */}
      <OrganizerAnalytics />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <CalendarPlus size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px' }}>Manage Events</h2>
          </div>
          <p style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>
            Create drafts, configure venue &amp; capacity, and publish campus events for your assigned clubs.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Link to="/organizer/events" className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 12px' }}>
              View Events
            </Link>
            <Link to="/organizer/events/new" className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
              Create Event
            </Link>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Users size={20} color="var(--color-qr)" />
            <h2 style={{ fontSize: '18px' }}>Volunteers &amp; Scans</h2>
          </div>
          <p style={{ fontSize: '14px' }}>
            Assign event-specific volunteers and review check-in performance here.
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <BarChart3 size={20} color="var(--color-ai)" />
            <h2 style={{ fontSize: '18px' }}>Analytics &amp; Feedback</h2>
          </div>
          <p style={{ fontSize: '14px' }}>
            Monitor capacity utilization and attendee feedback ratings.
          </p>
        </div>
      </div>
    </div>
  );
}
