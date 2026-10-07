import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Megaphone,
  AlertCircle,
  XCircle,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { formatToIST } from '../../utils/dateUtils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const isReadParam = filter === 'unread' ? false : undefined;
      const data = await notificationService.getNotifications({
        page,
        limit: 15,
        isRead: isReadParam,
      });

      setNotifications(data?.notifications || data?.items || []);
      setPagination(data?.pagination || { total: 0, totalPages: 1 });
      setUnreadCount(data?.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      setMarkingId(notificationId);
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'REGISTRATION_CONFIRMED':
        return {
          icon: <Ticket size={20} />,
          bg: 'rgba(16, 185, 129, 0.1)',
          color: '#10B981',
          label: 'Registration',
        };
      case 'REGISTRATION_CANCELLED':
        return {
          icon: <XCircle size={20} />,
          bg: 'rgba(245, 158, 11, 0.1)',
          color: '#F59E0B',
          label: 'Cancelled Reg',
        };
      case 'WAITLIST_PROMOTED':
        return {
          icon: <Sparkles size={20} />,
          bg: 'rgba(124, 58, 237, 0.1)',
          color: '#7C3AED',
          label: 'Promoted',
        };
      case 'EVENT_CANCELLED':
        return {
          icon: <AlertCircle size={20} />,
          bg: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          label: 'Event Cancelled',
        };
      case 'EVENT_DATE_CHANGED':
        return {
          icon: <Clock size={20} />,
          bg: 'rgba(14, 165, 233, 0.1)',
          color: '#0EA5E9',
          label: 'Schedule Updated',
        };
      case 'EVENT_VENUE_CHANGED':
        return {
          icon: <MapPin size={20} />,
          bg: 'rgba(99, 102, 241, 0.1)',
          color: '#6366F1',
          label: 'Venue Changed',
        };
      case 'ORGANIZER_ANNOUNCEMENT':
        return {
          icon: <Megaphone size={20} />,
          bg: 'rgba(168, 85, 247, 0.1)',
          color: '#A855F7',
          label: 'Announcement',
        };
      default:
        return {
          icon: <Bell size={20} />,
          bg: 'rgba(59, 130, 246, 0.1)',
          color: '#3B82F6',
          label: 'Notification',
        };
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <Bell size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Notifications</h1>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Stay updated on registrations, waitlist promotions, schedule updates, and announcements
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={markingAll || unreadCount === 0}
          className="btn btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            opacity: unreadCount === 0 ? 0.6 : 1,
            cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <CheckCheck size={16} />
          <span>{markingAll ? 'Marking all...' : 'Mark all as read'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={() => {
            setFilter('all');
            setPage(1);
          }}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: filter === 'all' ? 'var(--color-primary)' : 'transparent',
            color: filter === 'all' ? '#FFFFFF' : 'var(--color-text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter('unread');
            setPage(1);
          }}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: filter === 'unread' ? 'var(--color-primary)' : 'transparent',
            color: filter === 'unread' ? '#FFFFFF' : 'var(--color-text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: filter === 'unread' ? 'rgba(255,255,255,0.3)' : '#EF4444',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {error && (
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
          <span>{error}</span>
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--color-text-secondary)' }}>
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 'var(--space-12)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-background)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Bell size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No notifications found</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
            {filter === 'unread'
              ? 'You have caught up with all your notifications!'
              : 'You will receive in-app notifications whenever event organizers broadcast updates or your registration status changes.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {notifications.map((notif) => {
            const iconConfig = getNotificationIcon(notif.type);
            return (
              <div
                key={notif._id}
                className="card"
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex',
                  gap: 'var(--space-4)',
                  alignItems: 'flex-start',
                  backgroundColor: notif.isRead ? 'var(--color-surface)' : 'rgba(37, 99, 235, 0.03)',
                  borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--color-primary)',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {/* Type Icon */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: iconConfig.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: iconConfig.color,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {iconConfig.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: iconConfig.color,
                            backgroundColor: iconConfig.bg,
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {iconConfig.label}
                        </span>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: notif.isRead ? 600 : 700,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {notif.title}
                        </h4>
                      </div>
                    </div>

                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatToIST(notif.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '4px 0',
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {notif.message}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    {notif.event ? (
                      <Link
                        to={`/events/${notif.event._id || notif.event}`}
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>View Event</span>
                        <ExternalLink size={12} />
                      </Link>
                    ) : (
                      <span />
                    )}

                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif._id)}
                        disabled={markingId === notif._id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                      >
                        <CheckCircle2 size={13} />
                        <span>{markingId === notif._id ? 'Marking...' : 'Mark as read'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '6px 12px' }}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '6px 12px' }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
