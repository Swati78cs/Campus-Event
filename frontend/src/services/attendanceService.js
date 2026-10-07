import { apiClient } from './api';

/**
 * Check-in attendee via QR ticket token.
 * @param {string} eventId
 * @param {string} token
 */
export async function checkInByQr(eventId, token) {
  return await apiClient(`/events/${eventId}/attendance/qr`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/**
 * Check-in attendee manually by student ID.
 * @param {string} eventId
 * @param {string} studentId
 */
export async function checkInManual(eventId, studentId) {
  return await apiClient(`/events/${eventId}/attendance/manual`, {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
}

/**
 * Admin override to record attendance.
 * @param {string} eventId
 * @param {string} studentId
 * @param {string} overrideReason
 */
export async function overrideAttendance(eventId, studentId, overrideReason) {
  return await apiClient(`/events/${eventId}/attendance/${studentId}/override`, {
    method: 'POST',
    body: JSON.stringify({ overrideReason }),
  });
}

/**
 * Get attendance records for an event with pagination and filters.
 * @param {string} eventId
 * @param {Object} params - { page, limit, search, method, status }
 */
export async function getEventAttendance(eventId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);
  if (params.method) query.set('method', params.method);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/events/${eventId}/attendance${queryString}`);
}

/**
 * Get attendance statistics and check-in rate for an event.
 * @param {string} eventId
 */
export async function getAttendanceStats(eventId) {
  return await apiClient(`/events/${eventId}/attendance/stats`);
}

/**
 * Search registered attendees for manual check-in.
 * @param {string} eventId
 * @param {Object} params - { search, limit }
 */
export async function searchAttendees(eventId, params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/events/${eventId}/attendance/search${queryString}`);
}
