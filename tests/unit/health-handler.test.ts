/**
 * Unit tests for the health Lambda handler.
 *
 * Tests:
 *  1. 200 body shape — DynamoDB resolves → { data: { status: 'ok', timestamp: <ISO-8601> } }
 *  2. 503 body — DynamoDB throws → { status: 'degraded', reason: 'database_unreachable' }
 *  3. ISO-8601 timestamp — timestamp in 200 response is a valid ISO-8601 datetime string
 *
 * Mocking strategy:
 *  - `@aws-sdk/client-dynamodb` is mocked via vi.mock (hoisted) so that the module-scope
 *    `new DynamoDBClient({})` in the handler receives a mock whose `.send` we control.
 *  - `../../../backend/src/repositories/dynamo-client.js` is mocked to prevent the
 *    TABLE_NAME env-var guard from throwing at module load time.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// ---------------------------------------------------------------------------
// Hoisted mock setup — vi.hoisted runs BEFORE vi.mock factories, so mockSend
// is available when DynamoDBClient is constructed at handler module-load time.
// ---------------------------------------------------------------------------
const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  DescribeTableCommand: vi.fn(),
}));

vi.mock('../../backend/src/repositories/dynamo-client', () => ({
  TABLE_NAME: 'test-table',
}));

// Import handler AFTER the mocks are registered.
import { handler } from '../../backend/src/handlers/health';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEvent = (): APIGatewayProxyEventV2 =>
  ({
    requestContext: { requestId: 'test-request-id' },
  }) as unknown as APIGatewayProxyEventV2;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('health handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with { data: { status: "ok", timestamp: <ISO-8601> } } when DynamoDB resolves', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent());

    expect(result).toMatchObject({ statusCode: 200 });

    const body = JSON.parse((result as { body: string }).body) as unknown;
    expect(body).toMatchObject({
      data: {
        status: 'ok',
      },
    });

    // Timestamp must be present and a non-empty string
    const data = (body as { data: { status: string; timestamp: string } }).data;
    expect(typeof data.timestamp).toBe('string');
    expect(data.timestamp.length).toBeGreaterThan(0);
  });

  it('returns 503 with { status: "degraded", reason: "database_unreachable" } when DynamoDB throws', async () => {
    mockSend.mockRejectedValueOnce(new Error('Connection timeout'));

    const result = await handler(makeEvent());

    expect(result).toMatchObject({ statusCode: 503 });

    const body = JSON.parse((result as { body: string }).body) as unknown;
    expect(body).toEqual({
      status: 'degraded',
      reason: 'database_unreachable',
    });
  });

  it('timestamp in 200 response is a valid ISO-8601 datetime string', async () => {
    const fixedDate = '2024-06-01T12:00:00.000Z';
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fixedDate);

    mockSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent());

    expect(result).toMatchObject({ statusCode: 200 });

    const body = JSON.parse((result as { body: string }).body) as unknown;
    const data = (body as { data: { status: string; timestamp: string } }).data;

    // Verify the spy was honoured — the handler used the mocked toISOString value
    expect(data.timestamp).toBe(fixedDate);

    // Also verify it is a parseable ISO-8601 datetime (Date.parse returns NaN for invalid strings)
    expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false);
  });
});
