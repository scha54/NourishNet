---
name: Security Review
description: Checks backend and infra files for hardcoded secrets, overly-broad IAM policies, and missing input validation after any edit.
eventType: fileEdited
filePatterns: backend/src/**/*.ts,infra/lib/**/*.ts
hookAction: askAgent
---

# Security Review

When a file matching `backend/src/**/*.ts` or `infra/lib/**/*.ts` is edited, perform the following security checks:

## Secrets and Credentials
1. Scan for hardcoded strings that resemble secrets: AWS access key patterns (`AKIA...`), base64-encoded blobs, connection strings, API keys, or any variable named `secret`, `password`, `token`, `key`, or `credential` assigned a string literal.
2. Flag any use of `process.env` values that are being used as credentials (rather than configuration like table names or user pool IDs).

## IAM Policy Review (infra files only)
1. Flag any IAM policy statement with `actions: ['*']` or `resources: ['*']`.
2. Flag any Lambda function that is not assigned its own dedicated IAM execution role.
3. Flag any IAM role that grants `dynamodb:DeleteItem` without a comment justifying the need.
4. Verify that Lambda execution roles use `addToRolePolicy` with specific actions and specific resource ARNs, not managed policies like `AmazonDynamoDBFullAccess`.

## Input Validation (handler files only)
1. Verify that every handler that reads from `event.body` parses and validates the body with a Zod schema before passing data to domain or repository functions.
2. Flag any handler that passes `event.pathParameters` or `event.queryStringParameters` values directly to a DynamoDB key or repository call without validation.
3. Flag any Zod schema that uses `.passthrough()` instead of `.strict()`.

If violations are found, report each one with file path, line number, severity (HIGH/MEDIUM/LOW), and a suggested fix. If no violations are found, confirm in one line.
