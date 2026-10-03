/**
 * Property-based tests for the NourishNet API response envelope.
 *
 * Validates: Requirements 1.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { successResponse, errorResponse } from '../../backend/src/domain/response';

describe('Response envelope — round-trip property', () => {
  /**
   * Property 1a: Success envelope serialises and round-trips arbitrary JSON-serialisable data.
   *
   * For all JSON-serialisable values, the body produced by successResponse must
   * deserialise back to a value deeply equal to the original input.
   */
  it('success envelope serialises and round-trips arbitrary JSON-serialisable data', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (data) => {
        const result = successResponse(data);
        const parsed = JSON.parse(result.body as string);
        expect(parsed.data).toStrictEqual(data);
      }),
    );
  });

  /**
   * Property 1b: Error envelope preserves code and message for non-5xx status codes.
   *
   * For all SCREAMING_SNAKE_CASE error codes and non-empty messages, the body
   * produced by errorResponse with a 4xx status must deserialise with the original
   * code and message intact, and must not contain a top-level `data` field.
   */
  it('error envelope preserves code and message for non-5xx status codes', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Z0-9_]*$/),
        fc.string({ minLength: 1 }),
        (code, message) => {
          const result = errorResponse(400, code, message);
          const parsed = JSON.parse(result.body as string);

          expect(parsed.error.code).toBe(code);
          expect(parsed.error.message).toBe(message);
          expect(parsed).not.toHaveProperty('data');
        },
      ),
    );
  });
});
