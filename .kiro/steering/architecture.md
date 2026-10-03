---
inclusion: always
---

# NourishNet — Architecture Steering

## System Architecture Overview

```
Internet
  │
  ▼
AWS Amplify Hosting  ──────────────  React Frontend (SPA)
  │                                        │
  │                                        │  HTTPS API calls
  │                                        ▼
  │                               Amazon API Gateway (HTTP API)
  │                                        │
  │                                        │  Cognito JWT authoriser
  │                                        ▼
  │                               AWS Lambda (Node.js 20.x)
  │                                        │
  │                               ┌────────┴────────┐
  │                               ▼                 ▼
  │                         DynamoDB          CloudWatch Logs
  │
  └──  User auth ──►  Amazon Cognito User Pool
```

## Monorepo Structure

```
/
├── frontend/          # React + TypeScript + Vite SPA
│   └── src/
├── backend/           # TypeScript Lambda handlers
│   └── src/
│       ├── handlers/      # Lambda entry points (one file per route)
│       ├── domain/        # Pure business logic (no AWS SDK imports)
│       ├── repositories/  # DynamoDB access via DocumentClient
│       └── validation/    # Zod schemas for request/response validation
├── infra/             # AWS CDK TypeScript stacks
│   └── lib/
├── tests/
│   ├── unit/          # Jest/Vitest unit tests
│   ├── integration/   # Tests against real or local AWS resources
│   └── properties/    # fast-check property-based tests
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── impact-model.md
│   ├── deployment.md
│   └── evidence.md
├── scripts/           # Build, seed, and deploy helper scripts
├── .kiro/             # Kiro specs, steering, hooks, agents
├── powers/            # Kiro power definitions
└── AGENTS.md
```

## DynamoDB Single-Table Design

NourishNet uses a **single-table design**: every entity (USER, DONATION, PICKUP, REPORT) lives in one DynamoDB table, differentiated by composite `PK`/`SK` key prefixes. This philosophy minimises round-trips, lets related items be fetched in a single query, and keeps the access-pattern surface explicit and bounded. All access is driven by the documented access patterns below — **scan operations are forbidden**. New access patterns must be covered by an existing GSI before any new index is added.

**Table name:** `NourishNetTable-<environment>`
**Primary key:** `PK` (String) / `SK` (String)
**GSI1:** `GSI1PK` / `GSI1SK`
**GSI2:** `GSI2PK` / `GSI2SK`

### Entity Key Patterns

| Entity | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|--------|----|----|--------|--------|--------|--------|
| USER | `USER#<userId>` | `METADATA` | `ROLE#<role>` | `USER#<userId>` | — | — |
| DONATION | `DONATION#<donationId>` | `METADATA` | `STATUS#<status>` | `DONATION#<donationId>` | `DONOR#<donorId>` | `DONATION#<donationId>` |
| PICKUP | `PICKUP#<pickupId>` | `METADATA` | `DONATION#<donationId>` | `PICKUP#<pickupId>` | `VOLUNTEER#<volunteerId>` | `PICKUP#<pickupId>` |
| REPORT | `REPORT#<reportId>` | `METADATA` | `ORG#<orgId>` | `REPORT#<reportId>` | — | — |

### Access Patterns

| # | Entity | Query | Index Used |
|---|--------|-------|------------|
| AP-1 | USER | Fetch user by userId | PK=`USER#<userId>`, SK=`METADATA` |
| AP-2 | USER | List all users by role | GSI1: GSI1PK=`ROLE#<role>` |
| AP-3 | DONATION | Fetch donation by donationId | PK=`DONATION#<donationId>`, SK=`METADATA` |
| AP-4 | DONATION | List donations by status | GSI1: GSI1PK=`STATUS#<status>` |
| AP-5 | DONATION | List donations by donor | GSI2: GSI2PK=`DONOR#<donorId>` |
| AP-6 | PICKUP | Fetch pickup by pickupId | PK=`PICKUP#<pickupId>`, SK=`METADATA` |
| AP-7 | PICKUP | List pickups by donation | GSI1: GSI1PK=`DONATION#<donationId>` |
| AP-8 | PICKUP | List pickups by volunteer | GSI2: GSI2PK=`VOLUNTEER#<volunteerId>` |
| AP-9 | REPORT | Fetch report by reportId | PK=`REPORT#<reportId>`, SK=`METADATA` |
| AP-10 | REPORT | List reports by organization | GSI1: GSI1PK=`ORG#<orgId>` |

## API Versioning Convention

- All API routes are prefixed with `/v1/`
- Breaking changes require a new version prefix (`/v2/`)
- Non-breaking additive changes are made within the existing version
- The health endpoint is at `GET /v1/health` and is unauthenticated

## API Response Envelope

All API responses use a consistent envelope:

```typescript
// Success
{ "data": <payload> }

// Error
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details"?: {} } }
```

## Layer Separation Rules

- `handlers/` MUST NOT import from `repositories/` directly — use dependency injection
- `domain/` MUST NOT import the AWS SDK, Zod, or any I/O library
- `repositories/` MUST NOT contain business logic — only DynamoDB operations
- `validation/` schemas are shared between `handlers/` (request validation) and `repositories/` (write validation)

## CDK Stack Environments

Environments: `dev` | `staging` | `prod`

Resource names follow the pattern: `<ResourceName>-<environment>` (e.g., `NourishNetTable-dev`).
All resources are tagged with `Project=NourishNet` and `Environment=<environment>`.
