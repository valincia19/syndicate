const { z } = require('zod');

// A07 - Weak password policy: min 8 char, harus ada huruf + angka
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password cannot exceed 100 characters')
  .refine(val => /[a-zA-Z]/.test(val), { message: 'Password must contain at least one letter' })
  .refine(val => /[0-9]/.test(val), { message: 'Password must contain at least one number' });

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters').trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address').max(100).toLowerCase(),
  password: strongPassword,
}).strict();

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(100).toLowerCase(),
  password: z.string().min(1, 'Password is required').max(200),
}).strict();

const verifyEmailSchema = z.object({
  code: z.string().min(1, 'Verification code is required').max(10),
}).strict();

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(100).toLowerCase(),
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').max(200),
  newPassword: strongPassword,
}).strict();

const validateResetTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').max(200),
}).strict();

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateResetTokenSchema,
};
