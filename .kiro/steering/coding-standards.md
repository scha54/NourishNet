---
inclusion: always
---

# NourishNet — Coding Standards Steering

## TypeScript

- **Strict mode is non-negotiable.** All workspaces extend `tsconfig.base.json` which enables `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- Never use `any`. Use `unknown` and narrow with type guards.
- Prefer `type` aliases for unions and intersections; use `interface` for object shapes that may be extended.
- All exported functions must have explicit return types.
- Use `const` by default; only use `let` when reassignment is genuinely required.
- No `var`.

## Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Files (source) | kebab-case | `donation-repository.ts` |
| Files (React components) | PascalCase | `DonationCard.tsx` |
| Variables and functions | camelCase | `getDonationById` |
| Classes and interfaces | PascalCase | `DonationRepository` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_WEIGHT_KG` |
| DynamoDB key prefixes | SCREAMING_SNAKE_CASE | `DONATION#`, `USER#` |
| Zod schemas | camelCase + `Schema` suffix | `createDonationSchema` |
| React components | PascalCase | `DonationListPage` |
| React hooks | camelCase + `use` prefix | `useCurrentUser` |
| CDK constructs | PascalCase | `NourishNetFoundationStack` |
| Environment variables | SCREAMING_SNAKE_CASE | `DYNAMODB_TABLE_NAME` |

## Error Handling Patterns

### Lambda Handlers

Every Lambda handler must use a try/catch at the top level:

```typescript
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // ... business logic
    return successResponse(data);
  } catch (error) {
    logger.error({ error }, 'Unhandled error in handler');
    if (error instanceof ValidationError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message);
    }
    if (error instanceof NotFoundError) {
      return errorResponse(404, 'NOT_FOUND', error.message);
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
};
```

### Domain Errors

Define typed domain errors in `backend/src/domain/errors.ts`:

```typescript
export class ValidationError extends Error { constructor(message: string) { super(message); this.name = 'ValidationError'; } }
export class NotFoundError extends Error { constructor(message: string) { super(message); this.name = 'NotFoundError'; } }
export class AuthorizationError extends Error { constructor(message: string) { super(message); this.name = 'AuthorizationError'; } }
```

Never throw raw `Error` objects from domain or repository code — use typed errors.

## API Response Envelope

All Lambda handlers must return responses in this shape:

```typescript
// Success (2xx)
{ "data": <payload> }

// Error (4xx / 5xx)
{ "error": { "code": "SCREAMING_SNAKE_CASE", "message": "Human-readable string", "details"?: Record<string, unknown> } }
```

Use the shared helper functions in `backend/src/domain/response.ts`:

```typescript
successResponse(data: unknown, statusCode = 200)
errorResponse(statusCode: number, code: string, message: string, details?: Record<string, unknown>)
```

Never return raw strings or unstructured objects from handlers.

## Logging

- Use structured JSON logging in all Lambda functions.
- Every log entry must include: `requestId`, `route`, `level`, and `timestamp`.
- Do not log personally identifiable information (email addresses, names) in production.
- Log levels: `debug` (local only), `info` (operational events), `warn` (recoverable issues), `error` (failures requiring attention).

## Imports

- Use absolute imports via path aliases defined in `tsconfig.json` — no relative `../../../` chains longer than two levels.
- Import order: external packages → internal workspace packages → relative imports. Leave a blank line between groups.
- Never import from `@aws-sdk` inside `backend/src/domain/` — this layer must remain pure.

## React Component Patterns

- Functional components only — no class components.
- Co-locate component styles, tests, and stories in the same directory as the component.
- Extract custom hooks for any stateful or async logic used by more than one component.
- Use TanStack Query `useQuery` / `useMutation` for all server state; do not use `useState` + `useEffect` for data fetching.

## Commit Hygiene

- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- Each commit should be atomic — one logical change per commit.
