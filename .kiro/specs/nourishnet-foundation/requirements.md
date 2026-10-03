# Requirements Document

## Introduction

NourishNet is a social-good surplus food redistribution platform that connects surplus-food donors with verified community organizations and volunteers. The Foundation Spec establishes the technical base upon which all product features are built: monorepo project structure, authentication via Amazon Cognito, AWS infrastructure via CDK, a DynamoDB single-table design with documented access patterns, an API skeleton, a React frontend shell, and testing infrastructure.

This document defines requirements for **Spec 1 — Foundation**. It does not define product-level workflows (donations, matching, pickup, impact, moderation); those are addressed in Specs 2–6.

---

## Glossary

- **System**: The NourishNet platform as a whole.
- **Frontend**: The React + TypeScript + Vite single-page application served via AWS Amplify Hosting.
- **Backend**: The TypeScript AWS Lambda functions exposed through Amazon API Gateway.
- **Infra**: The AWS CDK TypeScript project that provisions all cloud resources.
- **Auth_Service**: Amazon Cognito, responsible for identity, authentication, and role-based group assignment.
- **API_Gateway**: Amazon API Gateway, the HTTP entry point for all backend requests.
- **Lambda**: AWS Lambda functions that implement backend business logic.
- **Database**: Amazon DynamoDB, using a single-table design named `NourishNetTable`.
- **Repository**: The monorepo root directory containing all workspaces.
- **Donor**: A user who creates surplus food listings.
- **Organization**: A verified community organization that claims surplus food listings.
- **Volunteer**: A user who coordinates and executes pickup and delivery of claimed food.
- **Admin**: A privileged user who manages platform integrity and user verification.
- **JWT**: JSON Web Token issued by Auth_Service upon successful authentication.
- **Access_Pattern**: A documented query against Database that must be satisfiable by the primary key or a Global Secondary Index (GSI).
- **CDK_Stack**: An AWS CDK construct that defines a set of provisioned cloud resources.
- **Health_Endpoint**: The `GET /health` route that verifies the API is reachable.
- **Test_Runner**: Vitest, the unit and property-based test execution engine.
- **PBT_Library**: fast-check, the property-based testing library used within Test_Runner.
- **Steering_File**: A Markdown file under `.kiro/steering/` that provides persistent guidance to AI agents working in the Repository.
- **Hook**: A Kiro automation definition under `.kiro/hooks/` that triggers agent actions on IDE events.
- **Agent**: A Kiro custom agent definition under `.kiro/agents/` that encapsulates specialized AI behavior.

---

## Requirements

### Requirement 1: Monorepo Project Structure

**User Story:** As a developer, I want a well-organised monorepo with clearly separated workspaces, so that frontend, backend, infrastructure, and test code can evolve independently with shared tooling.

#### Acceptance Criteria

1. THE Repository SHALL contain the top-level directories `frontend/`, `backend/`, `infra/`, `tests/`, `docs/`, and `scripts/`.
2. THE Repository SHALL contain a root `package.json` that declares npm workspaces covering `frontend`, `backend`, and `infra`.
3. THE Repository SHALL contain a root `tsconfig.base.json` that defines shared TypeScript compiler options inherited by all workspace `tsconfig.json` files.
4. WHEN a developer runs `npm install` from the Repository root, THE Repository SHALL install all workspace dependencies via a single lockfile.
5. THE Repository SHALL contain a root `.gitignore` that excludes `node_modules/`, `dist/`, `.env*`, and CDK asset artefacts (`cdk.out/`).
6. THE `frontend/` workspace SHALL contain a `package.json`, a `tsconfig.json` extending `tsconfig.base.json`, a `vite.config.ts`, and a `src/` directory.
7. THE `backend/` workspace SHALL contain a `package.json`, a `tsconfig.json` extending `tsconfig.base.json`, and a `src/` directory with sub-directories `handlers/`, `domain/`, `repositories/`, and `validation/`.
8. THE `infra/` workspace SHALL contain a `package.json`, a `tsconfig.json` extending `tsconfig.base.json`, a `cdk.json`, and a `lib/` directory.
9. THE `tests/` directory SHALL contain sub-directories `unit/`, `integration/`, and `properties/`.
10. THE `docs/` directory SHALL contain placeholder files for `architecture.md`, `api.md`, `impact-model.md`, `deployment.md`, and `evidence.md`.

