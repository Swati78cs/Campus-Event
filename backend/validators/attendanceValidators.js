const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
});

const checkInByQrSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z.object({
    token: z.string().min(1, 'Ticket token is required').trim(),
  }),
});

const checkInManualSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z.object({
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID format'),
  }),
});

const adminOverrideSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID format'),
  }),
  body: z.object({
    overrideReason: z.string().min(3, 'Override reason must be at least 3 characters long').max(500, 'Override reason cannot exceed 500 characters').trim(),
  }),
});

const getAttendanceListSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    search: z.string().optional().default(''),
    method: z.enum(['qr', 'manual', 'admin_override']).optional(),
    status: z.enum(['checked_in', 'overridden']).optional(),
  }),
});

const searchAttendeesQuerySchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  query: z.object({
    search: z.string().optional().default(''),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

module.exports = {
  eventIdParamSchema,
  checkInByQrSchema,
  checkInManualSchema,
  adminOverrideSchema,
  getAttendanceListSchema,
  searchAttendeesQuerySchema,
};
