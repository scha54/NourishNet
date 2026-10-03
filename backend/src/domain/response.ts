import type { APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * Wraps a successful payload in the NourishNet API response envelope.
 *
 * Shape: { "data": <payload> }
 */
export function successResponse(data: unknown, statusCode: number = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  };
}

/**
 * Wraps an error in the NourishNet API error envelope.
 *
 * Shape: { "error": { "code": "...", "message": "...", "details"?: {...} } }
 *
 * Stack traces are never included. INTERNAL_ERROR responses always use
 * a generic message regardless of the `message` argument, so that internal
 * implementation details are never leaked to API consumers.
 */
export function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): APIGatewayProxyResultV2 {
  // Never expose internal details for 500-class errors
  const safeMessage = statusCode >= 500 ? 'An unexpected error occurred' : message;

  const errorBody: {
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  } = {
    error: {
      code,
      message: safeMessage,
    },
  };

  if (details !== undefined && statusCode < 500) {
    errorBody.error.details = details;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(errorBody),
  };
}