---

### Requirement 2: TypeScript Configuration

**User Story:** As a developer, I want strict TypeScript settings applied uniformly across all workspaces, so that type errors are caught at compile time before reaching production.

#### Acceptance Criteria

1. THE `tsconfig.base.json` SHALL enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `forceConsistentCasingInFileNames` compiler options.
2. THE `tsconfig.base.json` SHALL set `target` to `ES2022` and `module` to `NodeNext`.
3. WHEN a workspace `tsconfig.json` extends `tsconfig.base.json`, THE workspace SHALL be able to override `outDir` and `rootDir` without affecting sibling workspaces.
4. THE `frontend/tsconfig.json` SHALL additionally include `"lib": ["ES2022", "DOM", "DOM.Iterable"]` and set `moduleResolution` to `bundler`.
5. THE `backend/tsconfig.json` SHALL set `moduleResolution` to `NodeNext` and include a `paths` mapping for internal workspace aliases.

---

### Requirement 3: Authentication — User Registration

**User Story:** As a new user, I want to register an account with an email address, password, and role, so that I can access NourishNet features appropriate to my role.

#### Acceptance Criteria

1. WHEN a user submits a registration form with a valid email, a password meeting complexity rules, and a selected role (Donor, Organization, or Volunteer), THE Auth_Service SHALL create a new user account and send a verification email.
2. WHEN a user submits a registration form with an email address that already exists in Auth_Service, THEN THE Auth_Service SHALL return an error indicating the address is already registered.
3. WHEN a user submits a registration form with a password shorter than 12 characters or lacking at least one uppercase letter, one lowercase letter, one digit, and one special character, THEN THE Auth_Service SHALL return a descriptive validation error without creating an account.
4. WHEN a user's email address is verified, THE Auth_Service SHALL add the user to the Cognito group corresponding to the selected role (`Donors`, `Organizations`, or `Volunteers`).
5. THE Auth_Service SHALL enforce email uniqueness across all registered accounts.
6. WHEN a user attempts to register with the role `Admin`, THEN THE Auth_Service SHALL reject the request with an authorisation error, because Admin accounts are provisioned only by existing Admins.

---

### Requirement 4: Authentication — Sign In and Token Issuance

**User Story:** As a registered user, I want to sign in with my email and password, so that I receive a token I can use to make authenticated API requests.

#### Acceptance Criteria

1. WHEN a registered, verified user submits valid credentials, THE Auth_Service SHALL return an `id_token`, an `access_token`, and a `refresh_token`.
2. WHEN a user submits credentials for an account that does not exist, THEN THE Auth_Service SHALL return an authentication error without revealing whether the email or the password was incorrect.
3. WHEN a user submits an incorrect password for a valid account, THEN THE Auth_Service SHALL return an authentication error without revealing whether the email or the password was incorrect.
4. WHEN a user submits credentials for an unverified account, THEN THE Auth_Service SHALL return an error indicating that email verification is pending.
5. THE Auth_Service SHALL issue `access_token`s with a maximum validity of 60 minutes.
6. THE Auth_Service SHALL issue `refresh_token`s with a maximum validity of 30 days.
7. WHEN a valid `refresh_token` is presented to Auth_Service, THE Auth_Service SHALL return a new `access_token` without requiring the user to re-enter credentials.

---

### Requirement 5: Authentication — Sign Out

**User Story:** As a signed-in user, I want to sign out, so that my session is terminated and my tokens cannot be reused.

