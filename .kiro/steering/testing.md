---
inclusion: always
---

# NourishNet — Testing Steering

## Test Stack

| Layer | Tool | Location |
|-------|------|----------|
| Unit tests | Vitest | `tests/unit/` |
| Property-based tests | Vitest + fast-check | `tests/properties/` |
| Integration tests | Vitest | `tests/integration/` |

Run all tests from the repository root with `npm test`.
Run a single pass (no watch mode) with `npm test -- --run`.
Generate coverage with `npm test -- --coverage`.

## When to Use Property-Based Tests

Use fast-check property-based tests when **all three** of the following are true:

1. The behaviour varies meaningfully with input (different inputs → different code paths).
2. You are testing **your own code**, not an external service or AWS SDK behaviour.
3. 100 randomised iterations would find more bugs than 2–3 hand-crafted examples.

### High-value PBT targets in NourishNet

- Response envelope serialiser/deserialiser (round-trip property)
- DynamoDB key builder functions (`buildDonationKey`, `buildUserKey`, etc.)
- Listing lifecycle state machine transitions (valid transitions always preserve invariants)
- Weight/meal calculation functions in `domain/impact.ts`
- Input validation schemas — generate arbitrary invalid inputs and verify they always produce `VALIDATION_ERROR`
- Date/time utilities — round-trip between ISO-8601 strings and Date objects

### When to use integration tests instead

- Testing that a Lambda handler correctly wires up validation → domain → repository
- Testing that API Gateway routes and authorisers are configured correctly
- Testing DynamoDB read/write against a real or local table (DynamoDB Local)
- Testing Cognito sign-up/sign-in flows (use 1–3 representative examples)
- Any test requiring live AWS service calls

## fast-check Usage Pattern

```typescript
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { buildSuccessEnvelope, buildErrorEnvelope } from '../../backend/src/domain/response';

describe('Response envelope — round-trip property', () => {
  it('success envelope round-trips arbitrary JSON-serialisable data', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (data) => {
        const envelope = buildSuccessEnvelope(data);
        const parsed = JSON.parse(JSON.stringify(envelope));
        expect(parsed.data).toStrictEqual(data);
      }),
    );
  });
});
```

Key fast-check arbitraries for NourishNet domain types:

```typescript
// Donation status
fc.constantFrom('draft', 'available', 'claimed', 'in_transit', 'completed', 'cancelled', 'expired')

// User role
fc.constantFrom('Donor', 'Organization', 'Volunteer', 'Admin')

// Weight in kg (positive, bounded)
fc.float({ min: 0.1, max: 10_000, noNaN: true, noDefaultInfinity: true })

// UUID
fc.uuid()

// ISO-8601 datetime
fc.date().map(d => d.toISOString())
```

## Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

Coverage thresholds apply to `backend/src/domain/` and `backend/src/validation/`. They do not apply to `infra/` or generated CDK code.

## Test File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `*.test.ts` | `donation-key-builder.test.ts` |
| Property test | `*.property.test.ts` | `response-envelope.property.test.ts` |
| Integration test | `*.integration.test.ts` | `health-handler.integration.test.ts` |
| React component test | `*.test.tsx` | `DonationCard.test.tsx` |

## Test Organisation Rules

- Each test file tests exactly one module or one acceptance criterion.
- Property tests must use `fc.assert` with at least 100 runs (fast-check default).
- Use `fc.pre` for preconditions rather than filtering in the property body.
- Name each `fc.property` with a human-readable description of the property being tested.
- Never use `Math.random()` in tests — use fast-check arbitraries or Vitest `vi.spyOn`.
