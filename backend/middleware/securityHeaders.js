/**
 * Native HTTP Security Headers Middleware.
 * Hardens HTTP response headers without requiring external dependencies (like helmet).
 */
const securityHeaders = (req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Mitigate clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Disable browser-side XSS auditor to prevent vulnerabilities
  res.setHeader('X-XSS-Protection', '0');

  // Control referrer information sent in HTTP requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Isolate browsing context
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Defend server fingerprinting
  res.removeHeader('X-Powered-By');

  next();
};

module.exports = {
  securityHeaders,
};