#### Acceptance Criteria

1. WHEN a signed-in user triggers sign-out, THE Auth_Service SHALL invalidate all active sessions for that user.
2. WHEN sign-out completes, THE Frontend SHALL remove all stored tokens from browser storage.
3. WHEN a previously issued `access_token` is used after the owning user has signed out, THEN THE API_Gateway SHALL return a 401 Unauthorised response.

---

### Requirement 6: Authentication — Protected Routes

**User Story:** As a product owner, I want all non-public frontend routes to require authentication, so that unauthenticated users cannot access member-only pages.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to a route that requires authentication, THE Frontend SHALL redirect the user to the sign-in page.
2. WHEN an authenticated user signs in successfully, THE Frontend SHALL redirect the user to the page they originally requested.
3. THE Frontend SHALL expose the following routes as public (no authentication required): `/`, `/sign-in`, `/sign-up`, and `/verify-email`.
4. WHILE a user's authentication state is being loaded, THE Frontend SHALL display a loading indicator and SHALL NOT redirect the user.
5. WHEN an authenticated user's `access_token` expires and a valid `refresh_token` is available, THE Frontend SHALL silently refresh the `access_token` before retrying the original request.

---

### Requirement 7: Authentication — Role-Based Route Guards

**User Story:** As a product owner, I want role-specific pages accessible only to users with the correct role, so that each user sees only the functionality relevant to them.

#### Acceptance Criteria

1. WHEN an authenticated user whose Cognito group is not `Admins` attempts to navigate to an Admin-only route, THE Frontend SHALL redirect the user to a 403 Forbidden page.
2. THE Frontend SHALL determine a user's role from the `cognito:groups` claim in the decoded `id_token`.
3. WHEN a user's Cognito group membership changes, THE Frontend SHALL reflect the new role upon the next token refresh without requiring a full re-authentication.

---

### Requirement 8: Authenticated API Requests

**User Story:** As a frontend developer, I want all API requests to automatically include the current user's access token, so that the backend can verify identity on every call.

#### Acceptance Criteria

1. WHEN the Frontend makes an API request, THE Frontend SHALL include the `access_token` as a `Bearer` token in the `Authorization` header.
2. WHEN the API_Gateway receives a request without a valid `Authorization` header, THE API_Gateway SHALL return a 401 Unauthorised response before invoking Lambda.
3. WHEN the API_Gateway receives a request with an expired `access_token`, THE API_Gateway SHALL return a 401 Unauthorised response.
4. WHEN the API_Gateway receives a request with a structurally invalid JWT, THE API_Gateway SHALL return a 401 Unauthorised response.
5. THE API_Gateway SHALL use a Cognito Authorizer configured with the Auth_Service User Pool to validate all non-public endpoints.

---

### Requirement 9: AWS Infrastructure — CDK Stack

**User Story:** As a DevOps engineer, I want all AWS resources defined as code in a CDK stack, so that infrastructure is reproducible, version-controlled, and deployable to multiple environments.

#### Acceptance Criteria

1. THE Infra workspace SHALL define a CDK_Stack named `NourishNetFoundationStack` that provisions all resources required by the Foundation Spec.
2. THE CDK_Stack SHALL accept an `environment` parameter (values: `dev`, `staging`, `prod`) that scopes resource names and configuration.
3. WHEN the CDK_Stack is synthesised with `cdk synth`, THE Infra workspace SHALL produce a valid CloudFormation template without errors.
4. THE CDK_Stack SHALL tag all provisioned resources with `Project=NourishNet` and `Environment=<environment>`.
5. IF a CDK deployment fails, THEN THE CDK_Stack SHALL roll back all changes in the affected CloudFormation stack automatically via CloudFormation rollback semantics.

---

### Requirement 10: AWS Infrastructure — Cognito User Pool

**User Story:** As a security engineer, I want Cognito configured with strong password policy, MFA readiness, and role-based groups, so that user accounts are protected from the outset.

