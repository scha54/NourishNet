# Implementation Plan: NourishNet Foundation

## Overview

This plan implements Spec 1 — Foundation for NourishNet. It establishes the monorepo structure, TypeScript configuration, AWS CDK infrastructure (Cognito, DynamoDB, API Gateway, Lambda, Amplify, CloudWatch), a React frontend shell with authentication, property-based and unit testing infrastructure, and all Kiro IDE artifacts (steering files, hooks, agents, power). No product features are implemented here — only the scaffolding that Specs 2–6 build upon.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5"] },
    { "id": 5, "tasks": ["4.1", "5.1", "10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4", "5.2", "5.3", "11.1", "11.2", "11.3", "11.4"] },
    { "id": 7, "tasks": ["5.4", "5.5", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 8, "tasks": ["5.6", "6.1", "13.1", "13.2", "13.3", "13.4"] },
    { "id": 9, "tasks": ["5.7", "6.2", "8.1", "8.2", "14.1", "14.2"] },
    { "id": 10, "tasks": ["8.3", "8.4", "8.5", "15.1", "15.2", "15.3", "15.4"] },
    { "id": 11, "tasks": ["8.6", "16.2"] },
    { "id": 12, "tasks": ["8.7", "9.1", "9.2", "9.3", "16.1"] },
    { "id": 13, "tasks": ["7", "17"] }
  ]
}
```

---

## Tasks

- [x] 1. Repository scaffolding and root configuration
  - [x] 1.1 Create root `package.json` with npm workspaces
    - Declare workspaces: `["frontend", "backend", "infra"]`
    - Add root scripts: `test`, `test:coverage`, `build`, `typecheck`, `lint`
    - _Requirements: 1.2, 1.4_

  - [x] 1.2 Create workspace `package.json` files
    - `frontend/package.json`: deps `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `axios`, `amazon-cognito-identity-js`; devDeps `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`
    - `backend/package.json`: deps `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `zod`; devDeps `typescript`, `@types/aws-lambda`
    - `infra/package.json`: deps `aws-cdk-lib`, `constructs`; devDeps `typescript`, `aws-cdk`
    - Pin all dependency versions (no `^` or `~` on production deps per security steering)
    - _Requirements: 1.6, 1.7, 1.8_

  - [x] 1.3 Create directory structure
    - Top-level: `frontend/src/`, `backend/src/handlers/`, `backend/src/domain/`, `backend/src/repositories/`, `backend/src/validation/`, `infra/lib/`, `infra/bin/`, `tests/unit/`, `tests/integration/`, `tests/properties/`, `docs/`, `scripts/`
    - `docs/` placeholder files: `architecture.md`, `api.md`, `impact-model.md`, `deployment.md`, `evidence/kiro-aws-connection.md`
    - _Requirements: 1.1, 1.9, 1.10_

  - [x] 1.4 Create root `.gitignore`
    - Exclude `node_modules/`, `dist/`, `.env*`, `cdk.out/`, `coverage/`, `*.js.map`
    - _Requirements: 1.5_

- [x] 2. TypeScript configuration
  - [x] 2.1 Create `tsconfig.base.json`
    - Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`
    - Set `target: "ES2022"`, `module: "NodeNext"`
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Create workspace `tsconfig.json` files
    - `frontend/tsconfig.json`: extends base, adds `moduleResolution: "bundler"`, `lib: ["ES2022","DOM","DOM.Iterable"]`, `jsx: "react-jsx"`, `outDir: "dist"`, `rootDir: "src"`
    - `backend/tsconfig.json`: extends base, `moduleResolution: "NodeNext"`, `paths` aliases `@domain/*`, `@repositories/*`, `@validation/*`, `outDir: "dist"`, `rootDir: "src"`
    - `infra/tsconfig.json`: extends base, `moduleResolution: "NodeNext"`, `outDir: "cdk.out"`, `rootDir: "."`
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. Backend domain primitives
  - [x] 3.1 Create typed domain error classes
    - File: `backend/src/domain/errors.ts`
    - Export `ValidationError`, `NotFoundError`, `AuthorizationError`, `ConflictError` — each extends `Error` with explicit `name` assignment and explicit return type on constructor
    - _Requirements: 18.3, 18.4, 18.5_

  - [x] 3.2 Create response envelope helpers
    - File: `backend/src/domain/response.ts`
    - Export `successResponse(data: unknown, statusCode?: number): APIGatewayProxyResultV2` — wraps payload in `{ data }`, sets `Content-Type: application/json`
    - Export `errorResponse(statusCode: number, code: string, message: string, details?: Record<string, unknown>): APIGatewayProxyResultV2` — wraps in `{ error: { code, message, details? } }`
    - Never expose stack traces; `INTERNAL_ERROR` returns only a generic message
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 3.3 Create domain types and impact constants
    - File: `backend/src/domain/types.ts`: export `UserRole`, `FoodCategory`, `DonationStatus` union types; `UserRecord` interface with all PK/SK/GSI key fields and ISO-8601 timestamps
    - File: `backend/src/domain/impact-constants.ts`: export `MEALS_PER_KG = 2.5 as const` and `CARBON_PER_KG_FOOD_WASTE = 2.5 as const` with WRAP UK source comments
    - _Requirements: 18.1_

  - [x] 3.4 Create DynamoDB client singleton and key builders
    - File: `backend/src/repositories/dynamo-client.ts`: export singleton `DynamoDBDocumentClient` initialised from `process.env.TABLE_NAME`; never log credentials
    - File: `backend/src/domain/key-builders.ts`: export `buildUserKey(userId: string)`, `buildDonationKey(donationId: string)`, `buildPickupKey(pickupId: string)`, `buildReportKey(reportId: string)` — each returns a complete key object per the entity key table in the design; never accept raw user input, only validated UUIDs
    - _Requirements: 11.1, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 3.5 Create shared Zod validation schemas
    - File: `backend/src/validation/common.ts`
    - Export `uuidSchema` (`z.string().uuid()`), `isoDateSchema`, `nonEmptyStringSchema` with explicit `.min(1).max(...)` bounds
    - All schemas use `.strict()` to reject unknown properties per security steering
    - _Requirements: 18.3_

