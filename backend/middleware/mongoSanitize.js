/**
 * Native In-Memory NoSQL Injection Sanitizer.
 * Recursively strips keys starting with '$' or containing '.' from request body, query, and params.
 * Requires zero external dependencies (no express-mongo-sanitize).
 */

const cleanObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    // Strip operators starting with $ or containing . (prohibited property paths)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleaned[key] = cleanObject(obj[key]);
  }
  return cleaned;
};

const mongoSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params);
  }
  next();
};

module.exports = {
  mongoSanitize,
  cleanObject,
};