#### Acceptance Criteria

1. THE CDK_Stack SHALL provision a Cognito User Pool named `NourishNetUserPool-<environment>`.
2. THE Cognito User Pool SHALL enforce a minimum password length of 12 characters and require at least one uppercase letter, one lowercase letter, one digit, and one special character.
3. THE CDK_Stack SHALL create four Cognito groups within the User Pool: `Donors`, `Organizations`, `Volunteers`, and `Admins`.
4. THE CDK_Stack SHALL provision a Cognito User Pool Client configured for the `USER_PASSWORD_AUTH` and `REFRESH_TOKEN_AUTH` authentication flows.
5. THE Cognito User Pool Client SHALL NOT have a client secret, because the Frontend is a public client.
6. THE CDK_Stack SHALL configure the Cognito User Pool to use email as the sign-in alias.
7. WHERE the environment is `prod`, THE Cognito User Pool SHALL have deletion protection enabled.

---

### Requirement 11: AWS Infrastructure — DynamoDB Table

**User Story:** As a backend engineer, I want a DynamoDB single-table provisioned with the correct key schema and GSIs, so that all documented access patterns can be satisfied efficiently.

#### Acceptance Criteria

1. THE CDK_Stack SHALL provision a DynamoDB table named `NourishNetTable-<environment>` with a partition key `PK` (String) and a sort key `SK` (String).
2. THE Database SHALL use on-demand (PAY_PER_REQUEST) billing mode.
3. THE CDK_Stack SHALL enable point-in-time recovery on the Database.
4. THE CDK_Stack SHALL enable DynamoDB Streams on the Database with `NEW_AND_OLD_IMAGES` view type.
5. THE CDK_Stack SHALL provision a GSI named `GSI1` with partition key `GSI1PK` (String) and sort key `GSI1SK` (String), using the same on-demand billing mode.
6. THE CDK_Stack SHALL provision a GSI named `GSI2` with partition key `GSI2PK` (String) and sort key `GSI2SK` (String).
7. WHERE the environment is `prod`, THE Database SHALL have deletion protection enabled.
8. THE `docs/architecture.md` file SHALL document the single-table design including all entity key patterns and all Access_Patterns supported by the primary key and GSIs.

---

### Requirement 12: DynamoDB Access Patterns

**User Story:** As a backend engineer, I want all required data access patterns documented and mapped to key structures before any Lambda code is written, so that I do not provision indexes reactively.

#### Acceptance Criteria

1. THE `docs/architecture.md` file SHALL document the following Access_Patterns for the `USER` entity: fetch user by userId (primary key), list all users by role (GSI1).
2. THE `docs/architecture.md` file SHALL document the following Access_Patterns for the `DONATION` entity: fetch donation by donationId (primary key), list all donations by status (GSI1), list donations by donor (GSI2).
3. THE `docs/architecture.md` file SHALL document the following Access_Patterns for the `PICKUP` entity: fetch pickup by pickupId (primary key), list pickups by donation (GSI1), list pickups by volunteer (GSI2).
4. THE `docs/architecture.md` file SHALL document the following Access_Patterns for the `REPORT` entity: fetch report by reportId (primary key), list reports by organization (GSI1).
5. THE `docs/architecture.md` SHALL specify the PK, SK, GSI1PK, GSI1SK, GSI2PK, and GSI2SK values for each entity in a Markdown table.

---

### Requirement 13: AWS Infrastructure — API Gateway

**User Story:** As a backend engineer, I want an API Gateway configured with CORS, a Cognito Authorizer, and versioned routes, so that the frontend can reach Lambda functions securely.

#### Acceptance Criteria

