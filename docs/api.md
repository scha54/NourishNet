# NourishNet — API Reference

This document is the reference for the NourishNet HTTP API. It describes the API versioning
convention, the shared response envelope that every endpoint uses, the standard error codes, and
the endpoints available in the foundation release.

## Base URL and Versioning

All routes are served by an Amazon API Gateway HTTP API and are prefixed with `/v1/`:

```
https://<api-id>.execute-api.<region>.amazonaws.com/v1
```

- Breaking changes are introduced under a new version prefix (`/v2/`).
- Non-breaking additive changes are made within the existing version.
- All traffic is HTTPS only.

## Authentication

Every route except `GET /v1/health` is protected by the API Gateway Cognito JWT authorizer.
Authenticated requests must send a Cognito-issued access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

The health endpoint is intentionally **unauthenticated** so that load balancers and monitoring
tools can verify the API is reachable without credentials.

## Response Envelope

All API responses use a consistent envelope so clients can handle success and error cases
uniformly. The envelope is produced by the shared helpers `successResponse(data, statusCode?)` and
`errorResponse(statusCode, code, message, details?)` in `backend/src/domain/response.ts`.

### Success Shape

Successful (2xx) responses wrap the payload in a top-level `data` field:

```json
{
  "data": <payload>
}
```

The `payload` may be any JSON-serialisable value (object, array, string, number, boolean, or
`null`), depending on the endpoint.

### Error Shape

Error (4xx / 5xx) responses wrap the failure in a top-level `error` object:

```json
{
  "error": {
    "code": "SCREAMING_SNAKE_CASE",
    "message": "Human-readable string",
    "details": {}
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | A stable, machine-readable `SCREAMING_SNAKE_CASE` identifier for the error class. |
| `message` | string | Yes | A human-readable description of the error. |
| `details` | object | No | Optional structured context (for example, which fields failed validation). Omitted for 5xx responses. |

### Standard Error Codes

| Code | HTTP Status | When it is returned |
|------|-------------|---------------------|
| `VALIDATION_ERROR` | 400 | The request body or parameters failed schema validation. `details` may describe the offending fields. |
| `FORBIDDEN` | 403 | The caller is authenticated but not permitted to perform the action. |
| `NOT_FOUND` | 404 | The requested resource does not exist. |
| `CONFLICT` | 409 | The request conflicts with the current state of the resource. |
| `INTERNAL_ERROR` | 500 | An unexpected internal error occurred. |

`INTERNAL_ERROR` responses never expose internal stack traces or implementation details. They
always return a generic message (`"An unexpected error occurred"`) and never include a `details`
object, regardless of the underlying cause.

**Example — validation error (400):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body failed validation",
    "details": {
      "weightKg": "Expected a positive number"
    }
  }
}
```

**Example — internal error (500):**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Endpoints

### `GET /v1/health`

Returns the current health status of the API. This endpoint is used by load balancers and
monitoring tools to verify that the API is reachable and that its dependencies are healthy.

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/v1/health` |
| Authentication | None (unauthenticated) |
| Success status | `200 OK` |
| Degraded status | `503 Service Unavailable` |

#### 200 — Healthy

When the API and its dependencies are reachable, the endpoint returns `200 OK` with the standard
success envelope. The payload contains the status and the server timestamp:

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2025-01-15T09:30:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data.status` | string | `"ok"` when the API is healthy. |
| `data.timestamp` | string | The server time as an ISO-8601 datetime. |

#### 503 — Degraded

When a critical dependency such as the database is unreachable, the endpoint returns
`503 Service Unavailable`. This response **intentionally does not use the `data` envelope** — it
signals an infrastructure failure rather than a normal application payload, so monitoring tools can
treat it distinctly:

```json
{
  "status": "degraded",
  "reason": "database_unreachable"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"degraded"` when a critical dependency is unavailable. |
| `reason` | string | A machine-readable reason, for example `"database_unreachable"`. |

#### curl Example

```bash
curl -i https://<api-id>.execute-api.<region>.amazonaws.com/v1/health
```

Healthy response:

```
HTTP/2 200
content-type: application/json

{"data":{"status":"ok","timestamp":"2025-01-15T09:30:00.000Z"}}
```

Degraded response:

```
HTTP/2 503
content-type: application/json

{"status":"degraded","reason":"database_unreachable"}
```
