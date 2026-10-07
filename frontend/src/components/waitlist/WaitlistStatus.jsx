import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, AlertCircle, UserX, Ticket } from 'lucide-react';
import {
  getMyWaitlistStatus,
  joinWaitlist,
  leaveWaitlist,
} from '../../services/waitlistService';
import { useAuth } from '../../context/AuthContext';

export default function WaitlistStatus({ eventId, event, onStatusChange }) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [waitlistInfo, setWaitlistInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isStudent && eventId) {
      loadWaitlistStatus();
    } else {
      setLoading(false);
    }
  }, [eventId, isStudent]);

  const loadWaitlistStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyWaitlistStatus(eventId);
      if (res?.success) {
        setWaitlistInfo(res.data);
      }
    } catch (err) {
      // Non-critical: if not logged in or endpoint returns 403/404, suppress
      console.warn('Waitlist status check:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await joinWaitlist(eventId);
      if (res?.success) {
        setMessage('Successfully joined the waitlist!');
        await loadWaitlistStatus();
        if (onStatusChange) onStatusChange();
      }
    } catch (err) {
      setError(err.message || 'Failed to join waitlist.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave the waitlist for this event?')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await leaveWaitlist(eventId);
      if (res?.success) {
        setMessage('You have left the waitlist.');
        await loadWaitlistStatus();
        if (onStatusChange) onStatusChange();
      }
    } catch (err) {
      setError(err.message || 'Failed to leave waitlist.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isStudent) {
    return (
      <div
        style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div>
          <strong style={{ color: '#991B1B', display: 'block' }}>Event Full</strong>
          <span style={{ fontSize: '13px', color: '#7F1D1D' }}>
            All {event?.capacity} seats have been reserved.
          </span>
        </div>
        <span
          className="badge"
          style={{ backgroundColor: '#E2E8F0', color: '#64748B', fontWeight: 600, padding: '8px 12px' }}
        >
          Full (Sold Out)
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Checking waitlist status...
      </div>
    );
  }

  const isWaiting = waitlistInfo?.status === 'waiting';
  const isPromoted = waitlistInfo?.status === 'promoted';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Error / Feedback Banners */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FEE2E2',
            borderRadius: 'var(--radius-sm)',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#DCFCE7',
            borderRadius: 'var(--radius-sm)',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* State 1: Already Promoted */}
      {isPromoted ? (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <CheckCircle2 size={24} color="#059669" />
            <div>
              <h3 style={{ fontSize: '16px', color: '#065F46', margin: 0 }}>
                Promoted from Waitlist!
              </h3>
              <p style={{ fontSize: '13px', color: '#047857', marginTop: '2px' }}>
                A seat opened up and your registration is confirmed.
              </p>
            </div>
          </div>
          <Link
            to="/student/my-tickets"
            className="btn btn-primary"
            style={{ fontSize: '13px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Ticket size={14} />
            <span>View My Ticket</span>
          </Link>
        </div>
      ) : isWaiting ? (
        /* State 2: Actively on Waitlist */
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Clock size={24} color="#D97706" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h3 style={{ fontSize: '16px', color: '#92400E', margin: 0 }}>
                  You are on the Waitlist
                </h3>
                {waitlistInfo?.position && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FCD34D',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    Position #{waitlistInfo.position} of {waitlistInfo.totalWaiting || waitlistInfo.position}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#B45309', marginTop: '3px' }}>
                Joined on {waitlistInfo?.entry?.joinedAt ? new Date(waitlistInfo.entry.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'}. If a seat opens up, you will be promoted automatically.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={actionLoading}
            onClick={handleLeave}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DC2626',
              color: '#DC2626',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '40px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserX size={15} />
            <span>{actionLoading ? 'Leaving...' : 'Leave Waitlist'}</span>
          </button>
        </div>
      ) : (
        /* State 3: Event Full, Eligible to Join Waitlist */
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <strong style={{ color: '#991B1B', fontSize: '16px' }}>Event Full</strong>
              <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: 600 }}>
                Sold Out
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#7F1D1D', marginTop: '2px' }}>
              All {event?.capacity} seats are reserved. Join the waitlist to automatically reserve a seat if someone cancels.
            </p>
          </div>

          <button
            type="button"
            disabled={actionLoading}
            onClick={handleJoin}
            className="btn btn-primary"
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              borderColor: '#B45309',
              minHeight: '44px',
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={16} />
            <span>{actionLoading ? 'Joining...' : 'Join Waitlist'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
