---
name: Impact Data Integrity
description: Verifies that repository write operations include all fields required by the NourishNet social impact measurement model.
eventType: fileEdited
filePatterns: backend/src/repositories/**/*.ts
hookAction: askAgent
---

# Impact Data Integrity

When a file matching `backend/src/repositories/**/*.ts` is edited, verify that write operations (PutItem, UpdateItem) include all fields required by the social impact measurement model defined in `.kiro/steering/social-impact.md`.

## Checks by Entity Type

### DONATION writes
Verify the item being written includes:
- `weightKg` (number, required)
- `foodCategory` (one of: `produce`, `bakery`, `dairy`, `prepared`, `dry_goods`, `frozen`, `beverages`, `other`)
- `donorId` (string, required)

### PICKUP writes
Verify the item being written includes (at completion/update):
- `actualWeightKg` (number, required)
- `volunteerId` (string, required)
- `collectedAt` (ISO-8601 string, required)
- `deliveredAt` (ISO-8601 string, required)

### REPORT writes
Verify the item being written includes:
- `organizationId` (string, required)
- `donationId` (string, required)
- `pickupId` (string, required)
- `confirmedWeightKg` (number, required)
- `mealsEquivalent` (number, required — must be derived, not hardcoded)
- `carbonSavedKgCo2e` (number, required — must be derived, not hardcoded)
- `redistributedAt` (ISO-8601 string, required)

## Derived Metric Verification
For REPORT writes, verify that `mealsEquivalent` and `carbonSavedKgCo2e` are computed using the constants from `backend/src/domain/impact-constants.ts` (`MEALS_PER_KG` and `CARBON_PER_KG_FOOD_WASTE`), not hardcoded numeric literals like `2.5`.

## Output
Report any missing or incorrectly typed fields with the file path, line number, and the specific field that is absent. If all required fields are present and derived metrics use the centralised constants, confirm compliance in one line.
