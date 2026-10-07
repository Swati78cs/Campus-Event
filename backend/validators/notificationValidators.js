const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: z.string().regex(objectIdRegex, 'Invalid notification ID format'),
  }),
});

const listNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    isRead: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val === undefined ? undefined : val === 'true')),
  }),
});

const createAnnouncementSchema = z.object({
  params: z.object({
    eventId: z.string().regex(objectIdRegex, 'Invalid event ID format'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(120, 'Title cannot exceed 120 characters')
      .trim(),
    message: z
      .string()
      .min(1, 'Message is required')
      .max(2000, 'Message cannot exceed 2000 characters')
      .trim(),
  }),
});

module.exports = {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
  createAnnouncementSchema,
};
