---
inclusion: always
---

# NourishNet — Security Steering

## Cognito Token Validation

- Every non-public API endpoint MUST be protected by the API Gateway Cognito Authorizer.
- Lambda handlers MUST NOT re-validate the JWT manually — API Gateway handles this before invocation.
- To extract the caller's identity inside a handler, read from `event.requestContext.authorizer.jwt.claims`, never from a header value.
- The `cognito:groups` claim is the authoritative source for role — never trust a role value passed in the request body or query string.
- Tokens must be transmitted only over HTTPS — never log token values.

## Least-Privilege IAM

Every Lambda function must have its own IAM role with only the permissions it needs:

```
# Health check Lambda — no DynamoDB needed (or read-only on a specific table)
dynamodb:DescribeTable on arn:aws:dynamodb:<region>:<account>:table/NourishNetTable-<env>

# Read Lambda
dynamodb:GetItem, dynamodb:Query on specific table ARN + GSI ARNs

# Write Lambda
dynamodb:PutItem, dynamodb:UpdateItem on specific table ARN only

# Admin Lambda
dynamodb:DeleteItem (only where business logic requires deletion)
```

**Forbidden IAM patterns:**
- `"Action": "*"` — never use wildcard actions
- `"Resource": "*"` — never use wildcard resources
- Inline policies on the CDK stack construct — use managed policies attached to the role
- Sharing a single execution role across multiple Lambda functions

## Input Sanitisation

- All request bodies must be validated with a Zod schema in `backend/src/validation/` before any business logic runs.
- Zod schemas must use `.strict()` to reject unknown properties.
- String fields must have explicit `.min()` and `.max()` length constraints.
- Numeric fields must have explicit `.min()` and `.max()` bounds.
- Enum fields must use `z.enum([...])` with an explicit allowlist.
- DynamoDB key values must be constructed by the repository layer — never pass raw user input as a DynamoDB key.

## Secrets Management

- No secrets, credentials, API keys, or connection strings may appear in source code.
- No secrets may appear in CDK source — use AWS Systems Manager Parameter Store or AWS Secrets Manager, referenced by ARN.
- Environment variables in Lambda are acceptable for non-sensitive configuration (table names, user pool IDs) but not for credentials.
- The `.gitignore` must exclude `.env*` files at the root level.

## Frontend Security

- Tokens (access_token, refresh_token) must be stored in memory only — never in `localStorage` or `sessionStorage`.
- The Cognito client secret must not exist (public client configuration) — never expose it in frontend code.
- Content Security Policy headers should be configured in the Amplify Hosting rewrite rules.
- All API calls must use HTTPS — the frontend API client must not permit HTTP endpoints.

## Dependency Security

- Run `npm audit` as part of CI to detect known vulnerabilities.
- Pin dependency versions — avoid open ranges (`^`, `~`) in `package.json` for production dependencies.
- Review new third-party dependencies before adding them — prefer AWS SDK v3 modular packages.

## Data Privacy

- Do not log email addresses, names, phone numbers, or any PII in CloudWatch logs.
- Use `userId` (a UUID from Cognito) as the identifier in all log entries.
- The impact measurement model aggregates data — individual donor/organization identities must not appear in public-facing impact reports.
