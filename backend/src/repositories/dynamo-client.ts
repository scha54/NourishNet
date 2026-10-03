/**
 * DynamoDB DocumentClient singleton.
 *
 * Initialised once at cold-start from the TABLE_NAME environment variable.
 * The singleton is reused across invocations within the same execution environment.
 *
 * Security notes:
 *  - Credentials are sourced exclusively from the Lambda execution role — never from
 *    environment variables or source code.
 *  - No credential values are logged at any point.
 *  - TABLE_NAME is validated at initialisation time so misconfigured deployments fail
 *    fast rather than silently at runtime.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * The DynamoDB table name sourced from the Lambda environment.
 * Validated at module load time — throws early if the variable is absent.
 */
const tableName = process.env['TABLE_NAME'];
if (!tableName) {
  throw new Error('TABLE_NAME environment variable is not set');
}

/** Exported so handlers and repositories can reference the table without re-reading the env. */
export const TABLE_NAME: string = tableName;

/**
 * Underlying low-level DynamoDB client.
 * Region is resolved automatically from the Lambda execution environment.
 */
const dynamoDBClient = new DynamoDBClient({});

/**
 * High-level DocumentClient that automatically marshals/unmarshals
 * JavaScript objects to/from DynamoDB AttributeValue format.
 *
 * This is the singleton that all repository modules must import and use.
 * Do not create additional DynamoDBDocumentClient instances.
 */
export const docClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    // Omit undefined attributes rather than serialising them as NULL.
    removeUndefinedValues: true,
    // Do not convert empty strings to NULL — preserve them as-is.
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    // Keep numbers as strings to avoid JavaScript floating-point precision loss
    // for large IDs. Downstream code must parse numeric attributes explicitly.
    wrapNumbers: false,
  },
});
