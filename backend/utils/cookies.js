const { env } = require('../config/env');

const COOKIE_NAME = 'token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Parses cookies from raw request headers without external dependencies.
 * @param {import('express').Request} req
 * @returns {Record<string, string>}
 */
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [name, ...rest] = pair.trim().split('=');
      if (name) {
        cookies[name] = decodeURIComponent(rest.join('='));
      }
    }
  }

  return cookies;
};

/**
 * Sets the authentication JWT in a secure HttpOnly cookie.
 * @param {import('express').Response} res
 * @param {string} token
 */
const setAuthCookie = (res, token) => {
  const isProduction = env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'None' : 'Lax';
  const secure = isProduction ? '; Secure' : '';

  // Max-Age in seconds
  const maxAgeSeconds = 7 * 24 * 60 * 60;
  const expiresDate = new Date(Date.now() + SEVEN_DAYS_MS).toUTCString();

  const cookieString = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expiresDate}; HttpOnly; SameSite=${sameSite}${secure}`;

  res.setHeader('Set-Cookie', cookieString);
};

/**
 * Clears the authentication JWT cookie.
 * @param {import('express').Response} res
 */
const clearAuthCookie = (res) => {
  const isProduction = env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'None' : 'Lax';
  const secure = isProduction ? '; Secure' : '';

  const cookieString = `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=${sameSite}${secure}`;

  res.setHeader('Set-Cookie', cookieString);
};

module.exports = {
  COOKIE_NAME,
  parseCookies,
  setAuthCookie,
  clearAuthCookie,
};
