# Design Document — Spec 1: Foundation

## Overview

This document describes the technical design for the NourishNet Foundation Spec. It covers the monorepo structure, TypeScript configuration, AWS infrastructure via CDK, DynamoDB single-table design, API skeleton, React frontend shell, testing infrastructure, and all Kiro IDE artifacts (steering files, hooks, agents, power).

The Foundation establishes the skeleton on which all product features (Specs 2–6) are built. No product-level features (donations, matching, pickup, impact, moderation) are implemented here — only the infrastructure and scaffolding that enables them.

---

## Architecture

### System Diagram

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

### Monorepo Directory Layout

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
│       ├── handlers/
│       │   └── health.ts         # GET /v1/health
│       ├── domain/
│       │   ├── errors.ts         # typed domain errors
│       │   ├── response.ts       # successResponse / errorResponse
│       │   └── impact-constants.ts
│       ├── repositories/
│       │   └── dynamo-client.ts  # DocumentClient singleton
│       └── validation/
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
│   ├── unit/
│   ├── integration/
│   └── properties/
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

### CDK Stack Environment Strategy

```
cdk deploy --context environment=dev
cdk deploy --context environment=prod
```

Resource names follow `<ResourceName>-<environment>`. All resources tagged `Project=NourishNet` and `Environment=<env>`. Deletion protection enabled on Cognito and DynamoDB for `prod` only.

### Backend Layer Architecture

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

### Authentication Flow

```
User submits sign-up form (email + password + role)
  │
  ▼
Frontend → Cognito signUp() with custom:role attribute
  │
  ▼
Cognito sends verification email
  │
User enters 6-digit code → Frontend → Cognito confirmSignUp()
  │
  ▼
Cognito post-confirmation trigger Lambda
  │  AdminAddUserToGroup(userPool, userId, groupName)
  ▼
User now in: Donors | Organizations | Volunteers

Sign-in:
Frontend → Cognito initiateAuth(USER_PASSWORD_AUTH)
  │
  ▼
Cognito returns { id_token, access_token, refresh_token }
  │
Frontend stores tokens in memory (module-scoped variables only)
  │
API calls include:  Authorization: Bearer <access_token>
  │
API Gateway Cognito Authorizer validates JWT → Lambda invoked
  │
Lambda reads role from: event.requestContext.authorizer.jwt.claims['cognito:groups']
```

---

## Components and Interfaces

### Component 1: CDK Stack (infra/lib/nourishnet-foundation-stack.ts)

**Props interface:**

```typescript
interface NourishNetFoundationStackProps extends StackProps {
  environment: 'dev' | 'staging' | 'prod';
}
```

**Constructs provisioned:**
1. `cognito.UserPool` — NourishNetUserPool-\<env\>
2. `cognito.UserPoolClient` — no client secret, USER_PASSWORD_AUTH + REFRESH_TOKEN_AUTH
3. `cognito.CfnUserPoolGroup` × 4 — Donors, Organizations, Volunteers, Admins
4. `dynamodb.Table` — NourishNetTable-\<env\> with GSI1, GSI2
5. `lambda.Function` (health-handler) — dedicated IAM role
6. `lambda.Function` (api-handler) — dedicated IAM role
7. `apigwv2.HttpApi` — NourishNetApi-\<env\> with Cognito authorizer
8. `apigwv2.HttpRoute` — GET /v1/health (no auth)
9. `logs.LogGroup` × 2 — 30-day retention per Lambda
10. `cloudwatch.Dashboard` — NourishNet-\<env\>
11. `cloudwatch.Alarm` — error rate > 5%
12. `amplify.App` — NourishNet-\<env\>

**CDK Outputs:**
- `ApiUrl` — API Gateway invoke URL
- `UserPoolId` — Cognito User Pool ID
- `UserPoolClientId` — Cognito client ID
- `AmplifyAppUrl` — frontend URL
- `TableName` — DynamoDB table name

### Component 2: Health Handler (backend/src/handlers/health.ts)

**Interface:**

```typescript
// Input: APIGatewayProxyEventV2 (no auth context, no body)
// Output: APIGatewayProxyResultV2

// 200 OK:
{ "data": { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" } }

// 503 Service Unavailable (DynamoDB unreachable):
{ "status": "degraded", "reason": "database_unreachable" }
```

The 503 response intentionally does not use the `{ data: ... }` envelope because it signals infrastructure failure rather than application-level error.

**Structured log output:**

