/**
 * Core domain types for the NourishNet platform.
 *
 * These types are pure TypeScript — no AWS SDK, no I/O, no side effects.
 */

// ---------------------------------------------------------------------------
// Role and category enumerations
// ---------------------------------------------------------------------------

/** The four user roles in the NourishNet platform. */
export type UserRole = 'Donor' | 'Organization' | 'Volunteer' | 'Admin';

/** Categories of food that can be donated. */
export type FoodCategory =
  | 'produce'    // Fruit and vegetables
  | 'bakery'     // Bread, pastries
  | 'dairy'      // Milk, cheese, yoghurt
  | 'prepared'   // Cooked or prepared meals
  | 'dry_goods'  // Pasta, rice, tinned goods
  | 'frozen'     // Frozen food
  | 'beverages'  // Drinks
  | 'other';     // Uncategorised

/** Lifecycle states for a food donation listing. */
export type DonationStatus =
  | 'draft'
  | 'available'
  | 'claimed'
  | 'in_transit'
  | 'completed'
  | 'cancelled'
  | 'expired';

// ---------------------------------------------------------------------------
// DynamoDB entity interfaces
// ---------------------------------------------------------------------------

/**
 * DynamoDB record shape for a USER entity.
 *
 * Key pattern:
 *   PK:     USER#<userId>
 *   SK:     METADATA
 *   GSI1PK: ROLE#<role>
 *   GSI1SK: USER#<userId>
 */
export interface UserRecord {
  /** Partition key — `USER#<userId>` */
  PK: string;
  /** Sort key — always `METADATA` for user records */
  SK: 'METADATA';
  /** GSI1 partition key — `ROLE#<role>` (supports listing users by role) */
  GSI1PK: string;
  /** GSI1 sort key — `USER#<userId>` */
  GSI1SK: string;
  /** Cognito sub (UUID) */
  userId: string;
  /** User's email address — never logged or exposed in aggregates */
  email: string;
  /** Assigned Cognito group role */
  role: UserRole;
  /** ISO-8601 datetime when the record was created */
  createdAt: string;
  /** ISO-8601 datetime when the record was last updated */
  updatedAt: string;
}
