const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
});

const eventIdAndStudentIdParamSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
    studentId: z.string().regex(objectIdRegex, 'Invalid student ID format'),
  }),
});

const waitlistQuerySchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    status: z.enum(['waiting', 'promoted', 'removed', 'cancelled', 'all']).optional().default('all'),
  }),
});

const myWaitlistQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
    status: z.enum(['waiting', 'promoted', 'all']).optional().default('waiting'),
  }),
});

module.exports = {
  eventIdParamSchema,
  eventIdAndStudentIdParamSchema,
  waitlistQuerySchema,
  myWaitlistQuerySchema,
};