1. THE CDK_Stack SHALL provision an HTTP API Gateway named `NourishNetApi-<environment>`.
2. THE API_Gateway SHALL be configured with a default Cognito Authorizer referencing the `NourishNetUserPool-<environment>` User Pool.
3. THE API_Gateway SHALL be configured with CORS to allow requests from the Frontend origin, allow the `Authorization` and `Content-Type` headers, and allow the methods `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS`.
4. THE CDK_Stack SHALL route all API paths under the prefix `/v1/`.
5. THE API_Gateway SHALL have a `$default` stage with automatic deployments enabled.

---

### Requirement 14: AWS Infrastructure — Lambda Functions

**User Story:** As a backend engineer, I want Lambda functions provisioned with correct runtimes, IAM permissions, and environment variables, so that handlers can run securely with least-privilege access.

#### Acceptance Criteria

1. THE CDK_Stack SHALL provision Lambda functions using the `nodejs20.x` runtime.
2. EACH Lambda function SHALL be granted an IAM role with only the permissions required for the operations it performs on Database.
3. THE CDK_Stack SHALL pass the Database table name and the Cognito User Pool ID to each Lambda function as environment variables.
4. THE CDK_Stack SHALL configure a CloudWatch Log Group for each Lambda function with a retention period of 30 days.
5. WHEN a Lambda function throws an unhandled exception, THE Lambda function SHALL return a 500 Internal Server Error response with a JSON body containing a `message` field.
6. THE CDK_Stack SHALL set a default Lambda timeout of 10 seconds and a memory size of 256 MB.

---

### Requirement 15: AWS Infrastructure — Amplify Hosting

**User Story:** As a DevOps engineer, I want the React frontend deployed via AWS Amplify Hosting, so that the application is globally distributed with automatic HTTPS.

#### Acceptance Criteria

1. THE CDK_Stack SHALL provision an Amplify Hosting app named `NourishNet-<environment>`.
2. THE Amplify Hosting app SHALL serve the built output of the `frontend/` workspace.
3. THE CDK_Stack SHALL configure a rewrite rule so that all requests to paths not matching a static asset are served `index.html`, enabling client-side routing.
4. THE Amplify Hosting app SHALL enforce HTTPS and redirect all HTTP requests to HTTPS.

---

### Requirement 16: AWS Infrastructure — CloudWatch Observability

**User Story:** As an operations engineer, I want structured logs and a baseline CloudWatch dashboard, so that I can observe system health and diagnose issues in production.

#### Acceptance Criteria

1. WHEN a Lambda function processes a request, THE Lambda function SHALL emit a structured JSON log entry containing at minimum: `requestId`, `route`, `statusCode`, `durationMs`, and `timestamp`.
2. THE CDK_Stack SHALL provision a CloudWatch Dashboard named `NourishNet-<environment>` displaying Lambda invocation counts, error rates, and p99 durations for all functions.
3. THE CDK_Stack SHALL provision a CloudWatch Alarm that triggers when any Lambda function's error rate exceeds 5% over a 5-minute evaluation period.
4. WHERE the environment is `prod`, THE CloudWatch Alarm SHALL be connected to an SNS topic for alert delivery.

---

### Requirement 17: API Skeleton — Health Endpoint

**User Story:** As a DevOps engineer, I want a `GET /health` endpoint that returns the system status, so that load balancers and monitoring tools can verify the API is reachable.

#### Acceptance Criteria

1. WHEN a request is made to `GET /v1/health`, THE API_Gateway SHALL route the request to the health Lambda function without requiring authorisation.
2. WHEN the health Lambda function is invoked, THE Lambda function SHALL return a 200 OK response with a JSON body containing `{ "status": "ok", "timestamp": "<ISO-8601 datetime>" }`.
3. WHEN the health Lambda function is invoked and the Database is unreachable, THE Lambda function SHALL return a 503 Service Unavailable response with a JSON body containing `{ "status": "degraded", "reason": "database_unreachable" }`.
4. THE health endpoint SHALL respond within 500 ms under normal operating conditions.

---

### Requirement 18: API Skeleton — Request and Response Shape

