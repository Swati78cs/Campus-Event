const { z } = require('zod');
const mongoose = require('mongoose');

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const submitFeedbackSchema = z.object({
  body: z.object({
    rating: z
      .number({ required_error: 'Rating is required' })
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z
      .string()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional()
      .or(z.literal('')),
  }),
  params: z.object({
    eventId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid Event ID format' }),
  }),
});

const getEventFeedbackQuerySchema = z.object({
  params: z.object({
    eventId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid Event ID format' }),
  }),
  query: z.object({
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
    rating: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (!isNaN(val) && val >= 1 && val <= 5), {
        message: 'Rating filter must be an integer between 1 and 5',
      }),
  }),
});

const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z
      .string()
      .refine(isValidObjectId, { message: 'Invalid Event ID format' }),
  }),
});

module.exports = {
  submitFeedbackSchema,
  getEventFeedbackQuerySchema,
  eventIdParamSchema,
};
