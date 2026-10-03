/**
 * DynamoDB primary-key builder functions.
 *
 * This module is part of the domain layer and MUST NOT import the AWS SDK
 * or any I/O library. It contains only pure, deterministic functions.
 *
 * Security notes:
 *  - These functions accept only validated UUIDs. Raw user input (e.g. path
 *    parameters, query strings, request body fields) must be validated with
 *    the Zod `uuidSchema` in `backend/src/validation/common.ts` before being
 *    passed here.
 *  - All key construction happens in this layer — the repository layer calls
 *    these builders rather than concatenating key strings inline, preventing
 *    injection of unexpected key prefixes by callers.
 */

// ---------------------------------------------------------------------------
// Primary-key objects
// Each type models the minimum key pair needed for a PK/SK GetItem lookup.
// ---------------------------------------------------------------------------

/** Primary key for a USER entity. */
export interface UserPrimaryKey {
  /** `USER#<userId>` */
  PK: string;
  /** Always `METADATA` for user records. */
  SK: 'METADATA';
}

/** Primary key for a DONATION entity. */
export interface DonationPrimaryKey {
  /** `DONATION#<donationId>` */
  PK: string;
  /** Always `METADATA` for donation records. */
  SK: 'METADATA';
}

/** Primary key for a PICKUP entity. */
export interface PickupPrimaryKey {
  /** `PICKUP#<pickupId>` */
  PK: string;
  /** Always `METADATA` for pickup records. */
  SK: 'METADATA';
}

/** Primary key for a REPORT entity. */
export interface ReportPrimaryKey {
  /** `REPORT#<reportId>` */
  PK: string;
  /** Always `METADATA` for report records. */
  SK: 'METADATA';
}

// ---------------------------------------------------------------------------
// Builder functions
// ---------------------------------------------------------------------------

/**
 * Build the primary key for a USER record.
 *
 * Access pattern AP-1: fetch user by userId.
 *
 * @param userId - A validated UUID (Cognito sub) identifying the user.
 * @returns `{ PK: 'USER#<userId>', SK: 'METADATA' }`
 */
export function buildUserKey(userId: string): UserPrimaryKey {
  return {
    PK: `USER#${userId}`,
    SK: 'METADATA',
  };
}

/**
 * Build the primary key for a DONATION record.
 *
 * Access pattern AP-3: fetch donation by donationId.
 *
 * @param donationId - A validated UUID identifying the donation.
 * @returns `{ PK: 'DONATION#<donationId>', SK: 'METADATA' }`
 */
export function buildDonationKey(donationId: string): DonationPrimaryKey {
  return {
    PK: `DONATION#${donationId}`,
    SK: 'METADATA',
  };
}

/**
 * Build the primary key for a PICKUP record.
 *
 * Access pattern AP-6: fetch pickup by pickupId.
 *
 * @param pickupId - A validated UUID identifying the pickup.
 * @returns `{ PK: 'PICKUP#<pickupId>', SK: 'METADATA' }`
 */
export function buildPickupKey(pickupId: string): PickupPrimaryKey {
  return {
    PK: `PICKUP#${pickupId}`,
    SK: 'METADATA',
  };
}

/**
 * Build the primary key for a REPORT record.
 *
 * Access pattern AP-9: fetch report by reportId.
 *
 * @param reportId - A validated UUID identifying the report.
 * @returns `{ PK: 'REPORT#<reportId>', SK: 'METADATA' }`
 */
export function buildReportKey(reportId: string): ReportPrimaryKey {
  return {
    PK: `REPORT#${reportId}`,
    SK: 'METADATA',
  };
}
