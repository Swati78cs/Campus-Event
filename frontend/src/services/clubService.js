import { apiClient } from './api';

/**
 * Fetch all clubs (public view shows active clubs; admin view shows all).
 */
export async function getClubs() {
  return await apiClient('/clubs');
}

/**
 * Fetch a single club by ID.
 */
export async function getClub(id) {
  return await apiClient(`/clubs/${id}`);
}

/**
 * Organizer: Fetch clubs assigned to currently authenticated organizer.
 */
export async function getMyClubs() {
  return await apiClient('/clubs/my-clubs');
}

/**
 * Admin: Create a new club.
 */
export async function adminCreateClub(clubData) {
  return await apiClient('/clubs', {
    method: 'POST',
    body: JSON.stringify(clubData),
  });
}

/**
 * Admin: Update club details.
 */
export async function adminUpdateClub(id, clubData) {
  return await apiClient(`/clubs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(clubData),
  });
}

/**
 * Admin: Assign an organizer to a club.
 */
export async function adminAssignOrganizer(clubId, userId) {
  return await apiClient(`/clubs/${clubId}/organizers`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Admin: Remove an organizer from a club.
 */
export async function adminRemoveOrganizer(clubId, userId) {
  return await apiClient(`/clubs/${clubId}/organizers/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Admin: Update user role (e.g. promote Student to Organizer).
 */
export async function adminUpdateUserRole(userId, role) {
  return await apiClient(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
