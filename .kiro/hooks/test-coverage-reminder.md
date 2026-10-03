---
name: Test Coverage Reminder
description: Checks whether a corresponding property-based test exists for edited domain functions.
eventType: fileEdited
filePatterns: backend/src/domain/**/*.ts
hookAction: askAgent
---

# Test Coverage Reminder

When a file matching `backend/src/domain/**/*.ts` is edited, check whether adequate test coverage exists for the changed functions.

## Steps

1. **Identify changed functions** — list all exported functions that were added or modified in the edited file.

2. **Check for property-based tests** — for each changed function, search `tests/properties/` for a test file that imports and exercises it. A file named `<module-name>.property.test.ts` is the expected convention.

3. **Check for unit tests** — search `tests/unit/` for a corresponding unit test file named `<module-name>.test.ts`.

4. **Assess PBT suitability** — for each changed function, determine whether it is a good candidate for property-based testing using these criteria:
   - Does the function's behaviour vary meaningfully with input?
   - Is it a pure function (no I/O, no AWS SDK)?
   - Would 100 randomised inputs find more bugs than 2–3 examples?

## Output

For each changed function:
- If a property test exists: confirm with one line.
- If no property test exists and the function is PBT-suitable: suggest the property to test (invariant, round-trip, idempotence, or metamorphic) and provide a starter `fc.property` skeleton.
- If no property test exists but the function is not PBT-suitable: suggest a unit test example instead and explain why PBT is not the right tool here.
