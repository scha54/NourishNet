# NourishNet — Architecture

NourishNet is a serverless food-redistribution platform that connects surplus-food donors with
verified community organisations and volunteers. This document describes the system architecture,
the monorepo structure and its layer-separation rules, and the DynamoDB single-table design that
backs every entity and access pattern in the platform.

## System Architecture Diagram

The platform is a single-page React application served by AWS Amplify Hosting, talking to an
Amazon API Gateway HTTP API that is protected by a Cognito JWT authorizer. API Gateway invokes
AWS Lambda functions, which read and write a single DynamoDB table and emit structured logs and
metrics to Amazon CloudWatch. Amazon Cognito provides user authentication for both the frontend
(sign-up, sign-in, token refresh) and API Gateway (JWT authorizer for all protected routes).

```
Internet
  │
  ▼
AWS Amplify Hosting
  │  (serves React SPA, HTTPS enforced, SPA rewrite rule)
  ▼
React Frontend (Vite + TypeScript)
  │  BrowserRouter | QueryClientProvider | AuthProvider
  │  API client injects Bearer token from memory
  │
  │  HTTPS → Authorization: Bearer <access_token>
  ▼
Amazon API Gateway (HTTP API)
  │  Cognito JWT Authorizer on all routes except /v1/health
  │  CORS: frontend origin, Authorization + Content-Type headers
  │  All routes prefixed /v1/
  │
  ├──→ GET /v1/health  (no auth) → health-handler Lambda
  └──→ (future /v1/* routes, Specs 2–6) → api-handler Lambda
  │
  ▼
AWS Lambda (Node.js 20.x, 10s timeout, 256 MB)
  │  handlers/ → validation/ → domain/ → repositories/
  ▼
Amazon DynamoDB (NourishNetTable-<env>)
  │  Single table, PK/SK, GSI1, GSI2
  │  On-demand billing, PITR, Streams
  │
  └──→ Amazon CloudWatch
         Structured JSON logs, Dashboard, Alarm (error rate > 5%)

Amazon Cognito User Pool (NourishNetUserPool-<env>)
  ├──→ Frontend: sign-up, sign-in, token refresh
  └──→ API Gateway: JWT authorizer for all protected routes
```

## Monorepo Structure

NourishNet is organised as an npm-workspaces monorepo with a single lockfile and a shared
`tsconfig.base.json`. The three deployable workspaces (`frontend/`, `backend/`, `infra/`) are
kept independent, with cross-cutting concerns documented in `docs/` and automated via `.kiro/`.

```
NourishNet/
├── package.json              # npm workspaces root
├── package-lock.json         # single lockfile
├── tsconfig.base.json        # shared TS compiler options
├── vitest.config.ts          # root test runner config
├── .gitignore
├── AGENTS.md
├── README.md
│
├── frontend/                 # workspace: React SPA
│   ├── package.json
│   ├── tsconfig.json         # extends tsconfig.base.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── api/client.ts         # Axios client with Bearer injection
│       ├── auth/
│       │   ├── AuthContext.tsx
│       │   ├── AuthProvider.tsx
│       │   ├── useCurrentUser.ts
│       │   └── useSignOut.ts
│       ├── components/
│       │   ├── ProtectedRoute.tsx
│       │   ├── RoleGuard.tsx
│       │   └── LoadingSpinner.tsx
│       └── pages/
│           ├── HomePage.tsx
│           ├── SignInPage.tsx
│           ├── SignUpPage.tsx
│           ├── VerifyEmailPage.tsx
│           ├── DashboardPage.tsx
│           ├── ForbiddenPage.tsx
│           └── NotFoundPage.tsx
│
├── backend/                  # workspace: Lambda handlers
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── handlers/             # Lambda entry points (one file per route)
│       │   └── health.ts         # GET /v1/health
│       ├── domain/               # Pure business logic (no AWS SDK imports)
│       │   ├── errors.ts         # typed domain errors
│       │   ├── response.ts       # successResponse / errorResponse
│       │   └── impact-constants.ts
│       ├── repositories/         # DynamoDB access via DocumentClient
│       │   └── dynamo-client.ts  # DocumentClient singleton
│       └── validation/           # Zod schemas for request/response validation
│           └── common.ts         # shared Zod schemas
│
├── infra/                    # workspace: AWS CDK
│   ├── package.json
│   ├── tsconfig.json
│   ├── cdk.json
│   ├── bin/app.ts
│   └── lib/
│       └── nourishnet-foundation-stack.ts
│
├── tests/
│   ├── unit/                 # Vitest unit tests
│   ├── integration/          # Tests against real or local AWS resources
│   └── properties/           # fast-check property-based tests
│       └── api-response-envelope.property.test.ts
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── impact-model.md
│   ├── deployment.md
│   └── evidence/
│       └── kiro-aws-connection.md
│
├── scripts/
│   ├── seed-data.ts
│   ├── verify-deployment.ts
│   └── verify-aws-connection.ps1
│
└── .kiro/
    ├── steering/             # 6 steering files
    ├── specs/                # 6 spec directories
    ├── hooks/                # 4 hook definitions
    └── agents/               # 4 agent definitions

powers/
└── nourishnet-community-food/
    ├── plugin.json
    ├── mcp.json
    ├── POWER.md
    └── skills/
        ├── food-donation-domain/SKILL.md
        ├── impact-metrics/SKILL.md
        └── serverless-patterns/SKILL.md
```

