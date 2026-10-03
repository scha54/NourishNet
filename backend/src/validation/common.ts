import { z } from 'zod';

/**
 * Shared Zod validation schemas for the NourishNet backend.
 *
 * All schemas use `.strict()` where applicable to reject unknown properties,
 * and string schemas include explicit length bounds per the security steering.
 *
 * Requirements: 18.3
 */

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

/**
 * Validates a UUID v4 string.
 *
 * Use this for all entity IDs (userId, donationId, pickupId, reportId) to
 * ensure raw user input is never passed directly to DynamoDB key builders.
 */
export const uuidSchema: z.ZodString = z.string().uuid();

/**
 * Validates an ISO-8601 datetime string.
 *
 * Accepts the full datetime format produced by `new Date().toISOString()`,
 * e.g. `"2024-01-15T12:30:00.000Z"`. Length bounds match the fixed-length
 * output of `Date.prototype.toISOString`.
 */
export const isoDateSchema: z.ZodString = z
  .string()
  .min(20)   // Shortest valid ISO-8601 datetime: "2024-01-01T00:00:00Z"
  .max(30)   // Longest expected output of toISOString(): "2024-01-01T00:00:00.000Z"
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    'Must be a valid ISO-8601 UTC datetime string (e.g. 2024-01-15T12:30:00.000Z)',
  );

/**
 * Validates a non-empty string with a maximum length of 1000 characters.
 *
 * Suitable for free-text fields such as descriptions and notes where content
 * is human-authored but must be bounded to prevent oversized payloads.
 *
 * Override `.max()` via chaining when a tighter bound is required:
 * `nonEmptyStringSchema.max(100)`
 */
export const nonEmptyStringSchema: z.ZodString = z.string().min(1).max(1000);

// ---------------------------------------------------------------------------
// Object wrapper (strict mode helper)
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper that builds a strict Zod object schema — unknown keys
 * are rejected per the security steering rule requiring `.strict()` on all
 * request-body schemas.
 *
 * @example
 * const createUserSchema = strictObject({
 *   email: z.string().email(),
 *   role: z.enum(['Donor', 'Organization', 'Volunteer']),
 * });
 */
export function strictObject<T extends z.ZodRawShape>(
  shape: T,
): z.ZodObject<T, 'strict'> {
  return z.strictObject(shape);
}
