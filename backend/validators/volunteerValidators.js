const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
});

const assignVolunteerSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
});

const removeVolunteerSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
    userId: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
});

const searchEligibleQuerySchema = z.object({
  query: z.object({
    search: z.string().optional().default(''),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

const myVolunteerEventsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

module.exports = {
  eventIdParamSchema,
  assignVolunteerSchema,
  removeVolunteerSchema,
  searchEligibleQuerySchema,
  myVolunteerEventsQuerySchema,
};
