import { apiClient } from './api';

/**
 * Search active users eligible for volunteer assignment.
 * @param {string} search
 * @param {number} limit
 */
export async function searchEligibleUsers(search = '', limit = 10) {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (limit) query.set('limit', limit);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/volunteers/eligible-users${queryString}`);
}

/**
 * Assign a volunteer to an event.
 * @param {string} eventId
 * @param {string} userId
 */
export async function assignVolunteer(eventId, userId) {
  return await apiClient(`/events/${eventId}/volunteers`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Get volunteers assigned to an event.
 * @param {string} eventId
 * @param {string} status - 'active' | 'all'
 */
export async function getEventVolunteers(eventId, status = 'active') {
  const query = status ? `?status=${status}` : '';
  return await apiClient(`/events/${eventId}/volunteers${query}`);
}

/**
 * Remove a volunteer from an event.
 * @param {string} eventId
 * @param {string} userId
 */
export async function removeVolunteer(eventId, userId) {
  return await apiClient(`/events/${eventId}/volunteers/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Get active events assigned to the current authenticated volunteer.
 * @param {Object} params - { page, limit }
 */
export async function getMyAssignedEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/volunteers/my-events${queryString}`);
}

/**
 * Check if the authenticated user has any active volunteer assignments.
 */
export async function getMyVolunteerStatus() {
  return await apiClient('/volunteers/status');
}

export default {
  searchEligibleUsers,
  assignVolunteer,
  getEventVolunteers,
  removeVolunteer,
  getMyAssignedEvents,
  getMyVolunteerStatus,
};