- [x] 4. Testing infrastructure
  - [x] 4.1 Install testing dependencies and create Vitest config
    - Add `vitest`, `@vitest/coverage-v8`, `fast-check` as root devDependencies
    - Create `vitest.config.ts` at the root: discover `**/*.{test,spec}.{ts,tsx}` and `**/*.property.test.ts`, exclude `node_modules/`, `dist/`, `cdk.out/`; configure `coverage` with provider `v8`, include paths `backend/src/domain/**` and `backend/src/validation/**`, thresholds statements 80%, branches 75%, functions 80%, lines 80%
    - Add `"test": "vitest"` and `"test:coverage": "vitest run --coverage"` to root `package.json` scripts
    - _Requirements: 22.1, 22.2, 22.3, 22.5_

  - [x] 4.2 Write property tests for response envelope (Property 1)
    - File: `tests/properties/api-response-envelope.property.test.ts`
    - **Property 1a: Success envelope round-trip** — for all `fc.jsonValue()` inputs, `JSON.parse(successResponse(data).body).data` deep-equals `data`
    - **Property 1b: Error envelope round-trip** — for all SCREAMING_SNAKE_CASE `code` strings and non-empty `message` strings, parsed body has `error.code === code` and `error.message === message` with no `data` field
    - Use `fc.assert` with at least 100 runs (fast-check default); name each property with a human-readable description
    - _Requirements: 22.4, 23.1, 23.2, 23.3, 23.4_

  - [x] 4.3 Write property tests for DynamoDB key builders (Property 3)
    - File: `tests/properties/key-builders.property.test.ts`
    - **Property 3: Key builder consistency** — for all `fc.uuid()` inputs, `buildUserKey(id).PK === 'USER#' + id`, `buildDonationKey(id).PK === 'DONATION#' + id`, etc.; no builder returns `undefined` or `null` in any field
    - _Requirements: 11.1, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 4.4 Write property tests for impact constants (Properties 2 and 4)
    - File: `tests/properties/impact-constants.property.test.ts`
    - **Property 2: Non-negativity** — for all `fc.float({ min: 0, max: 10_000, noNaN: true, noDefaultInfinity: true })`, `weightKg * MEALS_PER_KG >= 0` and `weightKg * CARBON_PER_KG_FOOD_WASTE >= 0`
    - **Property 4: Determinism** — same input always yields same output (referential transparency of constants)
    - _Requirements: 23.2_

