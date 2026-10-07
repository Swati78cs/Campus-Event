import { apiClient } from './api';

/**
 * Public Event Discovery: Search, Filter, Paginate.
 */
export async function discoverEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.clubId) query.set('clubId', params.clubId);
  if (params.dateFilter) query.set('dateFilter', params.dateFilter);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  return await apiClient(`/events${queryString ? `?${queryString}` : ''}`);
}

/**
 * Public Event Details by ID.
 */
export async function getPublicEvent(id) {
  return await apiClient(`/events/${id}`);
}

/**
 * Fetch authorized events for logged-in organizer or admin.
 */
export async function getAuthorizedEvents() {
  return await apiClient('/events/manage/list');
}

/**
 * Fetch single event details by ID for organizer/admin management.
 */
export async function getEvent(id) {
  return await apiClient(`/events/manage/${id}`);
}

/**
 * Create a new campus event.
 */
export async function createEvent(eventData) {
  return await apiClient('/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
}

/**
 * Update an existing event.
 */
export async function updateEvent(id, eventData) {
  return await apiClient(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  });
}

/**
 * Publish a draft event.
 */
export async function publishEvent(id) {
  return await apiClient(`/events/${id}/publish`, {
    method: 'PATCH',
  });
}

/**
 * Cancel an event with an optional reason.
 */
export async function cancelEvent(id, reason = '') {
  return await apiClient(`/events/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}
