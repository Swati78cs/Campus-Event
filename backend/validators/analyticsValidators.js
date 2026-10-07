const { z } = require('zod');
const mongoose = require('mongoose');

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid Event ID format' }),
  }),
});

const organizerOverviewQuerySchema = z.object({
  query: z.object({
    clubId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid Club ID format' })
      .optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => !isNaN(val) && val >= 1, {
        message: 'Page must be an integer greater than or equal to 1',
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
        message: 'Limit must be an integer between 1 and 100',
      }),
  }),
});

module.exports = {
  eventIdParamSchema,
  organizerOverviewQuerySchema,
};
