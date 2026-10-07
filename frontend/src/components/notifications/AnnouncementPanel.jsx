import React, { useState } from 'react';
import { notificationService } from '../../services/notificationService';
import { Megaphone, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AnnouncementPanel({ eventId, eventStatus }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  if (eventStatus === 'cancelled') {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = title.trim();
    const trimmedMessage = message.message || message.trim();

    if (!trimmedTitle) {
      setErrorMsg('Announcement title is required.');
      return;
    }
    if (trimmedTitle.length > 120) {
      setErrorMsg('Title cannot exceed 120 characters.');
      return;
    }
    if (!trimmedMessage) {
      setErrorMsg('Announcement message is required.');
      return;
    }
    if (trimmedMessage.length > 2000) {
      setErrorMsg('Message cannot exceed 2000 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await notificationService.postAnnouncement(eventId, {
        title: trimmedTitle,
        message: trimmedMessage,
      });

      const count = res?.recipientCount ?? 0;
      setSuccessMsg(`Announcement broadcast successfully to ${count} registered & waitlisted students!`);
      setTitle('');
      setMessage('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to post announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(124, 58, 237, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7C3AED',
            }}
          >
            <Megaphone size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Broadcast Announcement</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Send in-app updates to all registered and waitlisted students for this event
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="btn btn-secondary"
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          {isOpen ? 'Close Form' : 'New Announcement'}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#065F46',
                fontSize: '14px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#991B1B',
                fontSize: '14px',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Announcement Title <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '12px', color: title.length > 120 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                {title.length}/120
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Venue Room Update, Dress Code, Laptop Requirements"
              maxLength={120}
              required
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Announcement Message <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '12px', color: message.length > 2000 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                {message.length}/2000
              </span>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide comprehensive instructions, changes, or reminders for all participants..."
              maxLength={2000}
              required
              className="form-control"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setTitle('');
                setMessage('');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '14px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                backgroundColor: '#7C3AED',
                borderColor: '#7C3AED',
              }}
              disabled={loading || !title.trim() || !message.trim()}
            >
              <Send size={16} />
              <span>{loading ? 'Publishing...' : 'Broadcast Announcement'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
