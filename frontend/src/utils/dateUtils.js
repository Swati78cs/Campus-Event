/**
 * Timezone & Date Formatting Utilities
 * Strictly enforces Database: UTC, Client Display & Input: Asia/Kolkata (IST).
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a UTC ISO string into human-readable IST string.
 * @param {string|Date} date
 * @returns {string} e.g. "16 Oct 2026, 05:30 PM IST"
 */
export function formatToIST(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${formatter.format(d)} IST`;
}

/**
 * Convert a UTC ISO string into HTML <input type="datetime-local" /> format (YYYY-MM-DDTHH:mm) in IST.
 * @param {string|Date} date
 * @returns {string}
 */
export function toDatetimeLocalIST(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  // Calculate IST offset (+05:30)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(d.getTime() + istOffsetMs);

  return istTime.toISOString().slice(0, 16);
}

/**
 * Convert an HTML <input type="datetime-local" /> value (entered by user in IST) into a UTC ISO string for backend storage.
 * @param {string} istLocalString - e.g. "2026-10-16T17:30"
 * @returns {string} UTC ISO string e.g. "2026-10-16T12:00:00.000Z"
 */
export function fromISTLocalToUTC(istLocalString) {
  if (!istLocalString) return '';

  // Parse local string components
  const [datePart, timePart] = istLocalString.split('T');
  if (!datePart || !timePart) return new Date(istLocalString).toISOString();

  // Create Date with explicit +05:30 timezone offset
  const istIsoString = `${datePart}T${timePart}:00.000+05:30`;
  const parsedDate = new Date(istIsoString);

  return parsedDate.toISOString();
}

/**
 * Returns badge configuration (color, label, icon type) for an event phase.
 * @param {string} phase - 'draft', 'registration_open', 'registration_closed', 'completed', 'cancelled'
 */
export function getPhaseBadgeConfig(phase) {
  switch (phase) {
    case 'registration_open':
      return { label: 'Registration Open', className: 'badge-success', color: 'var(--color-success)' };
    case 'registration_closed':
      return { label: 'Registration Closed', className: 'badge-warning', color: 'var(--color-warning)' };
    case 'completed':
      return { label: 'Completed', className: 'badge-info', color: '#1E40AF' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'badge-error', color: 'var(--color-error)' };
    case 'draft':
    default:
      return { label: 'Draft', className: '', color: 'var(--color-text-secondary)', bg: '#F1F5F9' };
  }
}
