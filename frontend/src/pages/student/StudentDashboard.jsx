import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyVolunteerStatus } from '../../services/volunteerService';
import { GraduationCap, Calendar, Ticket, Award, ShieldCheck, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [hasVolunteerAssignments, setHasVolunteerAssignments] = useState(false);

  useEffect(() => {
    getMyVolunteerStatus()
      .then((res) => {
        setHasVolunteerAssignments(Boolean(res.data?.hasActiveAssignments));
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <GraduationCap size={28} color="var(--color-primary)" />
          <h1>Student Dashboard</h1>
        </div>
        <p style={{ marginTop: 'var(--space-2)' }}>
          Welcome back, <strong>{user?.name}</strong>! Explore campus activities and manage your tickets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Calendar size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px' }}>Campus Events</h2>
          </div>
          <p style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>
            Discover workshops, hackathons, and activities scheduled across the university.
          </p>
          <Link
            to="/events"
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex' }}
          >
            Explore Events
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Ticket size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px' }}>My Tickets</h2>
          </div>
          <p style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>
            Access digital QR passes to present at event entrances for check-in.
          </p>
          <Link
            to="/student/my-tickets"
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex' }}
          >
            Open My Tickets
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Calendar size={20} color="var(--color-qr)" />
            <h2 style={{ fontSize: '18px' }}>My Events</h2>
          </div>
          <p style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>
            Review your active registrations and manage booking statuses.
          </p>
          <Link
            to="/student/my-events"
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex' }}
          >
            View My Events
          </Link>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Clock size={20} color="#D97706" />
            <h2 style={{ fontSize: '18px' }}>My Waitlist</h2>
          </div>
          <p style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>
            Monitor waitlist positions and promotion status for full capacity events.
          </p>
          <Link
            to="/student/waitlist"
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex' }}
          >
            View My Waitlist
          </Link>
        </div>

        {hasVolunteerAssignments && (
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <ShieldCheck size={20} color="var(--color-primary)" />
              <h2 style={{ fontSize: '18px' }}>Volunteer Events</h2>
            </div>
            <p style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>
              You have active volunteer duties. View event information and assignments.
            </p>
            <Link
              to="/volunteer/events"
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex' }}
            >
              Assigned Events
            </Link>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Award size={20} color="var(--color-ai)" />
            <h2 style={{ fontSize: '18px' }}>Certificates</h2>
          </div>
          <p style={{ fontSize: '14px' }}>
            Certificates earned upon verified attendance will be downloadable here.
          </p>
        </div>
      </div>
    </div>
  );
}
