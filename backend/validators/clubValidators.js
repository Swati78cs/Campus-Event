const { z } = require('zod');

const clubCategories = ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Other'];

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createClubSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Club name is required' })
      .trim()
      .min(2, 'Club name must be at least 2 characters long')
      .max(100, 'Club name cannot exceed 100 characters'),
    description: z
      .string({ required_error: 'Club description is required' })
      .trim()
      .min(10, 'Club description must be at least 10 characters long')
      .max(1000, 'Club description cannot exceed 1000 characters'),
    category: z.enum(clubCategories, {
      required_error: 'Valid club category is required',
    }),
    organizers: z.array(z.string().regex(objectIdRegex, 'Invalid organizer ID')).optional(),
  }),
});

const updateClubSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid club ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().min(10).max(1000).optional(),
    category: z.enum(clubCategories).optional(),
    isActive: z.boolean().optional(),
  }),
});

const assignOrganizerSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid club ID format'),
  }),
  body: z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
});

const removeOrganizerSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid club ID format'),
    userId: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
});

const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid user ID format'),
  }),
  body: z.object({
    role: z.enum(['student', 'organizer', 'admin'], {
      required_error: 'Valid user role is required',
    }),
  }),
});

module.exports = {
  createClubSchema,
  updateClubSchema,
  assignOrganizerSchema,
  removeOrganizerSchema,
  updateUserRoleSchema,
};