- [x] 5. CDK foundation stack
  - [x] 5.1 Create CDK entry point and config
    - File: `infra/bin/app.ts`: read `environment` from `app.node.tryGetContext('environment') ?? 'dev'`; instantiate `NourishNetFoundationStack`; tag app with `Project=NourishNet`
    - File: `infra/cdk.json`: set `app: "npx ts-node bin/app.ts"`
    - _Requirements: 9.1, 9.2_

  - [x] 5.2 Implement Cognito User Pool and client
    - In `infra/lib/nourishnet-foundation-stack.ts`:
    - `UserPool` named `NourishNetUserPool-<env>`, email sign-in alias, auto-verified email, minimum password 12 chars + uppercase + lowercase + digit + symbol
    - `UserPoolClient` with `USER_PASSWORD_AUTH` + `REFRESH_TOKEN_AUTH`, no client secret, access token validity 60 min, refresh token validity 30 days
    - Four `CfnUserPoolGroup` constructs: `Donors`, `Organizations`, `Volunteers`, `Admins`
    - Deletion protection when `environment === 'prod'`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 5.3 Implement DynamoDB table with GSIs
    - In the same CDK stack:
    - `Table` named `NourishNetTable-<env>`, PK `PK` (String) / SK `SK` (String), `PAY_PER_REQUEST`, PITR enabled, Streams `NEW_AND_OLD_IMAGES`
    - GSI1: `GSI1PK` / `GSI1SK`; GSI2: `GSI2PK` / `GSI2SK` — both on-demand
    - Deletion protection when `environment === 'prod'`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 5.4 Implement API Gateway with Cognito authorizer
    - `HttpApi` named `NourishNetApi-<env>`, `$default` stage with auto-deploy
    - Cognito JWT authorizer referencing `NourishNetUserPool-<env>`
    - CORS: allow frontend origin, headers `Authorization` and `Content-Type`, methods `GET POST PUT DELETE OPTIONS`
    - All routes prefixed `/v1/`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 5.5 Implement Lambda functions and routes
    - `health-handler` Lambda: `nodejs20.x`, 10s timeout, 256 MB, dedicated IAM role with `dynamodb:DescribeTable` on the specific table ARN only; env vars `TABLE_NAME`, `ENVIRONMENT`; 30-day `LogGroup`
    - `api-handler` Lambda (placeholder): same runtime/timeout/memory; dedicated IAM role with `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:Query` on table ARN + GSI ARNs only (no wildcard resources); env vars `TABLE_NAME`, `USER_POOL_ID`, `ENVIRONMENT`; 30-day `LogGroup`
    - Route `GET /v1/health` → health-handler with `authorizationType: NONE`
    - Route `ANY /v1/{proxy+}` → api-handler with Cognito authorizer
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.6, 17.1_

  - [x] 5.6 Implement CloudWatch dashboard, alarm, and Amplify Hosting
    - `Dashboard` named `NourishNet-<env>`: Lambda invocation count, error rate, and p99 duration widgets for both functions
    - `Alarm`: error rate > 5% over 5-minute evaluation period; when `environment === 'prod'`, connect to SNS topic
    - `App` (Amplify): named `NourishNet-<env>`; SPA rewrite rule `/* → /index.html`; enforce HTTPS; redirect HTTP → HTTPS
    - Tag all constructs with `Project=NourishNet` and `Environment=<env>`
    - `CfnOutput` for `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `TableName`, `AmplifyAppUrl`
    - _Requirements: 9.4, 15.1, 15.2, 15.3, 15.4, 16.2, 16.3, 16.4_

  - [x] 5.7 Verify CDK synthesis succeeds
    - Run `npx cdk synth --context environment=dev` from `infra/` and confirm zero errors and a valid CloudFormation template
    - _Requirements: 9.3_

- [x] 6. Health Lambda handler
  - [x] 6.1 Implement the health handler
    - File: `backend/src/handlers/health.ts`
    - Call `DynamoDBClient.send(new DescribeTableCommand({ TableName: process.env.TABLE_NAME }))` to probe reachability
    - On success: return `successResponse({ status: 'ok', timestamp: new Date().toISOString() })`; emit structured JSON log with `level`, `requestId`, `route`, `statusCode`, `durationMs`, `timestamp` — never log PII
    - On DynamoDB error: return `{ statusCode: 503, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'degraded', reason: 'database_unreachable' }) }`; emit warn-level log
    - Wrap entire body in top-level try/catch; on unexpected error return `errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')` — never expose stack traces
    - _Requirements: 14.5, 16.1, 17.1, 17.2, 17.3, 17.4_

  - [x] 6.2 Write unit tests for health handler
    - File: `tests/unit/health-handler.test.ts`
    - Test: 200 body shape `{ data: { status: 'ok', timestamp: <ISO-8601 string> } }` when DynamoDB resolves
    - Test: 503 body `{ status: 'degraded', reason: 'database_unreachable' }` when DynamoDB throws
    - Test: timestamp in 200 response is a valid ISO-8601 string (use `vi.spyOn` for Date — never use `Math.random()`)
    - _Requirements: 17.2, 17.3_

