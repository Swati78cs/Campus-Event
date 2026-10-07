import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getMyAssignedEvents } from '../../services/volunteerService';
import { formatToIST } from '../../utils/dateUtils';

export default function VolunteerEventsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchAssignedEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyAssignedEvents({ page, limit: 10 });
      setAssignments(res.data?.assignments || []);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load volunteer assignments:', err);
      setError(err.response?.data?.message || 'Failed to load your assigned events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedEvents();
  }, [page]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ShieldCheck size={28} color="var(--color-primary)" />
            <span>Assigned Volunteer Events</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Events where you have active event-specific volunteer responsibilities.
          </p>
        </div>

        <Link to="/events" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Campus Events</span>
          <ChevronRight size={16} />
        </Link>
      </div>

      {/* Info notice about Phase 7/8 scope */}
      <div
        style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: '13px',
          color: '#1E40AF',
        }}
      >
        <Info size={18} color="#2563EB" style={{ flexShrink: 0 }} />
        <span>
          You are an active volunteer for the events listed below. Camera QR ticket scanning and attendee check-in will be enabled in <strong>Phase 8</strong>.
        </span>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading & Content */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading your volunteer assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <ShieldCheck size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
          <h3>No Active Volunteer Assignments</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', marginBottom: 'var(--space-4)' }}>
            You have not been assigned as a volunteer to any active campus events yet.
          </p>
          <Link to="/events" className="btn btn-primary">
            Explore Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {assignments.map((asgn) => {
            const ev = asgn.event;
            if (!ev) return null;

            return (
              <div
                key={asgn._id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-4)',
                  borderLeft: '4px solid var(--color-primary)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="badge badge-info" style={{ fontSize: '11px' }}>
                      {ev.category}
                    </span>
                    {ev.club?.name && (
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Layers size={13} />
                        <span>{ev.club.name}</span>
                      </span>
                    )}
                    <span
                      className="badge badge-success"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      <CheckCircle2 size={12} />
                      <span>Active Volunteer</span>
                    </span>
                  </div>

                  <h2 style={{ fontSize: '20px', margin: '4px 0' }}>
                    <Link to={`/events/${ev._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {ev.title}
                    </Link>
                  </h2>

                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="var(--color-primary)" />
                      <span>{formatToIST(ev.startDateTime)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={15} color="var(--color-qr)" />
                      <span>{ev.venue}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      <span>Assigned: {formatToIST(asgn.assignedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    to={`/events/${ev._id}/attendance`}
                    className="btn btn-primary"
                    style={{
                      fontSize: '13px',
                      padding: '8px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '44px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#ffffff',
                    }}
                  >
                    <span>Open Check-In</span>
                    <ChevronRight size={14} />
                  </Link>

                  <Link
                    to={`/events/${ev._id}`}
                    className="btn btn-secondary"
                    style={{
                      fontSize: '13px',
                      padding: '8px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '44px',
                    }}
                  >
                    <span>View Event</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '14px' }}>
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
