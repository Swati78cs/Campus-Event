/**
 * Central Frontend API Client
 * Uses native fetch with consistent error handling and JSON envelopes.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not configured. Please set it in the frontend environment.'
  );
}

class ApiError extends Error {
  constructor(message, code = 'API_ERROR', details = {}, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

/**
 * Universal request handler
 * @param {string} endpoint - API path relative to base URL (e.g. '/health')
 * @param {RequestInit} [options] - Fetch options
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: 'include', // Support HttpOnly cookies across origins
  };

  try {
    const response = await fetch(url, config);
    let json;

    try {
      json = await response.json();
    } catch {
      throw new ApiError('Failed to parse server response', 'INVALID_RESPONSE', {}, response.status);
    }

    if (!response.ok || !json.success) {
      const errorMessage = json?.message || 'Server error occurred';
      const errorCode = json?.error?.code || `HTTP_${response.status}`;
      const errorDetails = json?.error?.details || {};
      throw new ApiError(errorMessage, errorCode, errorDetails, response.status);
    }

    return json;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or client-side failure
    throw new ApiError(
      error.message || 'Network request failed',
      'NETWORK_ERROR',
      { originalError: error.message },
      0
    );
  }
}