- [x] 7. Backend checkpoint — compile and test pass
  - Run `npm test -- --run` from the repository root; confirm all unit and property tests pass with exit code 0
  - Run `tsc --noEmit` in `backend/` and `infra/`; confirm zero type errors
  - Ensure all tests pass; raise any questions before proceeding to the frontend

- [x] 8. Frontend shell
  - [x] 8.1 Create Vite entry point and build config
    - `frontend/index.html`: `<div id="root">` and `<script type="module" src="/src/main.tsx">`
    - `frontend/vite.config.ts`: `@vitejs/plugin-react`, `resolve.alias` `@/` → `src/`
    - _Requirements: 19.5_

  - [x] 8.2 Configure Tailwind CSS
    - `frontend/tailwind.config.ts`: content glob `./src/**/*.{ts,tsx}`; `theme.extend.colors` with `brand` (50–900 green scale), `success: '#16a34a'`, `warning: '#d97706'`, `danger: '#dc2626'`
    - `frontend/postcss.config.js`: `tailwindcss` + `autoprefixer`
    - `frontend/src/index.css`: import Tailwind base, components, and utilities layers
    - _Requirements: 21.1, 21.2, 21.3_

  - [x] 8.3 Create authentication context and provider
    - `frontend/src/auth/AuthContext.tsx`: define `AuthContextValue` interface (user, accessToken, role, isLoading, signIn, signOut, signUp, confirmSignUp, refreshSession) and export `AuthContext`
    - `frontend/src/auth/AuthProvider.tsx`: use `amazon-cognito-identity-js`; store tokens in module-scoped variables only — **never** `localStorage` or `sessionStorage`; extract role from `cognito:groups` claim in decoded id_token
    - `frontend/src/auth/useCurrentUser.ts`: return the current `AuthContextValue` from context
    - `frontend/src/auth/useSignOut.ts`: call `signOut()` and clear in-memory tokens
    - _Requirements: 3.4, 4.1, 4.5, 4.6, 4.7, 5.1, 5.2, 6.4, 7.2, 7.3, 20.6_

  - [x] 8.4 Create API client with Bearer token injection
    - `frontend/src/api/client.ts`: Axios instance with `baseURL: import.meta.env.VITE_API_URL`, `Content-Type: application/json`; request interceptor attaches `Authorization: Bearer <accessToken>`; response interceptor handles 401 by calling `refreshSession()` once then retrying; HTTPS only (no HTTP endpoints)
    - _Requirements: 6.5, 8.1, 19.3_

  - [x] 8.5 Create route guards and loading components
    - `frontend/src/components/ProtectedRoute.tsx`: renders `<LoadingSpinner />` while `isLoading`; redirects to `/sign-in` (preserving requested URL in router state) if unauthenticated; renders `<ForbiddenPage />` if `requiredRole` is set and user's role doesn't match
    - `frontend/src/components/RoleGuard.tsx`: wraps children, shows `<ForbiddenPage />` for role mismatch
    - `frontend/src/components/LoadingSpinner.tsx`: `role="status"` attribute; visually-hidden `<span>` label for screen readers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2_

  - [x] 8.6 Create App router and placeholder pages
    - `frontend/src/App.tsx`: route tree using `<Routes>`: `/` (public HomePage), `/sign-in`, `/sign-up`, `/verify-email` (public auth pages), `/dashboard` (ProtectedRoute, any role), `*` (NotFoundPage)
    - Placeholder pages (each with semantic `<main>` and `<h1>`): `HomePage.tsx`, `DashboardPage.tsx`, `ForbiddenPage.tsx`, `NotFoundPage.tsx`
    - `frontend/src/main.tsx`: `<React.StrictMode>` wrapping `<BrowserRouter>`, `<QueryClientProvider client={queryClient}>` (staleTime 60 000, retry 1), `<AuthProvider>`, `<App />`
    - _Requirements: 6.1, 6.2, 6.3, 19.1, 19.2, 19.4_

  - [x] 8.7 Verify frontend build succeeds
    - Run `npm run build --workspace=frontend`; confirm zero TypeScript errors and successful `dist/` output
    - _Requirements: 19.5_

