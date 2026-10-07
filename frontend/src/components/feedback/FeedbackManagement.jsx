import React, { useState, useEffect } from 'react';
import { getEventFeedback } from '../../services/feedbackService';
import { formatToIST } from '../../utils/dateUtils';
import {
  Star,
  MessageSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
} from 'lucide-react';

export default function FeedbackManagement({ eventId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalFeedback: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [selectedRating, setSelectedRating] = useState('');

  const fetchFeedback = async (page = 1, rating = selectedRating) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (rating) {
        params.rating = rating;
      }
      const res = await getEventFeedback(eventId, params);
      setFeedbacks(res.data?.feedback || []);
      setStats(res.data?.stats || { averageRating: 0, totalFeedback: 0 });
      setPagination(
        res.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }
      );
    } catch (err) {
      setError(err.message || 'Failed to load feedback records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(1, selectedRating);
  }, [eventId, selectedRating]);

  const handleRatingFilterChange = (r) => {
    setSelectedRating(r);
    fetchFeedback(1, r);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchFeedback(newPage, selectedRating);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header with Title and Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <MessageSquare size={22} color="var(--color-primary)" />
          <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--color-navy)' }}>
            Attendee Feedback
          </h2>
        </div>

        {/* Score & Count Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FEF3C7',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Star size={16} fill="#F59E0B" color="#F59E0B" />
            <strong style={{ fontSize: '14px', color: '#92400E' }}>
              {stats.averageRating ? `${stats.averageRating.toFixed(1)} / 5.0` : 'No ratings yet'}
            </strong>
          </div>

          <span
            className="badge"
            style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 600, padding: '6px 12px' }}
          >
            {stats.totalFeedback} {stats.totalFeedback === 1 ? 'Response' : 'Responses'}
          </span>
        </div>
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

      {/* Filter by Star Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Filter size={14} /> Filter:
        </span>
        <button
          type="button"
          onClick={() => handleRatingFilterChange('')}
          className={`btn ${selectedRating === '' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleRatingFilterChange(String(r))}
            className={`btn ${selectedRating === String(r) ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>{r}</span>
            <Star size={12} fill="currentColor" />
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-4)', textAlign: 'center' }}>
          Loading attendee feedback...
        </p>
      ) : feedbacks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-6)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
            {selectedRating
              ? `No feedback entries found with a ${selectedRating}-star rating.`
              : 'No feedback has been submitted for this event yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {feedbacks.map((fb) => (
            <div
              key={fb._id}
              style={{
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Card Header: Student & Rating */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--color-navy)' }}>
                    {fb.student?.name || 'Attendee'}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                    {fb.student?.email || ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={15}
                      fill={s <= fb.rating ? '#F59E0B' : 'transparent'}
                      color={s <= fb.rating ? '#F59E0B' : '#CBD5E1'}
                    />
                  ))}
                  <span style={{ marginLeft: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-navy)' }}>
                    {fb.rating} / 5
                  </span>
                </div>
              </div>

              {/* Comment */}
              {fb.comment ? (
                <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
                  "{fb.comment}"
                </p>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  No comment left.
                </span>
              )}

              {/* Timestamp */}
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', alignSelf: 'flex-end' }}>
                {formatToIST(fb.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => handlePageChange(pagination.page - 1)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>

          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => handlePageChange(pagination.page + 1)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