```json
{
  "level": "info",
  "requestId": "<lambda-request-id>",
  "route": "GET /v1/health",
  "statusCode": 200,
  "durationMs": 45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Component 3: Response Envelope (backend/src/domain/response.ts)

**Exported functions:**

```typescript
function successResponse(data: unknown, statusCode?: number): APIGatewayProxyResultV2
function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIGatewayProxyResultV2
```

### Component 4: Authentication Context (frontend/src/auth/AuthContext.tsx)

**Context value interface:**

```typescript
interface AuthContextValue {
  user: CognitoUser | null;
  accessToken: string | null;
  role: 'Donor' | 'Organization' | 'Volunteer' | 'Admin' | null;
  isLoading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  signUp(email: string, password: string, role: UserRole): Promise<void>;
  confirmSignUp(email: string, code: string): Promise<void>;
  refreshSession(): Promise<boolean>;
}
```

### Component 5: API Client (frontend/src/api/client.ts)

**Axios instance configuration:**

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});
// Request interceptor: attach Bearer token
// Response interceptor: handle 401 with silent refresh
```

### Component 6: ProtectedRoute (frontend/src/components/ProtectedRoute.tsx)

```typescript
interface ProtectedRouteProps {
  requiredRole?: UserRole;  // if omitted, any authenticated user passes
  children: React.ReactNode;
}
// Renders <LoadingSpinner /> while isLoading
// Redirects to /sign-in (preserving intended URL in state) if unauthenticated
// Renders <ForbiddenPage /> if role does not match requiredRole
```

### Component 7: Kiro Power (powers/nourishnet-community-food/)

**plugin.json interface:**

```json
{
  "name": "NourishNet Community Food",
  "version": "0.1.0",
  "keywords": ["nourishnet", "food", "donation", "redistribution", "impact"],
  "skills": [...],
  "mcpServers": { "nourishnet-domain": { "configPath": "mcp.json" } }
}
```

**MCP tool signatures:**

```typescript
get_donation_by_id(id: string): DonationRecord | null
list_donations_by_status(status: string): DonationRecord[]
list_organizations(): OrganizationRecord[]
get_impact_summary(): ImpactSummary
```

---

## Data Models

### DynamoDB Single-Table Key Schema

**Table:** `NourishNetTable-<env>`  
**Primary key:** `PK` (String) / `SK` (String)  
**GSI1:** `GSI1PK` (String) / `GSI1SK` (String)  
**GSI2:** `GSI2PK` (String) / `GSI2SK` (String)

#### Entity Key Patterns

| Entity | PK | SK | GSI1PK | GSI1SK | GSI2PK | GSI2SK |
|--------|----|----|--------|--------|--------|--------|
| USER | `USER#<userId>` | `METADATA` | `ROLE#<role>` | `USER#<userId>` | — | — |
| DONATION | `DONATION#<donationId>` | `METADATA` | `STATUS#<status>` | `DONATION#<donationId>` | `DONOR#<donorId>` | `DONATION#<donationId>` |
| PICKUP | `PICKUP#<pickupId>` | `METADATA` | `DONATION#<donationId>` | `PICKUP#<pickupId>` | `VOLUNTEER#<volunteerId>` | `PICKUP#<pickupId>` |
| REPORT | `REPORT#<reportId>` | `METADATA` | `ORG#<orgId>` | `REPORT#<reportId>` | — | — |

#### Access Patterns

| # | Entity | Query | Index Used |
|---|--------|-------|-----------|
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

### TypeScript Types (Foundation)

```typescript
// backend/src/domain/types.ts

export type UserRole = 'Donor' | 'Organization' | 'Volunteer' | 'Admin';

export type FoodCategory =
  | 'produce' | 'bakery' | 'dairy' | 'prepared'
  | 'dry_goods' | 'frozen' | 'beverages' | 'other';

export type DonationStatus =
  | 'draft' | 'available' | 'claimed' | 'in_transit'
  | 'completed' | 'cancelled' | 'expired';

export interface UserRecord {
  PK: string;        // USER#<userId>
  SK: 'METADATA';
  GSI1PK: string;    // ROLE#<role>
  GSI1SK: string;    // USER#<userId>
  userId: string;
  email: string;
  role: UserRole;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
```

### Impact Constants

```typescript
// backend/src/domain/impact-constants.ts
export const MEALS_PER_KG = 2.5 as const;           // WRAP UK
export const CARBON_PER_KG_FOOD_WASTE = 2.5 as const; // WRAP UK / IPCC
```

