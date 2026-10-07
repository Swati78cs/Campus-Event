import { apiClient } from './api';

/**
 * Retrieve the current user's feedback eligibility and submitted feedback for an event.
 * @param {string} eventId
 */
export const getMyFeedback = async (eventId) => {
  return await apiClient(`/events/${eventId}/feedback/my`, {
    method: 'GET',
  });
};

/**
 * Submit feedback for a completed event.
 * @param {string} eventId
 * @param {object} payload - { rating: number, comment?: string }
 */
export const submitFeedback = async (eventId, { rating, comment }) => {
  return await apiClient(`/events/${eventId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
};

/**
 * Retrieve paginated event feedback list and summary stats (Organizer/Admin only).
 * @param {string} eventId
 * @param {object} params - { page?: number, limit?: number, rating?: number }
 */
export const getEventFeedback = async (eventId, params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.rating) query.append('rating', params.rating);
  const queryString = query.toString() ? `?${query.toString()}` : '';

  return await apiClient(`/events/${eventId}/feedback${queryString}`, {
    method: 'GET',
  });
};