**User Story:** As a backend developer, I want all API responses to follow a consistent envelope structure, so that the frontend can handle success and error cases uniformly.

#### Acceptance Criteria

1. THE Backend SHALL return all successful responses as JSON objects with a top-level `data` field containing the response payload.
2. THE Backend SHALL return all error responses as JSON objects with a top-level `error` field containing `code` (string), `message` (string), and optionally `details` (object).
3. WHEN the Backend receives a request body that fails schema validation, THE Backend SHALL return a 400 Bad Request response with an `error` object whose `code` is `VALIDATION_ERROR`.
4. WHEN the Backend receives a request for a resource that does not exist, THE Backend SHALL return a 404 Not Found response with an `error` object whose `code` is `NOT_FOUND`.
5. WHEN the Backend encounters an unexpected internal error, THE Backend SHALL return a 500 Internal Server Error response with an `error` object whose `code` is `INTERNAL_ERROR` and SHALL NOT expose internal stack traces in the response body.

---

### Requirement 19: Frontend Shell — Application Entry Point

**User Story:** As a frontend developer, I want a working React application shell with routing, authentication context, and API client configured, so that product features can be added without re-engineering the foundation.

#### Acceptance Criteria

1. THE Frontend SHALL render a root `<App />` component that wraps the application in a React Router `<BrowserRouter>`, a TanStack Query `<QueryClientProvider>`, and an authentication context provider.
2. THE Frontend SHALL configure TanStack Query with a `staleTime` of 60 seconds and `retry` set to 1 for all queries.
3. THE Frontend SHALL use an Axios or Fetch-based API client that automatically attaches the `Bearer` token from the authentication context to every outbound request.
4. THE Frontend SHALL display a not-found page for any route that does not match a defined route.
5. THE Frontend SHALL be built using Vite and SHALL produce a production build with `npm run build` in the `frontend/` workspace without TypeScript errors.

---

### Requirement 20: Frontend Shell — Authentication UI

**User Story:** As a user, I want sign-up, sign-in, and email-verification pages, so that I can create and access my NourishNet account.

#### Acceptance Criteria

1. THE Frontend SHALL provide a sign-up page at `/sign-up` with fields for email address, password, password confirmation, and role selection (Donor, Organization, Volunteer).
2. WHEN a user submits the sign-up form with mismatched password and confirmation fields, THE Frontend SHALL display an inline validation error before making any network request.
3. THE Frontend SHALL provide a sign-in page at `/sign-in` with fields for email address and password.
4. THE Frontend SHALL provide an email-verification page at `/verify-email` that accepts a 6-digit code and submits it to Auth_Service.
5. WHEN Auth_Service returns an authentication error, THE Frontend SHALL display a human-readable error message to the user.
6. WHEN sign-in succeeds, THE Frontend SHALL store the `access_token` and `refresh_token` in memory (not `localStorage`) and redirect to the originally requested page or the dashboard.

---

### Requirement 21: Frontend Shell — Tailwind CSS Configuration

**User Story:** As a frontend developer, I want Tailwind CSS configured with a NourishNet design token baseline, so that all UI components use consistent spacing, colours, and typography.

#### Acceptance Criteria

1. THE Frontend SHALL include Tailwind CSS configured via `tailwind.config.ts` with a `content` glob covering all `frontend/src/**/*.{ts,tsx}` files.
2. THE `tailwind.config.ts` SHALL define a custom colour palette extending Tailwind's defaults with at minimum a `brand` colour scale (50–900) and a `success`, `warning`, and `danger` semantic colour.
3. THE Frontend SHALL import the Tailwind base, components, and utilities layers in its global CSS entry point.

---

### Requirement 22: Testing Infrastructure — Vitest Configuration

**User Story:** As a developer, I want Vitest configured for both unit and property-based tests across the monorepo, so that tests can be written and run consistently from the outset.

#### Acceptance Criteria

