import { apiClient } from './api';

/**
 * Student registers for an event.
 */
export async function registerForEvent(eventId) {
  return await apiClient(`/events/${eventId}/register`, {
    method: 'POST',
  });
}

/**
 * Student cancels their active registration.
 */
export async function cancelRegistration(eventId) {
  return await apiClient(`/events/${eventId}/register`, {
    method: 'DELETE',
  });
}

/**
 * Student retrieves their active registration for an event.
 */
export async function getMyRegistration(eventId) {
  return await apiClient(`/events/${eventId}/registration`);
}

/**
 * Student retrieves list of registered events.
 */
export async function getMyEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  return await apiClient(`/registrations/my-events${queryString ? `?${queryString}` : ''}`);
}

/**
 * Organizer / Admin retrieves event attendee registrations list.
 */
export async function getEventRegistrations(eventId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  return await apiClient(`/events/manage/${eventId}/registrations${queryString ? `?${queryString}` : ''}`);
}
