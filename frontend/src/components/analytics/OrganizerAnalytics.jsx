import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizerOverview } from '../../services/analyticsService';
import StatCard from './StatCard';
import {
  Briefcase,
  Users,
  CheckCircle2,
  PieChart,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Calendar,
} from 'lucide-react';

export default function OrganizerAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrganizerOverview();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load organizer analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
          Loading organizer metrics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: 'var(--space-4)',
          backgroundColor: '#FEE2E2',
          color: 'var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}
      >
        <AlertCircle size={18} />
        <span style={{ fontSize: '14px' }}>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard
          title="Total Events"
          value={data.totalEvents}
          subtitle="Managed club events"
          icon={Calendar}
          color="var(--color-primary)"
          bgColor="#EFF6FF"
        />

        <StatCard
          title="Total Registrations"
          value={data.totalRegistrations}
          subtitle="Across all managed events"
          icon={Users}
          color="#1D4ED8"
          bgColor="#EFF6FF"
        />

        <StatCard
          title="Verified Attendees"
          value={data.totalAttendees}
          subtitle="Checked in participants"
          icon={CheckCircle2}
          color="#15803D"
          bgColor="#DCFCE7"
        />

        <StatCard
          title="Average Check-In Rate"
          value={`${data.averageCheckInRate}%`}
          subtitle="Overall turnout"
          icon={UserCheck}
          color="#15803D"
          bgColor="#DCFCE7"
        />

        <StatCard
          title="Capacity Fill"
          value={`${data.capacityUtilization}%`}
          subtitle="Overall seat occupancy"
          icon={PieChart}
          color={data.capacityUtilization >= 80 ? '#B45309' : '#1D4ED8'}
          bgColor={data.capacityUtilization >= 80 ? '#FEF3C7' : '#EFF6FF'}
        />
      </div>

      {/* Events Breakdown Table */}
      {data.events && data.events.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--color-navy)' }}>
              Event Performance Breakdown
            </h3>
            <Link
              to="/organizer/events"
              style={{ fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <span>All Events</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '8px 12px' }}>Event</th>
                  <th style={{ padding: '8px 12px' }}>Club</th>
                  <th style={{ padding: '8px 12px' }}>Capacity</th>
                  <th style={{ padding: '8px 12px' }}>Registered</th>
                  <th style={{ padding: '8px 12px' }}>Turnout</th>
                  <th style={{ padding: '8px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ev.title}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{ev.clubName}</td>
                    <td style={{ padding: '10px 12px' }}>{ev.capacity}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600 }}>{ev.activeRegistrations}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                        ({ev.capacityUtilization}%)
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#16A34A', fontWeight: 600 }}>{ev.attended}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '4px' }}>
                        ({ev.checkInRate}%)
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link
                        to={`/organizer/events/${ev.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