1. THE Repository SHALL contain a root `vitest.config.ts` that discovers test files matching `**/*.{test,spec}.{ts,tsx}` across all workspaces.
2. THE Test_Runner SHALL be executable with `npm test` from the Repository root.
3. THE Test_Runner SHALL produce a coverage report when run with `npm test -- --coverage`.
4. THE `tests/properties/` directory SHALL contain at least one working property-based test using PBT_Library that validates a pure utility function in the Backend.
5. WHEN the Test_Runner encounters a failing test, THE Test_Runner SHALL exit with a non-zero exit code.

---

### Requirement 23: Testing Infrastructure — Property-Based Test Baseline

**User Story:** As a quality engineer, I want a baseline property-based test demonstrating fast-check usage on a backend domain function, so that the team has a working example to build on.

#### Acceptance Criteria

1. THE `tests/properties/` directory SHALL contain a test file `api-response-envelope.property.test.ts` that exercises the Backend response envelope serialiser.
2. FOR ALL valid `data` payloads (arbitrary JSON-serialisable objects), THE Backend response envelope serialiser SHALL produce a JSON string that, when parsed, yields an object with a `data` field equal to the original payload (round-trip property).
3. FOR ALL valid `error` objects with `code` and `message` fields, THE Backend error envelope serialiser SHALL produce a JSON string that, when parsed, yields an object with an `error` field whose `code` and `message` match the originals (round-trip property).
4. WHEN the PBT_Library generates an input that violates the round-trip property, THE Test_Runner SHALL report the minimal failing example.

---

### Requirement 24: Kiro Steering Files

**User Story:** As an AI-assisted development team, I want Kiro steering files covering product vision, architecture, coding standards, security, testing, and social impact, so that AI agents working in the Repository have consistent, persistent guidance.

#### Acceptance Criteria

1. THE `.kiro/steering/` directory SHALL contain the following files: `product.md`, `architecture.md`, `coding-standards.md`, `security.md`, `testing.md`, and `social-impact.md`.
2. EACH steering file SHALL include a YAML front matter block with an `inclusion` field set to `always` so that the file is loaded into AI context automatically.
3. THE `product.md` steering file SHALL describe NourishNet's mission, the four user roles, and the core food redistribution workflow.
4. THE `architecture.md` steering file SHALL describe the AWS architecture, the monorepo structure, the DynamoDB single-table design philosophy, and the API versioning convention.
5. THE `coding-standards.md` steering file SHALL specify TypeScript strict-mode usage, naming conventions, error handling patterns, and the API response envelope format.
6. THE `security.md` steering file SHALL specify Cognito token validation requirements, least-privilege IAM patterns, and input sanitisation expectations.
7. THE `testing.md` steering file SHALL specify when to use property-based tests versus integration tests, the fast-check usage pattern, and coverage thresholds.
8. THE `social-impact.md` steering file SHALL describe the social impact measurement model and the evidence requirements for demonstrating meals redistributed.

---

### Requirement 25: Kiro Hooks

**User Story:** As a developer, I want Kiro hooks that automate code review, security checks, and test reminders on relevant IDE events, so that quality gates are applied consistently without manual intervention.

#### Acceptance Criteria

1. THE `.kiro/hooks/` directory SHALL contain a hook definition `api-contract-guard.md` that triggers after any edit to files matching `backend/src/handlers/**/*.ts` and instructs an agent to verify that the edited handler conforms to the API response envelope format.
2. THE `.kiro/hooks/` directory SHALL contain a hook definition `security-review.md` that triggers after any edit to files matching `backend/src/**/*.ts` or `infra/lib/**/*.ts` and instructs an agent to check for hardcoded secrets, overly-broad IAM policies, and missing input validation.
3. THE `.kiro/hooks/` directory SHALL contain a hook definition `test-coverage-reminder.md` that triggers after any edit to files matching `backend/src/domain/**/*.ts` and instructs an agent to check whether a corresponding property-based test exists.
4. THE `.kiro/hooks/` directory SHALL contain a hook definition `impact-data-integrity.md` that triggers after any edit to files matching `backend/src/repositories/**/*.ts` and instructs an agent to verify that write operations include the fields required by the social impact model.

