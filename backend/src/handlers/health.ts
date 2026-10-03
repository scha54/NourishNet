/**
 * Health check Lambda handler.
 *
 * Probes DynamoDB reachability and returns a structured health response.
 * This endpoint is unauthenticated (GET /v1/health) and is used for
 * infrastructure monitoring and deployment verification.
 *
 * Security notes:
 *  - No PII is logged at any point.
 *  - Stack traces are never exposed in responses.
 *  - DynamoDB credentials come exclusively from the Lambda execution role.
 */

import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

import { successResponse, errorResponse } from '../domain/response.js';
import { TABLE_NAME } from '../repositories/dynamo-client.js';

const dynamoClient = new DynamoDBClient({});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const start = Date.now();
  const requestId = event.requestContext.requestId;
  const route = 'GET /v1/health';

  try {
    try {
      await dynamoClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    } catch {
      const durationMs = Date.now() - start;
      console.log(
        JSON.stringify({
          level: 'warn',
          requestId,
          route,
          statusCode: 503,
          durationMs,
          timestamp: new Date().toISOString(),
          message: 'DynamoDB unreachable',
        }),
      );

      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'degraded', reason: 'database_unreachable' }),
      };
    }

    const timestamp = new Date().toISOString();
    const durationMs = Date.now() - start;

    console.log(
      JSON.stringify({
        level: 'info',
        requestId,
        route,
        statusCode: 200,
        durationMs,
        timestamp,
      }),
    );

    return successResponse({ status: 'ok', timestamp });
  } catch {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        level: 'error',
        requestId,
        route,
        statusCode: 500,
        durationMs,
        timestamp: new Date().toISOString(),
        message: 'Unexpected error in health handler',
      }),
    );

    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
};