### Backend Layer Architecture

The backend is organised into four strictly separated layers. A request flows top-to-bottom:
the handler reads the event, validation enforces the request shape, domain executes pure business
logic, and the repository performs DynamoDB operations.

```
Handler (handlers/*.ts)
  │  Reads event, validates, calls domain, calls repository
  ▼
Validation (validation/*.ts)
  │  Zod schemas with .strict(), explicit bounds
  ▼
Domain (domain/*.ts)
  │  Pure TypeScript — ZERO AWS SDK, ZERO I/O
  │  Business rules, calculations, state machines
  ▼
Repository (repositories/*.ts)
  │  DynamoDB DocumentClient operations
  │  Constructs all PK/SK values — never exposes raw keys to callers
```

### Layer Separation Rules

These rules are enforced to keep the domain layer pure and testable and to prevent architectural
drift:

- `handlers/` **MUST NOT** import from `repositories/` directly — dependencies are provided via
  dependency injection so handlers remain testable and loosely coupled.
- `domain/` **MUST NOT** import the AWS SDK, Zod, or any I/O library — this layer stays pure
  TypeScript (business rules, calculations, state machines) with zero I/O, making it the primary
  target for unit and property-based tests.
- `repositories/` **MUST NOT** contain business logic — only DynamoDB operations. Repositories
  construct all `PK`/`SK` values and never expose raw keys to callers.
- `validation/` schemas are shared between `handlers/` (request validation) and `repositories/`
  (write validation), providing a single source of truth for entity shapes.

## DynamoDB Single-Table Design

NourishNet uses a **single-table design**: every entity (USER, DONATION, PICKUP, REPORT) lives in
one DynamoDB table, differentiated by composite `PK`/`SK` key prefixes. This philosophy minimises
round-trips, lets related items be fetched in a single query, and keeps the access-pattern surface
explicit and bounded. All access is driven by the documented access patterns below —
**scan operations are forbidden**. New access patterns must be covered by an existing GSI before
any new index is added.

**Table name:** `NourishNetTable-<environment>`
**Primary key:** `PK` (String) / `SK` (String)
**GSI1:** `GSI1PK` (String) / `GSI1SK` (String)
**GSI2:** `GSI2PK` (String) / `GSI2SK` (String)

### Entity Key Patterns

Each entity is a single `METADATA` item keyed by its own ID on the primary key, with GSI
projections that enable the listing access patterns. A dash (`—`) indicates the entity does not
populate that index.

| Entity | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|--------|----|----|--------|--------|--------|--------|
| USER | `USER#<userId>` | `METADATA` | `ROLE#<role>` | `USER#<userId>` | — | — |
| DONATION | `DONATION#<donationId>` | `METADATA` | `STATUS#<status>` | `DONATION#<donationId>` | `DONOR#<donorId>` | `DONATION#<donationId>` |
| PICKUP | `PICKUP#<pickupId>` | `METADATA` | `DONATION#<donationId>` | `PICKUP#<pickupId>` | `VOLUNTEER#<volunteerId>` | `PICKUP#<pickupId>` |
| REPORT | `REPORT#<reportId>` | `METADATA` | `ORG#<orgId>` | `REPORT#<reportId>` | — | — |

### Access Patterns

Every read is served by the primary key, GSI1, or GSI2 — there are no table scans. The ten
foundation access patterns are:

| # | Entity | Query | Index Used |
|---|--------|-------|------------|
| AP-1 | USER | Fetch user by userId | PK=`USER#<id>`, SK=`METADATA` |
| AP-2 | USER | List users by role | GSI1: `ROLE#<role>` |
| AP-3 | DONATION | Fetch donation by ID | PK=`DONATION#<id>`, SK=`METADATA` |
| AP-4 | DONATION | List donations by status | GSI1: `STATUS#<status>` |
| AP-5 | DONATION | List donations by donor | GSI2: `DONOR#<donorId>` |
| AP-6 | PICKUP | Fetch pickup by ID | PK=`PICKUP#<id>`, SK=`METADATA` |
| AP-7 | PICKUP | List pickups for a donation | GSI1: `DONATION#<donationId>` |
| AP-8 | PICKUP | List pickups by volunteer | GSI2: `VOLUNTEER#<volunteerId>` |
| AP-9 | REPORT | Fetch report by ID | PK=`REPORT#<id>`, SK=`METADATA` |
| AP-10 | REPORT | List reports by organization | GSI1: `ORG#<orgId>` |

## API Versioning Convention

- All API routes are prefixed with `/v1/`.
- Breaking changes require a new version prefix (`/v2/`).
- Non-breaking additive changes are made within the existing version.
- The health endpoint is at `GET /v1/health` and is unauthenticated.

## API Response Envelope

All API responses use a consistent envelope so clients can handle success and error cases
uniformly:

```typescript
// Success (2xx)
{ "data": <payload> }

// Error (4xx / 5xx)
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details"?: {} } }
```

Error codes are `SCREAMING_SNAKE_CASE` strings. Internal error messages and stack traces are never
returned to clients. Handlers build these envelopes through the shared helpers
`successResponse(data, statusCode?)` and
`errorResponse(statusCode, code, message, details?)` in `backend/src/domain/response.ts`.
