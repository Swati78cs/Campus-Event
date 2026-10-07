const { z } = require('zod');

const eventCategories = ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createEventSchema = z.object({
  body: z
    .object({
      title: z
        .string({ required_error: 'Event title is required' })
        .trim()
        .min(2, 'Title must be at least 2 characters')
        .max(120, 'Title cannot exceed 120 characters'),
      description: z
        .string({ required_error: 'Event description is required' })
        .trim()
        .min(10, 'Description must be at least 10 characters')
        .max(3000, 'Description cannot exceed 3000 characters'),
      clubId: z
        .string({ required_error: 'Club ID is required' })
        .regex(objectIdRegex, 'Invalid club ID format'),
      category: z.enum(eventCategories, {
        required_error: 'Valid event category is required',
      }),
      startDateTime: z
        .string({ required_error: 'Start date and time is required' })
        .datetime({ message: 'Start date must be a valid ISO datetime' }),
      endDateTime: z
        .string({ required_error: 'End date and time is required' })
        .datetime({ message: 'End date must be a valid ISO datetime' }),
      venue: z
        .string({ required_error: 'Venue is required' })
        .trim()
        .min(2, 'Venue must be at least 2 characters')
        .max(200, 'Venue cannot exceed 200 characters'),
      capacity: z.coerce
        .number({ required_error: 'Capacity is required' })
        .int('Capacity must be a whole number')
        .min(1, 'Capacity must be at least 1'),
      registrationDeadline: z
        .string({ required_error: 'Registration deadline is required' })
        .datetime({ message: 'Registration deadline must be a valid ISO datetime' }),
      bannerUrl: z.string().trim().optional(),
      allowCancellation: z.boolean().optional().default(true),
      cancellationDeadline: z.string().datetime().optional().nullable(),
      certificateEnabled: z.boolean().optional().default(false),
      status: z.enum(['draft', 'published']).optional().default('draft'),
    })
    .refine((data) => new Date(data.endDateTime) > new Date(data.startDateTime), {
      message: 'End date and time must be after start date and time',
      path: ['endDateTime'],
    })
    .refine((data) => new Date(data.registrationDeadline) <= new Date(data.startDateTime), {
      message: 'Registration deadline cannot be after the event start time',
      path: ['registrationDeadline'],
    }),
});

const updateEventSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z
    .object({
      title: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().min(10).max(3000).optional(),
      category: z.enum(eventCategories).optional(),
      startDateTime: z.string().datetime().optional(),
      endDateTime: z.string().datetime().optional(),
      venue: z.string().trim().min(2).max(200).optional(),
      capacity: z.coerce.number().int().min(1).optional(),
      registrationDeadline: z.string().datetime().optional(),
      bannerUrl: z.string().trim().optional(),
      allowCancellation: z.boolean().optional(),
      cancellationDeadline: z.string().datetime().optional().nullable(),
      certificateEnabled: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.startDateTime && data.endDateTime) {
          return new Date(data.endDateTime) > new Date(data.startDateTime);
        }
        return true;
      },
      {
        message: 'End date and time must be after start date and time',
        path: ['endDateTime'],
      }
    ),
});

const cancelEventSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }),
});

const eventIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
});

const discoveryQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    category: z.enum(eventCategories).optional(),
    clubId: z.string().regex(objectIdRegex, 'Invalid club ID format').optional(),
    dateFilter: z.enum(['all', 'today', 'upcoming']).optional().default('upcoming'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
  }),
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  eventIdParamSchema,
  discoveryQuerySchema,
};
