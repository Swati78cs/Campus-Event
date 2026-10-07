const { z } = require('zod');
const mongoose = require('mongoose');

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const generateEventDescriptionSchema = z.object({
  body: z
    .object({
      eventId: z
        .string()
        .refine(isValidObjectId, { message: 'Invalid Event ID format' })
        .optional(),
      clubId: z
        .string()
        .refine(isValidObjectId, { message: 'Invalid Club ID format' })
        .optional(),
      title: z
        .string({ required_error: 'Event title is required' })
        .trim()
        .min(2, 'Title must be at least 2 characters')
        .max(120, 'Title cannot exceed 120 characters'),
      category: z
        .enum(['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'])
        .optional(),
      venue: z.string().trim().max(200, 'Venue cannot exceed 200 characters').optional(),
      startDateTime: z.string().datetime().optional(),
      endDateTime: z.string().datetime().optional(),
      highlights: z
        .string()
        .trim()
        .max(1000, 'Highlights cannot exceed 1000 characters')
        .optional(),
      audience: z
        .string()
        .trim()
        .max(200, 'Target audience cannot exceed 200 characters')
        .optional(),
      details: z
        .string()
        .trim()
        .max(1000, 'Additional details cannot exceed 1000 characters')
        .optional(),
    })
    .refine((data) => Boolean(data.eventId || data.clubId), {
      message: 'Either eventId or clubId must be provided to determine authorization',
      path: ['clubId'],
    })
    .refine(
      (data) => {
        if (data.startDateTime && data.endDateTime) {
          return new Date(data.endDateTime) > new Date(data.startDateTime);
        }
        return true;
      },
      {
        message: 'endDateTime must be after startDateTime',
        path: ['endDateTime'],
      }
    ),
});

module.exports = {
  generateEventDescriptionSchema,
};
