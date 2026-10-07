const { z } = require('zod');

// Student registration schema
const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
  }),
});

// Login schema
const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password cannot be empty'),
  }),
});

// Profile update schema
const profileUpdateSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters'),
  }),
});

// Admin user activation/deactivation schema
const userStatusUpdateSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive status (boolean) is required' }),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  userStatusUpdateSchema,
};
