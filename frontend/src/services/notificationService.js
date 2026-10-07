import { apiClient } from './api';

/**
 * Frontend Notification & Announcement Service
 * Interacts with /api/notifications and /api/events/:eventId/announcements
 */
export const notificationService = {
  /**
   * Retrieve paginated notifications for current user.
   * @param {object} params - { page, limit, isRead }
   */
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.isRead !== undefined && params.isRead !== 'all') {
      query.append('isRead', params.isRead);
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient(`/notifications${queryString}`, { method: 'GET' });
    return res.data;
  },

  /**
   * Get unread notification count.
   */
  async getUnreadCount() {
    const res = await apiClient('/notifications/unread-count', { method: 'GET' });
    return res.data?.count || 0;
  },

  /**
   * Mark a single notification as read.
   * @param {string} notificationId
   */
  async markAsRead(notificationId) {
    const res = await apiClient(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    return res.data?.notification;
  },

  /**
   * Mark all notifications of current user as read.
   */
  async markAllAsRead() {
    const res = await apiClient('/notifications/read-all', {
      method: 'PATCH',
    });
    return res.data;
  },

  /**
   * Post an organizer announcement for an event.
   * @param {string} eventId
   * @param {object} data - { title, message }
   */
  async postAnnouncement(eventId, data) {
    const res = await apiClient(`/events/${eventId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data?.announcement;
  },
};