- [x] 9. Authentication UI pages
  - [x] 9.1 Create SignUpPage
    - File: `frontend/src/pages/SignUpPage.tsx`
    - Controlled fields: `email` (`type="email"`), `password` (`type="password"`), `confirmPassword` (`type="password"`), `role` select (Donor, Organization, Volunteer — Admin is excluded per Requirement 3.6)
    - Validate `password === confirmPassword` client-side before any network call; display inline error
    - On success: call `signUp()` and navigate to `/verify-email`
    - All inputs have explicit `<label>`; button shows disabled/loading state during async calls; Tailwind classes for accessible colour contrast
    - _Requirements: 3.1, 3.3, 3.6, 20.1, 20.2_

  - [x] 9.2 Create SignInPage
    - File: `frontend/src/pages/SignInPage.tsx`
    - Controlled fields: `email` (`type="email"`), `password` (`type="password"`)
    - On success: call `signIn()`; store tokens in memory; redirect to originally requested URL or `/dashboard`
    - On Cognito error: display human-readable message (do not reveal whether email or password was wrong)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 20.3, 20.5, 20.6_

  - [x] 9.3 Create VerifyEmailPage
    - File: `frontend/src/pages/VerifyEmailPage.tsx`
    - 6-digit code input with `<label>`; call `confirmSignUp()` on submit; on success navigate to `/sign-in`
    - Display Cognito errors as human-readable messages
    - _Requirements: 3.4, 20.4, 20.5_

