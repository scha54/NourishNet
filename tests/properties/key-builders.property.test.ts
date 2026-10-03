/**
 * Property-based tests for DynamoDB key builder functions.
 *
 * Validates: Requirements 11.1, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildUserKey,
  buildDonationKey,
  buildPickupKey,
  buildReportKey,
} from '../../backend/src/domain/key-builders';

describe('Key builder consistency (Property 3)', () => {
  /**
   * Property 3a: buildUserKey produces correct PK and SK for all UUIDs.
   *
   * For all valid UUIDs, the key returned by buildUserKey must have
   * PK === 'USER#' + id and SK === 'METADATA', with no null/undefined fields.
   */
  it('buildUserKey produces correct PK and non-null fields for all UUIDs', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const key = buildUserKey(id);

        expect(key.PK).toBe(`USER#${id}`);
        expect(key.SK).toBe('METADATA');
        expect(key.PK).not.toBeNull();
        expect(key.PK).not.toBeUndefined();
        expect(key.SK).not.toBeNull();
        expect(key.SK).not.toBeUndefined();
      }),
    );
  });

  /**
   * Property 3b: buildDonationKey produces correct PK and SK for all UUIDs.
   *
   * For all valid UUIDs, the key returned by buildDonationKey must have
   * PK === 'DONATION#' + id and SK === 'METADATA', with no null/undefined fields.
   */
  it('buildDonationKey produces correct PK and non-null fields for all UUIDs', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const key = buildDonationKey(id);

        expect(key.PK).toBe(`DONATION#${id}`);
        expect(key.SK).toBe('METADATA');
        expect(key.PK).not.toBeNull();
        expect(key.PK).not.toBeUndefined();
        expect(key.SK).not.toBeNull();
        expect(key.SK).not.toBeUndefined();
      }),
    );
  });

  /**
   * Property 3c: buildPickupKey produces correct PK and SK for all UUIDs.
   *
   * For all valid UUIDs, the key returned by buildPickupKey must have
   * PK === 'PICKUP#' + id and SK === 'METADATA', with no null/undefined fields.
   */
  it('buildPickupKey produces correct PK and non-null fields for all UUIDs', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const key = buildPickupKey(id);

        expect(key.PK).toBe(`PICKUP#${id}`);
        expect(key.SK).toBe('METADATA');
        expect(key.PK).not.toBeNull();
        expect(key.PK).not.toBeUndefined();
        expect(key.SK).not.toBeNull();
        expect(key.SK).not.toBeUndefined();
      }),
    );
  });

  /**
   * Property 3d: buildReportKey produces correct PK and SK for all UUIDs.
   *
   * For all valid UUIDs, the key returned by buildReportKey must have
   * PK === 'REPORT#' + id and SK === 'METADATA', with no null/undefined fields.
   */
  it('buildReportKey produces correct PK and non-null fields for all UUIDs', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const key = buildReportKey(id);

        expect(key.PK).toBe(`REPORT#${id}`);
        expect(key.SK).toBe('METADATA');
        expect(key.PK).not.toBeNull();
        expect(key.PK).not.toBeUndefined();
        expect(key.SK).not.toBeNull();
        expect(key.SK).not.toBeUndefined();
      }),
    );
  });

  /**
   * Property 3e: All key builders embed the input UUID verbatim in the PK.
   *
   * The UUID must appear after the prefix separator '#' unchanged — no encoding,
   * truncation, or transformation is applied.
   */
  it('all key builders embed the UUID verbatim after the prefix separator', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        expect(buildUserKey(id).PK.endsWith(id)).toBe(true);
        expect(buildDonationKey(id).PK.endsWith(id)).toBe(true);
        expect(buildPickupKey(id).PK.endsWith(id)).toBe(true);
        expect(buildReportKey(id).PK.endsWith(id)).toBe(true);
      }),
    );
  });

  /**
   * Property 3f: All key builders return SK === 'METADATA' (literal constant).
   *
   * The SK value must always be the string literal 'METADATA' for every entity
   * type and every UUID input.
   */
  it('all key builders always return SK equal to the literal METADATA', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        expect(buildUserKey(id).SK).toBe('METADATA');
        expect(buildDonationKey(id).SK).toBe('METADATA');
        expect(buildPickupKey(id).SK).toBe('METADATA');
        expect(buildReportKey(id).SK).toBe('METADATA');
      }),
    );
  });
});
