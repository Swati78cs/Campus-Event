import { apiClient } from './api';

/**
 * Fetch paginated tickets for the authenticated student.
 * @param {Object} params - { status: 'active' | 'cancelled' | 'all', page: number, limit: number }
 */
export async function getMyTickets(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/tickets/my${queryString}`);
}

/**
 * Fetch a single ticket by its ID.
 * @param {string} ticketId
 */
export async function getTicketById(ticketId) {
  return await apiClient(`/tickets/${ticketId}`);
}

/**
 * Fetch the active ticket for the authenticated student for a specific event.
 * @param {string} eventId
 */
export async function getTicketForEvent(eventId) {
  return await apiClient(`/tickets/event/${eventId}`);
}

/**
 * Validate a ticket token foundation (for Phase 8 check-in verification).
 * @param {string} token
 */
export async function validateTicketToken(token) {
  return await apiClient(`/tickets/token/${token}`);
}

export default {
  getMyTickets,
  getTicketById,
  getTicketForEvent,
  validateTicketToken,
};
