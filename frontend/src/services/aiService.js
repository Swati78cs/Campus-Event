import { apiClient } from './api';

/**
 * Request Gemini AI event description generation.
 * Backend securely coordinates with Google Gemini REST API.
 *
 * @param {Object} payload - { clubId, eventId, title, category, venue, startDateTime, endDateTime, highlights, audience, details }
 * @returns {Promise<{ description: string, isAIGenerated: boolean }>}
 */
export async function generateAIDescription(payload) {
  const response = await apiClient('/ai/event-description', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

/**
 * Request Gemini AI event description generation for an existing event.
 *
 * @param {string} eventId
 * @param {Object} payload - { title, category, venue, startDateTime, endDateTime, highlights, audience, details }
 * @returns {Promise<{ description: string, isAIGenerated: boolean }>}
 */
export async function generateAIDescriptionForEvent(eventId, payload) {
  const response = await apiClient(`/events/${eventId}/ai-description`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}
