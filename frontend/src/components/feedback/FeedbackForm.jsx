import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyFeedback, submitFeedback } from '../../services/feedbackService';
import { formatToIST } from '../../utils/dateUtils';
import { Star, MessageSquare, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export default function FeedbackForm({ eventId, isCompleted, onFeedbackSubmitted }) {
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchStatus = async () => {
    if (!isAuthenticated || !eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getMyFeedback(eventId);
      setEligibility(res.data);
    } catch (err) {
      // If error occurs, keep eligibility null or capture message
      setError(err.message || 'Could not load feedback status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [eventId, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating from 1 to 5.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await submitFeedback(eventId, {
        rating,
        comment,
      });
      setSuccessMsg('Thank you! Your feedback has been submitted successfully.');
      setEligibility((prev) => ({
        ...prev,
        canSubmit: false,
        reason: 'ALREADY_SUBMITTED',
        feedback: res.data.feedback,
      }));
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(res.data.feedback);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Checking feedback eligibility...
        </p>
      </div>
    );
  }

  // If event has not completed yet
  if (!isCompleted || eligibility?.reason === 'EVENT_NOT_COMPLETED') {
    return (
      <div
        className="card"
        style={{
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          backgroundColor: '#F8FAFC',
          border: '1px dashed var(--color-border)',
        }}
      >
        <MessageSquare size={20} color="var(--color-primary)" />
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Feedback will become available after this event concludes.
        </span>
      </div>
    );
  }

  // If user did not attend
  if (eligibility?.reason === 'ATTENDANCE_REQUIRED' || (!eligibility?.hasAttended && !eligibility?.feedback)) {
    return (
      <div
        className="card"
        style={{
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          backgroundColor: '#F8FAFC',
        }}
      >
        <AlertCircle size={20} color="var(--color-text-secondary)" />
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Feedback is only available to verified attendees who attended this event.
        </span>
      </div>
    );
  }

  // If already submitted
  if (eligibility?.feedback) {
    const fb = eligibility.feedback;
    return (
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          borderLeft: '4px solid #16A34A',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CheckCircle2 size={20} color="#16A34A" />
            <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--color-navy)' }}>Your Feedback</h3>
          </div>
          <span className="badge badge-success">Submitted</span>
        </div>

        {/* Star Rating Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={22}
              fill={star <= fb.rating ? '#F59E0B' : 'transparent'}
              color={star <= fb.rating ? '#F59E0B' : '#CBD5E1'}
            />
          ))}
          <span style={{ marginLeft: '8px', fontWeight: 600, fontSize: '14px', color: 'var(--color-navy)' }}>
            {fb.rating} / 5
          </span>
        </div>

        {/* Comment if any */}
        {fb.comment ? (
          <p
            style={{
              backgroundColor: '#F8FAFC',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            "{fb.comment}"
          </p>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            No comments provided.
          </p>
        )}

        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Submitted on {formatToIST(fb.createdAt)}
        </div>
      </div>
    );
  }

  // Can submit feedback
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <MessageSquare size={22} color="var(--color-primary)" />
        <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--color-navy)' }}>
          Event Feedback
        </h3>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
        How was your experience at this event? Your rating helps organizers improve future activities.
      </p>

      {successMsg && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#DCFCE7',
            borderRadius: 'var(--radius-sm)',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Star Rating Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Rating <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoverRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'transform 0.1s ease',
                  }}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    size={28}
                    fill={active ? '#F59E0B' : 'transparent'}
                    color={active ? '#F59E0B' : '#CBD5E1'}
                  />
                </button>
              );
            })}
            {rating > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-navy)', marginLeft: '8px' }}>
                {rating} / 5
              </span>
            )}
          </div>
        </div>

        {/* Optional Comment */}
        <div>
          <label
            htmlFor="feedback-comment"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
          >
            Comments (Optional)
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Share your thoughts about the sessions, speakers, venue, or organization..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {comment.length} / 1000 characters
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="btn btn-primary"
          style={{
            alignSelf: 'flex-start',
            minHeight: '40px',
            padding: '8px 20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Send size={16} />
          <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
        </button>
      </form>
    </div>
  );
}
