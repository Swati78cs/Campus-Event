import React, { useState, useEffect } from 'react';
import { getAdminOverview } from '../../services/analyticsService';
import StatCard from './StatCard';
import {
  ShieldAlert,
  Users,
  Layers,
  Calendar,
  CheckCircle2,
  UserCheck,
  PieChart,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminOverview();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load platform analytics.');
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
          Loading platform analytics...
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

  const { users, clubs, events, registrations, attendance } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <BarChart3 size={22} color="var(--color-primary)" />
        <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--color-navy)' }}>
          Platform Analytics Overview
        </h2>
      </div>

      {/* Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard
          title="Total Users"
          value={users.total}
          subtitle={`${users.students} students, ${users.organizers} organizers`}
          icon={Users}
          color="var(--color-primary)"
          bgColor="#EFF6FF"
        />

        <StatCard
          title="Active Clubs"
          value={clubs.total}
          subtitle="Campus registered clubs"
          icon={Layers}
          color="var(--color-secondary)"
          bgColor="#F5F3FF"
        />

        <StatCard
          title="Total Events"
          value={events.total}
          subtitle={`${events.published} published, ${events.completed} completed`}
          icon={Calendar}
          color="#0284C7"
          bgColor="#F0F9FF"
        />

        <StatCard
          title="Active Registrations"
          value={registrations.active}
          subtitle={`${registrations.capacityUtilization}% total capacity utilization`}
          icon={PieChart}
          color="#1D4ED8"
          bgColor="#EFF6FF"
        />

        <StatCard
          title="Total Attendees"
          value={attendance.totalAttendees}
          subtitle={`${attendance.checkInRate}% platform turnout`}
          icon={CheckCircle2}
          color="#15803D"
          bgColor="#DCFCE7"
        />
      </div>

      {/* Secondary Status Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Events Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)', margin: 0 }}>
            Events Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Published Events</span>
              <strong>{events.published}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Completed Events</span>
              <strong>{events.completed}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Draft Events</span>
              <strong>{events.draft}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Cancelled Events</span>
              <strong style={{ color: 'var(--color-error)' }}>{events.cancelled}</strong>
            </div>
          </div>
        </div>

        {/* Users Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)', margin: 0 }}>
            User Roles Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Students</span>
              <strong>{users.students}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Club Organizers</span>
              <strong>{users.organizers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Platform Administrators</span>
              <strong>{users.admins}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Active Accounts</span>
              <strong style={{ color: '#16A34A' }}>{users.active} / {users.total}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
