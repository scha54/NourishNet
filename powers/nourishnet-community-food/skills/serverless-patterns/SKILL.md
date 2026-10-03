# Serverless Patterns

## Overview

This skill captures the reusable AWS serverless patterns for NourishNet: how Lambda handlers are structured, how DynamoDB keys are built for the single-table design, how caller identity is extracted from Cognito, how CDK IAM roles stay least-privilege, and how handlers emit structured logs. Use it when scaffolding handlers, writing repository code, or reviewing CDK stacks so that every function follows the documented architecture.

The platform runs React (Amplify Hosting) → API Gateway (HTTP API) → Lambda (Node.js 20.x) → DynamoDB, with Amazon Cognito for auth and CloudWatch for logs.

---

## Lambda Handler Pattern

Every handler wraps its logic in a top-level `try/catch`, keeps the three layers separate, returns the standard envelope via the shared helpers, and logs structurally.

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

import { successResponse, errorResponse } from '../domain/response';
import { ValidationError, NotFoundError } from '../domain/errors';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const requestId = event.requestContext.requestId;
  const route = event.requestContext.routeKey;

  try {
    // 1. Validation layer — parse/validate input with a Zod schema (.strict())
    // 2. Domain layer    — pure business logic, no AWS SDK imports
    // 3. Repository layer — DynamoDB access via injected client
    const data = await doWork(event);

    log({ requestId, route, level: 'info', statusCode: 200 });
    return successResponse(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      log({ requestId, route, level: 'warn', statusCode: 400 });
      return errorResponse(400, 'VALIDATION_ERROR', error.message);
    }
    if (error instanceof NotFoundError) {
      log({ requestId, route, level: 'warn', statusCode: 404 });
      return errorResponse(404, 'NOT_FOUND', error.message);
    }
    log({ requestId, route, level: 'error', statusCode: 500 });
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
};
```

### Layer separation

- **validation → domain → repository**, in that order. Input is validated before any business logic runs; business logic never touches I/O; repositories never contain business logic.
- `handlers/` must not import from `repositories/` directly — inject the repository dependency.
- `domain/` must not import the AWS SDK, Zod, or any I/O library — it stays pure and unit-testable.

### Response envelope

Always return through the shared helpers in `backend/src/domain/response.ts`:

- `successResponse(data, statusCode = 200)` → `{ "data": <payload> }`
- `errorResponse(statusCode, code, message, details?)` → `{ "error": { "code", "message", "details"? } }`

`errorResponse` deliberately replaces the message with a generic string for 5xx responses and drops `details`, so internal implementation details never leak to API consumers. Never return raw strings or unstructured objects from a handler.

---

## DynamoDB Key Builders

All key construction lives in `backend/src/domain/key-builders.ts` (pure, no AWS SDK). The repository layer calls these builders rather than concatenating key strings inline — this keeps the single-table key surface explicit and prevents callers from injecting unexpected prefixes.

| Builder | Access pattern | Returns |
|---------|---------------|---------|
| `buildUserKey(userId)` | AP-1 — fetch user by userId | `{ PK: 'USER#<userId>', SK: 'METADATA' }` |
| `buildDonationKey(donationId)` | AP-3 — fetch donation by donationId | `{ PK: 'DONATION#<donationId>', SK: 'METADATA' }` |
| `buildPickupKey(pickupId)` | AP-6 — fetch pickup by pickupId | `{ PK: 'PICKUP#<pickupId>', SK: 'METADATA' }` |
| `buildReportKey(reportId)` | AP-9 — fetch report by reportId | `{ PK: 'REPORT#<reportId>', SK: 'METADATA' }` |

### Single-table design

One table, `NourishNetTable-<environment>`, holds every entity. Primary key is `PK`/`SK`; two global secondary indexes support list queries.

| Entity | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|--------|----|----|--------|--------|--------|--------|
| USER | `USER#<userId>` | `METADATA` | `ROLE#<role>` | `USER#<userId>` | — | — |
| DONATION | `DONATION#<donationId>` | `METADATA` | `STATUS#<status>` | `DONATION#<donationId>` | `DONOR#<donorId>` | `DONATION#<donationId>` |
| PICKUP | `PICKUP#<pickupId>` | `METADATA` | `DONATION#<donationId>` | `PICKUP#<pickupId>` | `VOLUNTEER#<volunteerId>` | `PICKUP#<pickupId>` |
| REPORT | `REPORT#<reportId>` | `METADATA` | `ORG#<orgId>` | `REPORT#<reportId>` | — | — |

