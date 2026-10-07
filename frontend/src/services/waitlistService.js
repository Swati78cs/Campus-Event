import { apiClient } from './api';

/**
 * Student joins event waitlist when event is full.
 * @param {string} eventId
 */
export async function joinWaitlist(eventId) {
  return await apiClient(`/events/${eventId}/waitlist`, {
    method: 'POST',
  });
}

/**
 * Student retrieves their current waitlist status & position for an event.
 * @param {string} eventId
 */
export async function getMyWaitlistStatus(eventId) {
  return await apiClient(`/events/${eventId}/waitlist/me`);
}

/**
 * Student leaves the waitlist for an event.
 * @param {string} eventId
 */
export async function leaveWaitlist(eventId) {
  return await apiClient(`/events/${eventId}/waitlist`, {
    method: 'DELETE',
  });
}

/**
 * Student retrieves paginated list of events they are waitlisted for.
 * @param {Object} params - { page, limit, status }
 */
export async function getMyWaitlistEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/waitlist/my-events${queryString}`);
}

/**
 * Organizer / Admin retrieves event waitlist entries.
 * @param {string} eventId
 * @param {Object} params - { page, limit, status }
 */
export async function getEventWaitlist(eventId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/events/${eventId}/waitlist${queryString}`);
}

/**
 * Organizer / Admin removes a student from event waitlist.
 * @param {string} eventId
 * @param {string} studentId
 */
export async function removeStudentFromWaitlist(eventId, studentId) {
  return await apiClient(`/events/${eventId}/waitlist/${studentId}`, {
    method: 'DELETE',
  });
}
