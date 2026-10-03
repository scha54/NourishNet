/**
 * Integration test for the health Lambda handler.
 *
 * This test exercises the handler's full wiring (DynamoDB probe → response envelope)
 * using MOCKED AWS clients — no live AWS resources are contacted. It verifies that
 * the handler correctly translates DynamoDB reachability into the documented HTTP
 * contract for GET /v1/health.
 *
 * Requirements covered:
 *  - 17.1 — Healthy path returns HTTP 200 with { data: { status: 'ok', timestamp } }.
 *  - 17.2 — Degraded path returns HTTP 503 with { status: 'degraded', reason: 'database_unreachable' }.
 *  - 17.3 — The healthy-path timestamp is a valid ISO-8601 datetime string.
 *
 * Mocking strategy (mirrors tests/unit/health-handler.test.ts):
 *  - `@aws-sdk/client-dynamodb` is mocked via a hoisted factory so that the
 *    module-scope `new DynamoDBClient({})` in the handler receives a mock whose
 *    `.send` we control per test.
 *  - `../../backend/src/repositories/dynamo-client` is mocked so the TABLE_NAME
 *    env-var guard does not throw at module-load time.
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
  TABLE_NAME: 'NourishNetTable-test',
}));

// Import handler AFTER the mocks are registered.
import { handler } from '../../backend/src/handlers/health';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface HealthyBody {
  data: {
    status: string;
    timestamp: string;
  };
}

interface DegradedBody {
  status: string;
  reason: string;
}

const makeEvent = (): APIGatewayProxyEventV2 =>
  ({
    requestContext: { requestId: 'integration-request-id' },
  }) as unknown as APIGatewayProxyEventV2;

const parseBody = <T>(result: APIGatewayProxyResultLike): T =>
  JSON.parse(result.body) as T;

interface APIGatewayProxyResultLike {
  statusCode: number;
  body: string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('health handler — integration (mocked AWS clients)', () => {
  beforeEach(() => {
    process.env['TABLE_NAME'] = 'NourishNetTable-test';
    vi.restoreAllMocks();
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 1: returns HTTP 200 with { data: { status: "ok", timestamp } } when DynamoDB resolves', async () => {
    // DynamoDB DescribeTable resolves successfully → healthy.
    mockSend.mockResolvedValueOnce({});

    const result = (await handler(makeEvent())) as APIGatewayProxyResultLike;

    expect(result.statusCode).toBe(200);

    const body = parseBody<HealthyBody>(result);
    expect(body).toStrictEqual({
      data: {
        status: 'ok',
        timestamp: expect.any(String) as unknown as string,
      },
    });
    expect(body.data.status).toBe('ok');
    expect(typeof body.data.timestamp).toBe('string');
  });

  it('Test 2: returns HTTP 503 with { status: "degraded", reason: "database_unreachable" } when DynamoDB throws', async () => {
    // DynamoDB DescribeTable rejects → database unreachable → degraded.
    mockSend.mockRejectedValueOnce(new Error('ResourceNotFoundException: table unreachable'));

    const result = (await handler(makeEvent())) as APIGatewayProxyResultLike;

    expect(result.statusCode).toBe(503);

    const body = parseBody<DegradedBody>(result);
    expect(body).toStrictEqual({
      status: 'degraded',
      reason: 'database_unreachable',
    });
  });

  it('Test 3: timestamp in the 200 response is a valid ISO-8601 datetime string', async () => {
    mockSend.mockResolvedValueOnce({});

    const result = (await handler(makeEvent())) as APIGatewayProxyResultLike;

    expect(result.statusCode).toBe(200);

    const body = parseBody<HealthyBody>(result);
    const { timestamp } = body.data;

    // ISO-8601 datetime with milliseconds and UTC 'Z' designator,
    // matching the output of Date.prototype.toISOString().
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(timestamp).toMatch(iso8601Pattern);

    // Date.parse must accept it (returns NaN for invalid strings).
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);

    // Round-trip: re-serialising the parsed date yields the same string.
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