---

### Requirement 26: Kiro Custom Agents

**User Story:** As a development team, I want custom Kiro agent definitions for specialised roles, so that AI assistance is tailored to NourishNet's domain needs.

#### Acceptance Criteria

1. THE `.kiro/agents/` directory SHALL contain an agent definition `product-reviewer.md` with a system prompt instructing the agent to evaluate features against NourishNet's social mission and the four-role workflow.
2. THE `.kiro/agents/` directory SHALL contain an agent definition `serverless-architect.md` with a system prompt instructing the agent to review AWS Lambda, API Gateway, and DynamoDB design decisions against the documented architecture and access patterns.
3. THE `.kiro/agents/` directory SHALL contain an agent definition `property-test-engineer.md` with a system prompt instructing the agent to generate and review fast-check property-based tests for Backend domain functions.
4. THE `.kiro/agents/` directory SHALL contain an agent definition `social-impact-reviewer.md` with a system prompt instructing the agent to verify that impact data fields are present, correctly typed, and consistent with the social impact measurement model.

---

### Requirement 27: Kiro Power — NourishNet Community Food

**User Story:** As a developer, I want a NourishNet-domain Kiro Power that encapsulates domain knowledge and MCP server capabilities, so that AI agents can query live NourishNet data and perform domain operations during development.

#### Acceptance Criteria

1. THE `powers/nourishnet-community-food/` directory SHALL contain a `plugin.json` file declaring the power's name, description, keywords, and version.
2. THE `powers/nourishnet-community-food/` directory SHALL contain an `mcp.json` file declaring MCP server stubs for at minimum the following tools: `get_donation_by_id`, `list_donations_by_status`, `list_organizations`, and `get_impact_summary`.
3. THE `powers/nourishnet-community-food/` directory SHALL contain a `POWER.md` file describing the power's purpose, available tools, and example usage.
4. THE `plugin.json` SHALL include the keywords `nourishnet`, `food`, `donation`, `redistribution`, `impact` so that the power is activated when those topics appear in user messages.

---

### Requirement 28: Scaffolded Spec Directories for Future Specs

**User Story:** As a development team, I want placeholder spec directories for the five remaining NourishNet specs, so that future spec work can begin without structural setup.

#### Acceptance Criteria

1. THE `.kiro/specs/` directory SHALL contain spec directories for `nourishnet-donations`, `nourishnet-matching`, `nourishnet-pickup`, `nourishnet-impact`, and `nourishnet-moderation`.
2. EACH scaffolded spec directory SHALL contain a `requirements.md` file with a title, introduction, and a clearly marked placeholder section indicating the spec is pending.
3. EACH scaffolded spec directory SHALL contain a `.config.kiro` file with the appropriate `specId`, `workflowType` set to `requirements-first`, and `specType` set to `feature`.

---

### Requirement 29: AGENTS.md Root File

**User Story:** As a developer onboarding to NourishNet, I want an AGENTS.md file at the repository root that describes all custom agents and their intended use, so that I understand how to leverage AI assistance effectively.

#### Acceptance Criteria

1. THE Repository root SHALL contain an `AGENTS.md` file.
2. THE `AGENTS.md` file SHALL list all four custom agents (`product-reviewer`, `serverless-architect`, `property-test-engineer`, `social-impact-reviewer`) with a description of each agent's purpose and the tasks it is best suited to.
3. THE `AGENTS.md` file SHALL include a section describing the NourishNet Kiro Power and how to activate it.
4. THE `AGENTS.md` file SHALL include a section listing all four hooks with a description of when each hook fires and what action it takes.