- [x] 10. Kiro steering files
  - [x] 10.1 Create `product.md` steering file
    - Front matter: `inclusion: always`
    - Content: NourishNet mission, the four user roles (Donor, Organization, Volunteer, Admin), the core food redistribution workflow, and listing lifecycle states
    - _Requirements: 24.1, 24.2, 24.3_

  - [x] 10.2 Create `architecture.md` steering file
    - Front matter: `inclusion: always`
    - Content: AWS architecture overview, monorepo structure, DynamoDB single-table design philosophy, entity key pattern table, access patterns table (AP-1 through AP-10), API versioning convention (`/v1/`)
    - _Requirements: 24.1, 24.2, 24.4_

  - [x] 10.3 Create `coding-standards.md` steering file
    - Front matter: `inclusion: always`
    - Content: TypeScript strict-mode rules, naming conventions table, error handling patterns, API response envelope format, logging requirements, import ordering
    - _Requirements: 24.1, 24.2, 24.5_

  - [x] 10.4 Create `security.md` steering file
    - Front matter: `inclusion: always`
    - Content: Cognito token validation rules, least-privilege IAM patterns, input sanitisation requirements (Zod `.strict()`), secrets management rules, frontend token storage rules (memory only)
    - _Requirements: 24.1, 24.2, 24.6_

  - [x] 10.5 Create `testing.md` steering file
    - Front matter: `inclusion: always`
    - Content: test stack table, when to use PBT vs. integration tests, fast-check usage pattern, NourishNet domain arbitraries, coverage thresholds, test file naming conventions
    - _Requirements: 24.1, 24.2, 24.7_

  - [x] 10.6 Create `social-impact.md` steering file
    - Front matter: `inclusion: always`
    - Content: social impact measurement model, impact metric formulas, constants (`MEALS_PER_KG`, `CARBON_PER_KG_FOOD_WASTE`) with WRAP UK citations, required impact fields per entity (DONATION, PICKUP, REPORT), ethical constraints
    - _Requirements: 24.1, 24.2, 24.8_

- [x] 11. Kiro hooks
  - [x] 11.1 Create `api-contract-guard.md` hook
    - File: `.kiro/hooks/api-contract-guard.md`
    - Trigger: `fileEdited` on `backend/src/handlers/**/*.ts`
    - Action: verify the edited handler returns responses conforming to the API envelope (`{ data }` for success, `{ error: { code, message } }` for errors)
    - _Requirements: 25.1_

  - [x] 11.2 Create `security-review.md` hook
    - File: `.kiro/hooks/security-review.md`
    - Trigger: `fileEdited` on `backend/src/**/*.ts` or `infra/lib/**/*.ts`
    - Action: check for hardcoded secrets, wildcard IAM actions/resources, missing input validation
    - _Requirements: 25.2_

  - [x] 11.3 Create `test-coverage-reminder.md` hook
    - File: `.kiro/hooks/test-coverage-reminder.md`
    - Trigger: `fileEdited` on `backend/src/domain/**/*.ts`
    - Action: check whether a corresponding property-based test exists in `tests/properties/` and remind the developer if one is missing
    - _Requirements: 25.3_

  - [x] 11.4 Create `impact-data-integrity.md` hook
    - File: `.kiro/hooks/impact-data-integrity.md`
    - Trigger: `fileEdited` on `backend/src/repositories/**/*.ts`
    - Action: verify that write operations include all required social impact fields (weight, category, donorId, organizationId, volunteerId, redistributedAt)
    - _Requirements: 25.4_

- [x] 12. Kiro custom agents
  - [x] 12.1 Create `product-reviewer.md` agent
    - System prompt: evaluate features against NourishNet's social mission and the four-role workflow; challenge implementations that drift from the redistribution workflow; review role-based access controls
    - _Requirements: 26.1_

  - [x] 12.2 Create `serverless-architect.md` agent
    - System prompt: review Lambda, API Gateway, and DynamoDB decisions against the documented architecture; flag least-privilege IAM violations, missing GSI coverage, hot-partition risks, and cold-start issues
    - _Requirements: 26.2_

  - [x] 12.3 Create `property-test-engineer.md` agent
    - System prompt: identify invariant, round-trip, idempotence, and metamorphic properties; generate fast-check property tests for domain functions; advise on when integration tests are more appropriate than PBT
    - _Requirements: 26.3_

  - [x] 12.4 Create `social-impact-reviewer.md` agent
    - System prompt: verify required impact fields per entity, check derived metrics use centralised constants, ensure no redistribution event completes without a REPORT entity
    - _Requirements: 26.4_