### Frontend Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | API Gateway base URL | `https://abc123.execute-api.eu-west-1.amazonaws.com` |
| `VITE_USER_POOL_ID` | Cognito User Pool ID | `eu-west-1_XYZ` |
| `VITE_USER_POOL_CLIENT_ID` | Cognito client ID | `abc123def456` |
| `VITE_ENVIRONMENT` | Environment label | `dev` |

These are injected at build time via `.env.local` (not committed) and exposed via Amplify environment variables for production builds.

---

## Error Handling

### Lambda Handler Pattern

Every Lambda handler wraps its entire body in a top-level try/catch:

```typescript
export const handler = async (event): Promise<APIGatewayProxyResultV2> => {
  const start = Date.now();
  try {
    // 1. Parse and validate input
    // 2. Call domain functions
    // 3. Call repository
    // 4. Return successResponse(result)
  } catch (error) {
    logger.error({ error, requestId: event.requestContext.requestId }, 'Handler error');
    if (error instanceof ValidationError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message);
    }
    if (error instanceof NotFoundError) {
      return errorResponse(404, 'NOT_FOUND', error.message);
    }
    if (error instanceof AuthorizationError) {
      return errorResponse(403, 'FORBIDDEN', error.message);
    }
    if (error instanceof ConflictError) {
      return errorResponse(409, 'CONFLICT', error.message);
    }
    // Never expose stack traces to clients
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
};
```

### API Error Response Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { "field": "email", "issue": "Invalid email format" }
  }
}
```

Error codes are `SCREAMING_SNAKE_CASE` strings. Internal error messages are never returned to clients.

### Frontend Error Handling

- API 400: display field-level validation errors from `error.details`
- API 401: silently refresh token; if refresh fails, redirect to `/sign-in`
- API 403: navigate to `/forbidden`
- API 404: display inline "not found" message
- API 500: display generic error banner, log to console in dev

---

## Correctness Properties

These invariants are validated by property-based tests in `tests/properties/`:

### Property 1: Response Envelope Round-Trip

**Validates: Requirements 18, 23**

For all JSON-serialisable values `data`:
```
JSON.parse(successResponse(data).body).data === data
```

For all valid `code` (SCREAMING_SNAKE_CASE) and `message` strings:
```
JSON.parse(errorResponse(400, code, message).body).error.code === code
JSON.parse(errorResponse(400, code, message).body).error.message === message
```

### Property 2: Impact Calculation Non-Negativity

**Validates: Requirements 23**

For all `weightKg >= 0`:
```
weightKg * MEALS_PER_KG >= 0
weightKg * CARBON_PER_KG_FOOD_WASTE >= 0
```

### Property 3: DynamoDB Key Builder Consistency

**Validates: Requirements 11, 12**

For all valid UUIDs `id`:
```
buildUserKey(id).PK === 'USER#' + id
buildDonationKey(id).PK === 'DONATION#' + id
// No key builder returns undefined or null fields
```

### Property 4: Impact Constant Determinism

**Validates: Requirements 23**

For all `weightKg`:
```
calculateMeals(weightKg) === calculateMeals(weightKg)  // same input, same output
```

---

## Testing Strategy

### Unit Tests (`tests/unit/`)

Target: individual pure functions in `backend/src/domain/` and `backend/src/validation/`.

Priority targets for Foundation:
- `response.ts` — `successResponse` and `errorResponse` shape, status codes
- `errors.ts` — error class names, instanceof checks
- `impact-constants.ts` — constant values match documented sources

### Property-Based Tests (`tests/properties/`)

Target: pure domain functions with meaningful input variance.

Foundation property test: `api-response-envelope.property.test.ts`
- Round-trip property for `successResponse` across arbitrary JSON values
- Round-trip property for `errorResponse` across arbitrary code + message strings

### Integration Tests (`tests/integration/`)

Target: Lambda handlers wired up with real (or local) AWS resources.

Foundation integration test: `health-handler.integration.test.ts`
- `GET /v1/health` returns 200 with correct body shape when DynamoDB is reachable
- Requires environment variables set (`TABLE_NAME`)

### Frontend Tests

Target: `ProtectedRoute`, `RoleGuard`, `AuthProvider` — behaviour under loading, authenticated, and unauthenticated states.

Tools: Vitest + React Testing Library (added to `frontend/` workspace).

### Coverage Thresholds

Applied to `backend/src/domain/**` and `backend/src/validation/**`:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

Coverage is NOT enforced on `infra/` (CDK synthesised code) or `frontend/` (UI-heavy, verified via integration).
