const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const ticketIdParamSchema = z.object({
  params: z.object({
    ticketId: z.string().regex(objectIdRegex, 'Invalid ticket ID format'),
  }),
});

const tokenParamSchema = z.object({
  params: z.object({
    token: z.string().min(16, 'Ticket token must be at least 16 characters long').trim(),
  }),
});

const myTicketsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    status: z.enum(['active', 'cancelled', 'all']).optional().default('active'),
  }),
});

module.exports = {
  ticketIdParamSchema,
  tokenParamSchema,
  myTicketsQuerySchema,
};