- [x] 13. Kiro Power — NourishNet Community Food
  - [x] 13.1 Create `plugin.json`
    - File: `powers/nourishnet-community-food/plugin.json`
    - Fields: `name: "NourishNet Community Food"`, `version: "0.1.0"`, `description`, `keywords: ["nourishnet","food","donation","redistribution","impact"]`, `skills` array, `mcpServers` referencing `mcp.json`
    - _Requirements: 27.1, 27.4_

  - [x] 13.2 Create `mcp.json` with tool stubs
    - File: `powers/nourishnet-community-food/mcp.json`
    - Declare `nourishnet-domain` MCP server with tool stubs: `get_donation_by_id(id: string)`, `list_donations_by_status(status: string)`, `list_organizations()`, `get_impact_summary()`
    - _Requirements: 27.2_

  - [x] 13.3 Create `POWER.md` documentation
    - File: `powers/nourishnet-community-food/POWER.md`
    - Document: purpose, available MCP tools with parameter/return descriptions, example invocations, activation keywords, skill file references
    - _Requirements: 27.3_

  - [x] 13.4 Create skill SKILL.md files
    - `powers/nourishnet-community-food/skills/food-donation-domain/SKILL.md`: donation lifecycle, food categories, claim semantics, claim-uniqueness invariant
    - `powers/nourishnet-community-food/skills/impact-metrics/SKILL.md`: measurement model, constants with WRAP UK citations, metric classification, responsible reporting guidelines
    - `powers/nourishnet-community-food/skills/serverless-patterns/SKILL.md`: Lambda handler pattern, DynamoDB key builders, Cognito JWT extraction from `event.requestContext.authorizer.jwt.claims`, CDK IAM patterns, CloudWatch structured logging
    - _Requirements: 27.1, 27.3_

- [x] 14. Scaffolded spec directories and AGENTS.md
  - [x] 14.1 Create scaffolded spec directories for Specs 2–6
    - Create `.kiro/specs/nourishnet-donations/`, `nourishnet-matching/`, `nourishnet-pickup/`, `nourishnet-impact/`, `nourishnet-moderation/`
    - Each contains a `requirements.md` with title, introduction, and clearly marked `<!-- PENDING -->` placeholder section
    - Each contains a `.config.kiro` with unique `specId` (UUID), `workflowType: "requirements-first"`, `specType: "feature"`
    - _Requirements: 28.1, 28.2, 28.3_

  - [x] 14.2 Verify `AGENTS.md` is complete
    - Confirm root `AGENTS.md` lists all four agents with purpose and best-use descriptions, the NourishNet Kiro Power with activation instructions, and all four hooks with trigger conditions and actions
    - _Requirements: 29.1, 29.2, 29.3, 29.4_

- [x] 15. Documentation
  - [x] 15.1 Complete `docs/architecture.md`
    - ASCII system architecture diagram
    - Monorepo structure overview with layer separation rules
    - DynamoDB entity key pattern table (all four entities, all six key columns)
    - Access patterns table AP-1 through AP-10
    - _Requirements: 11.8, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 15.2 Complete `docs/api.md`
    - `GET /v1/health`: description, authentication (none), 200 success response example, 503 degraded response example, curl example
    - Document the API response envelope format with success and error shape examples
    - _Requirements: 18.1, 18.2, 17.2, 17.3_

  - [x] 15.3 Complete `docs/impact-model.md`
    - Impact metric table (name, formula, unit, type, assumptions, source)
    - Constants table (`MEALS_PER_KG` and `CARBON_PER_KG_FOOD_WASTE` with WRAP UK citations)
    - Ethical guidelines section (no fabrication, no PII in aggregates, no gamification of food safety)
    - _Requirements: 1.10_

  - [x] 15.4 Complete `docs/deployment.md`
    - Prerequisites (Node.js 20, AWS CLI, CDK bootstrap command)
    - `cdk deploy` instructions for dev and prod environments
    - Amplify Hosting deployment instructions (connecting repository branch)
    - Environment variable configuration (CDK stack outputs → `.env.local` → Amplify environment settings)
    - Teardown instructions
    - _Requirements: 1.10_

