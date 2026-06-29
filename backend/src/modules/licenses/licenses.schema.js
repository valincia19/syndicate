const { z } = require('zod');

const licenseParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid License ID. Must be a valid UUID format' }),
});

const createLicenseSchema = z
  .object({
    user_id: z.string().uuid().optional().nullable(),
    tier: z.enum(['free', 'premium', 'pro']).optional(),
    hwid_limit: z.number().int().min(1).max(9999).optional(),
    duration_days: z.number().int().min(0).max(3650).optional(),
  })
  .strict();

const updateLicenseSchema = z
  .object({
    user_id: z.string().uuid().optional().nullable(),
    tier: z.enum(['free', 'premium', 'pro']).optional(),
    status: z.enum(['unused', 'active', 'revoked', 'expired']).optional(),
    hwid_limit: z.number().int().min(1).max(9999).optional(),
    expires_at: z.string().datetime().optional().nullable(),
    max_uses: z.number().int().min(0).optional(),
    uses: z.number().int().min(0).optional(),
    hwid: z.string().optional().nullable(),
  })
  .strict();

const lookupQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100),
});

module.exports = {
  licenseParamsSchema,
  createLicenseSchema,
  updateLicenseSchema,
  lookupQuerySchema,
};
