import { apiClient } from './api';

/**
 * Retrieve comprehensive analytics for an authorized event.
 * @param {string} eventId
 */
export const getEventAnalytics = async (eventId) => {
  return await apiClient(`/events/${eventId}/analytics`, {
    method: 'GET',
  });
};

/**
 * Retrieve organizer-level overview analytics for authorized clubs/events.
 * @param {object} params - { clubId?: string, page?: number, limit?: number }
 */
export const getOrganizerOverview = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.clubId) query.append('clubId', params.clubId);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return await apiClient(`/analytics/organizer${queryString}`, {
    method: 'GET',
  });
};

/**
 * Retrieve platform-level overview analytics for administrators.
 */
export const getAdminOverview = async () => {
  return await apiClient('/analytics/admin', {
    method: 'GET',
  });
};
