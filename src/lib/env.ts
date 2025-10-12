/**
 * Environment Variable Validation
 *
 * This file validates all required environment variables at startup.
 * If any required variables are missing, the app will fail fast with a clear error message.
 *
 * Usage: Import this file early in your app (layout.tsx, middleware, etc.)
 */

import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Supabase (Required for all environments)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),

  // Supabase Service Role (Optional - only for server-side admin operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Mercado Pago (Optional - only needed if payment features are enabled)
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_MP_PUBLIC_KEY: z.string().optional(),

  // OpenAI (Optional - only for AI features)
  OPENAI_API_KEY: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Upstash Redis (Optional - for rate limiting, will add later)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Type inference from schema
export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws descriptive error if validation fails
 */
function validateEnv(): Env {
  // Skip validation in test mode - use mock values
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      MP_ACCESS_TOKEN: undefined,
      MP_WEBHOOK_SECRET: undefined,
      NEXT_PUBLIC_MP_PUBLIC_KEY: undefined,
      OPENAI_API_KEY: undefined,
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    };
  }

  // On client-side, only validate public variables
  const isClient = typeof window !== 'undefined';

  if (isClient) {
    // Client-side validation - only check NEXT_PUBLIC_ variables
    const clientSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      NEXT_PUBLIC_MP_PUBLIC_KEY: z.string().optional(),
      NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    });

    try {
      const validated = clientSchema.parse(process.env);
      // Return a partial env object for client-side
      return validated as Env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = (error.errors || []).map(
          (err) => `  ❌ ${err.path.join('.')}: ${err.message}`
        ).join('\n');

        console.error(
          `\n⚠️  Client Environment Validation Failed!\n\n${missingVars}\n\n` +
          `Please check your .env.local file.\n`
        );
      }
      // On client, return partial object to prevent crash
      return process.env as Env;
    }
  }

  // Server-side validation - check all variables
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = (error.errors || []).map(
        (err) => `  ❌ ${err.path.join('.')}: ${err.message}`
      ).join('\n');

      throw new Error(
        `\n⚠️  Environment Validation Failed!\n\n${missingVars}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.\n` +
        `See .env.example for reference.\n`
      );
    }
    throw error;
  }
}

/**
 * Validated environment variables
 *
 * Import and use this instead of process.env to ensure type safety
 * and validation.
 *
 * @example
 * import { env } from '@/lib/env';
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL; // ✅ Type-safe and validated
 */
export const env = validateEnv();

/**
 * Check if we're in development mode
 */
export const isDev = env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProd = env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
