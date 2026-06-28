const { z } = require('zod');

const userParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

const updateUserSchema = z
  .object({
    name: z.string().min(2).max(50).optional(),
    username: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric').min(3).max(30).optional(),
    email: z.string().email().optional(),
    balance: z.number().min(0).optional(),
    role: z.enum(['user', 'staff', 'developer', 'admin', 'owner']).optional(),
    is_suspended: z.boolean().optional(),
  })
  .strict(); // Disallow mass assignment of unlisted or system internal properties

const updateRoleSchema = z
  .object({
    role: z.enum(['user', 'staff', 'developer', 'admin', 'owner'], {
      errorMap: () => ({ message: 'Invalid role provided' }),
    }),
  })
  .strict();

const toggleSuspendSchema = z
  .object({
    suspended: z.boolean(),
  })
  .strict();

module.exports = {
  userParamsSchema,
  updateUserSchema,
  updateRoleSchema,
  toggleSuspendSchema,
};
