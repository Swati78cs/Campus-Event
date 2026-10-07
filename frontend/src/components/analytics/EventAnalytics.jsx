import React, { useState, useEffect } from 'react';
import { getEventAnalytics } from '../../services/analyticsService';
import StatCard from './StatCard';
import RegistrationTrendChart from './RegistrationTrendChart';
import {
  BarChart3,
  Users,
  CheckCircle2,
  PieChart,
  UserCheck,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Edit3,
} from 'lucide-react';

export default function EventAnalytics({ eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getEventAnalytics(eventId);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load event analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [eventId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
          Loading event analytics...
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

  const { registrations, attendance, capacity, registrationTrend, event } = data;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <BarChart3 size={22} color="var(--color-primary)" />
          <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--color-navy)' }}>
            Event Performance &amp; Analytics
          </h2>
        </div>

        <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
          {event.status}
        </span>
      </div>

      {/* Grid of Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard
          title="Active Registrations"
          value={registrations.active}
          subtitle={`Capacity: ${event.capacity} (${registrations.availableSeats} available)`}
          icon={Users}
          color="var(--color-primary)"
          bgColor="#EFF6FF"
        />

        <StatCard
          title="Capacity Utilization"
          value={`${registrations.utilizationPercentage}%`}
          subtitle={
            registrations.cancelled > 0
              ? `${registrations.cancelled} cancelled registration${registrations.cancelled === 1 ? '' : 's'}`
              : 'Zero cancellations'
          }
          icon={PieChart}
          color={registrations.utilizationPercentage >= 80 ? '#B45309' : '#1D4ED8'}
          bgColor={registrations.utilizationPercentage >= 80 ? '#FEF3C7' : '#EFF6FF'}
          badge={registrations.utilizationPercentage >= 80 ? 'High' : undefined}
        />

        <StatCard
          title="Actual Attendees"
          value={attendance.checkedIn}
          subtitle={`Out of ${registrations.active} registered`}
          icon={CheckCircle2}
          color="#15803D"
          bgColor="#DCFCE7"
        />

        <StatCard
          title="Check-In Rate"
          value={`${attendance.checkInRate}%`}
          subtitle="Turnout percentage"
          icon={UserCheck}
          color={attendance.checkInRate >= 70 ? '#15803D' : '#6B7280'}
          bgColor={attendance.checkInRate >= 70 ? '#DCFCE7' : '#F3F4F6'}
        />
      </div>

      {/* Utilization & Attendance Progress Bars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
          backgroundColor: '#F8FAFC',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            <span>Capacity Fill</span>
            <span>{registrations.active} / {event.capacity} ({registrations.utilizationPercentage}%)</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, registrations.utilizationPercentage)}%`,
                height: '100%',
                backgroundColor: registrations.utilizationPercentage >= 80 ? '#F59E0B' : 'var(--color-primary)',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            <span>Turnout Rate</span>
            <span>{attendance.checkedIn} / {registrations.active} ({attendance.checkInRate}%)</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, attendance.checkInRate)}%`,
                height: '100%',
                backgroundColor: '#16A34A',
                borderRadius: '4px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Attendance Check-in Method Breakdown */}
      {attendance.checkedIn > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Check-In Method Breakdown
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <QrCode size={16} color="var(--color-qr)" />
              <span>QR Scans: <strong>{attendance.breakdown?.qr || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Edit3 size={16} color="var(--color-primary)" />
              <span>Manual Check-in: <strong>{attendance.breakdown?.manual || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <ShieldCheck size={16} color="#DC2626" />
              <span>Admin Override: <strong>{attendance.breakdown?.override || 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Sign-ups Over Time Chart */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
        <RegistrationTrendChart data={registrationTrend} />
      </div>
    </div>
  );
}