- [x] 16. Integration tests and scripts
  - [x] 16.1 Create health handler integration test
    - File: `tests/integration/health-handler.integration.test.ts`
    - Test 1: mock `DynamoDBClient` to resolve; invoke handler; assert 200 and body `{ data: { status: 'ok', timestamp: <string> } }`
    - Test 2: mock `DynamoDBClient` to throw; assert 503 and body `{ status: 'degraded', reason: 'database_unreachable' }`
    - Test 3: assert timestamp in 200 response is a valid ISO-8601 string (use regex or `Date.parse` check)
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 16.2 Create deployment verification scripts
    - `scripts/verify-aws-connection.ps1`: run `aws sts get-caller-identity`; print `Account`, `UserId`, `Arn` without exposing secrets; write output with timestamp and region to `docs/evidence/command-output/aws-identity.txt`
    - `scripts/verify-deployment.ts`: check `FRONTEND_URL` returns HTTP 200 and `API_URL/v1/health` returns 200 with `status: ok`; output `[PASS]` or `[FAIL]` per check; exit code 1 if any check fails
    - `scripts/seed-data.ts`: placeholder that logs "Seed data script — not yet implemented" and exits 0
    - _Requirements: 1.1_

- [x] 17. Final checkpoint — all checks pass
  - Run `npm install` from the repository root; confirm single `package-lock.json` and no errors
  - Run `npm test -- --run`; confirm all unit and property tests pass with exit code 0
  - Run `npm run build --workspace=frontend`; confirm zero TypeScript errors and `dist/` output
  - Run `npx cdk synth --context environment=dev`; confirm valid CloudFormation template
  - Run `npm run typecheck`; confirm zero type errors across all workspaces
  - Verify artifact counts: `.kiro/steering/` has 6 files, `.kiro/agents/` has 4 files, `.kiro/hooks/` has the 4 spec-defined `.md` hooks (`api-contract-guard.md`, `security-review.md`, `test-coverage-reminder.md`, `impact-data-integrity.md`) plus 4 supplementary `.json` automation hooks (`backend-tests.json`, `property-tests.json`, `infrastructure-review.json`, `impact-docs-check.json`) = 8 files total, `powers/nourishnet-community-food/` has `plugin.json`, `mcp.json`, `POWER.md`, and 3 skill `SKILL.md` files

---

## Notes

- Tasks 4 (testing infrastructure) and 5 (CDK stack) are fully independent after Task 3 completes — work them in parallel.
- Tasks 10–14 (Kiro artifacts and docs) have no code dependencies and can be interleaved freely with any wave-2 or later task.
- Task 5 (CDK stack) includes Amplify Hosting provisioning. Connecting a repository branch and triggering an initial build is a post-deployment step documented in `docs/deployment.md`.
- The `api-handler` Lambda (Task 5.5) is a placeholder returning 404 for all routes except `/v1/health`. Real route handlers are added in Specs 2–6.
- Frontend environment variables (`VITE_API_URL`, `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`) come from CDK stack outputs and are stored in `.env.local` (gitignored) for local development and in Amplify environment settings for production builds.
- Property tests (Tasks 4.2–4.4) run against domain modules directly — no AWS resources required. Integration tests (Task 16.1) use mocked AWS clients. Live AWS end-to-end tests are deferred to the evidence-gathering phase.