Rules:

- Key builders accept only **validated UUIDs**. Validate raw input with the Zod `uuidSchema` in `backend/src/validation/common.ts` before passing it to a builder — never pass raw user input as a DynamoDB key.
- All access goes through the documented access patterns. **Scan operations are forbidden.** A new access pattern must be covered by an existing GSI before any new index is added.

Key builders are a high-value property-based testing target (round-trip and prefix-correctness properties across arbitrary UUIDs).

---

## Cognito JWT Extraction

API Gateway's Cognito authorizer validates the JWT **before** the Lambda is invoked. Handlers must not re-validate the token manually.

- Read caller identity from `event.requestContext.authorizer.jwt.claims` — **never** from a header value.
- The `cognito:groups` claim is the **authoritative** source of the caller's role. Never trust a role passed in the request body or query string.
- Never log token values; tokens travel over HTTPS only.

```typescript
const claims = event.requestContext.authorizer?.jwt?.claims ?? {};
const userId = claims.sub as string;              // Cognito sub (UUID)
const groups = claims['cognito:groups'] as string; // authoritative role source
```

---

## CDK IAM Least-Privilege

Each Lambda gets its own IAM role scoped to exactly the actions and resources it needs.

- **One dedicated role per Lambda** — never share a single execution role across functions.
- **No wildcard actions** (`"Action": "*"`) and **no wildcard resources** (`"Resource": "*"`).
- Scope resources to **specific table and GSI ARNs**, not the account or region.
- Use managed policies attached to the role — no inline policies on the stack construct.

| Lambda type | Permitted actions | Resource scope |
|-------------|-------------------|----------------|
| Health check | `dynamodb:DescribeTable` (or none) | the specific table ARN |
| Read | `dynamodb:GetItem`, `dynamodb:Query` | the table ARN **and** its specific GSI ARNs |
| Write | `dynamodb:PutItem`, `dynamodb:UpdateItem` | the specific table ARN only |
| Admin | `dynamodb:DeleteItem` | the specific table ARN, only where business logic requires deletion |

Query permissions require the GSI ARNs explicitly (e.g., `arn:aws:dynamodb:<region>:<account>:table/NourishNetTable-<env>/index/GSI1`) — a table ARN alone does not grant index access.

---

## CloudWatch Structured Logging

Emit one structured JSON object per log entry. Every entry includes these fields:

| Field | Description |
|-------|-------------|
| `requestId` | API Gateway request id — correlates all logs for one invocation. |
| `route` | The matched route key (e.g., `GET /v1/health`). |
| `level` | `debug` (local only), `info`, `warn`, or `error`. |
| `statusCode` | The HTTP status the handler returned. |
| `durationMs` | Wall-clock duration of the invocation. |
| `timestamp` | ISO-8601 datetime of the log entry. |

```json
{
  "requestId": "a1b2c3d4",
  "route": "GET /v1/donations",
  "level": "info",
  "statusCode": 200,
  "durationMs": 42,
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**Never log PII** — no email addresses, names, or phone numbers, and never token values. Use `userId` (a Cognito UUID) as the only identity reference in logs.

---

## When to Use This Skill

- Scaffolding new Lambda handlers.
- Implementing repository functions with correct key builder usage.
- Reviewing CDK stack changes for IAM or DynamoDB anti-patterns.
- Configuring API Gateway routes and Cognito authorisers.

## Related

- `backend/src/domain/response.ts` — `successResponse` / `errorResponse` envelope helpers.
- `backend/src/domain/key-builders.ts` — `buildUserKey`, `buildDonationKey`, `buildPickupKey`, `buildReportKey`.
- `.kiro/steering/architecture.md` — single-table design and access patterns.
- `.kiro/steering/security.md` — Cognito validation, least-privilege IAM, and data privacy.
