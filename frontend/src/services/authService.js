import { apiClient } from './api';

/**
 * Register a new student account.
 */
export async function registerUser(userData) {
  return await apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Authenticate user credentials. Sets HttpOnly cookie on backend.
 */
export async function loginUser(credentials) {
  return await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Invalidate user session and clear HttpOnly cookie.
 */
export async function logoutUser() {
  return await apiClient('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Fetch current authenticated user.
 */
export async function getCurrentUser() {
  return await apiClient('/auth/me');
}

/**
 * Update authenticated user profile.
 */
export async function updateUserProfile(profileData) {
  return await apiClient('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

/**
 * Admin: Get all users.
 */
export async function adminGetUsers() {
  return await apiClient('/users');
}

/**
 * Admin: Update user active status.
 */
export async function adminUpdateUserStatus(userId, isActive) {
  return await apiClient(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}
