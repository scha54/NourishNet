import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * ANY /v1/{proxy+} — placeholder API handler.
 *
 * Real route handlers are added in Specs 2–6. This placeholder returns 404
 * for all routes so the API Gateway integration is wired up and testable.
 */
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not implemented',
      },
    }),
  };
};
