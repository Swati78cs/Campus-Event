const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
});

const listRegistrationsQuerySchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    status: z.enum(['active', 'cancelled', 'all']).optional().default('active'),
  }),
});

const myEventsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    status: z.enum(['active', 'cancelled', 'all']).optional().default('active'),
  }),
});

module.exports = {
  eventIdParamSchema,
  listRegistrationsQuerySchema,
  myEventsQuerySchema,
};
