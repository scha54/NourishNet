# NourishNet — Impact Model

NourishNet measures social impact so that donors, community organisations, volunteers, funders, and the public can see the real-world outcome of redistributing surplus food instead of discarding it. This document defines the metrics NourishNet reports, the constants and formulas used to derive them, and the ethical constraints that govern how impact data is produced and shared.

All derived metrics are computed at write time from the centralised constants in [`backend/src/domain/impact-constants.ts`](../backend/src/domain/impact-constants.ts). Values are never hardcoded inline, and this document must be updated whenever a formula or constant changes.

---

## Impact Metrics

NourishNet tracks three primary impact metrics. Each is derived from a confirmed food weight (in kilograms) recorded on a `REPORT` entity after an organisation confirms receipt of a redistributed donation.

| Metric | Formula | Unit | Type | Assumptions | Source |
|--------|---------|------|------|-------------|--------|
| Food weight redirected | `confirmedWeightKg` (measured directly) | kg | Measured | Weight is confirmed by the receiving organisation at delivery, not estimated at listing time. | Confirmed at point of receipt |
| Meals redistributed | `confirmedWeightKg × MEALS_PER_KG` | meals | Derived (estimated) | 1 kg of redistributed food yields approximately 2.5 average meals. Assumes mixed food categories; does not adjust per category. | WRAP UK food waste guidance (2019) |
| Carbon equivalent saved | `confirmedWeightKg × CARBON_PER_KG_FOOD_WASTE` | kg CO₂e | Derived (estimated) | Represents CO₂-equivalent emissions avoided by diverting food from landfill. Does not account for transport emissions from pickup/delivery. | WRAP UK / IPCC AR6 (2022) estimates |

### Metric Classification

- **Measured** metrics are recorded directly from a confirmed real-world observation (the weight an organisation confirms on receipt). These are the most reliable and form the basis of all derived metrics.
- **Derived (estimated)** metrics are calculated from a measured value using a documented constant. They are estimates and must always be presented as such in public-facing reports — never as exact counts.

---

## Constants

The following constants are the single source of truth for all impact calculations. They are defined in [`backend/src/domain/impact-constants.ts`](../backend/src/domain/impact-constants.ts) and must never be duplicated or hardcoded elsewhere.

| Constant | Value | Unit | Source |
|----------|-------|------|--------|
| `MEALS_PER_KG` | `2.5` | meals per kg | WRAP UK — "Quantification of food surplus, waste and related measures across the food supply chain" (2019). <https://wrap.org.uk/resources/report/quantification-food-surplus-waste> |
| `CARBON_PER_KG_FOOD_WASTE` | `2.5` | kg CO₂e per kg | WRAP UK / IPCC AR6 — "Climate Change 2022: Mitigation of Climate Change", Chapter 12 (Agriculture, Forestry and Other Land Use). |

### Calculation Formulas

```
foodWeightRedirectedKg = confirmedWeightKg
mealsEquivalent        = confirmedWeightKg × MEALS_PER_KG
carbonSavedKgCo2e      = confirmedWeightKg × CARBON_PER_KG_FOOD_WASTE
```

Both derived metrics are non-negative for any non-negative input weight, and identical inputs always produce identical outputs (referential transparency). These invariants are validated by the property-based tests in [`tests/properties/impact-constants.property.test.ts`](../tests/properties/impact-constants.property.test.ts).

---

## Required Impact Fields per Entity

Every completed redistribution event must produce the following impact data so that metrics can be derived credibly.

### DONATION (written at listing time)

| Field | Required | Notes |
|-------|----------|-------|
| `weightKg` | Yes | Estimated weight at listing time |
| `foodCategory` | Yes | One of the documented food categories |
| `donorId` | Yes | Cognito `userId` of the Donor |

### PICKUP (written at completion)

| Field | Required | Notes |
|-------|----------|-------|
| `actualWeightKg` | Yes | Confirmed weight at pickup |
| `volunteerId` | Yes | Cognito `userId` of the Volunteer |
| `collectedAt` | Yes | ISO-8601 datetime |
| `deliveredAt` | Yes | ISO-8601 datetime |

### REPORT (written after the organisation confirms receipt)

| Field | Required | Notes |
|-------|----------|-------|
| `organizationId` | Yes | Cognito `userId` of the Organization |
| `donationId` | Yes | Linked donation |
| `pickupId` | Yes | Linked pickup |
| `confirmedWeightKg` | Yes | Weight confirmed by the organisation (basis for derived metrics) |
| `mealsEquivalent` | Yes (derived) | `confirmedWeightKg × MEALS_PER_KG` |
| `carbonSavedKgCo2e` | Yes (derived) | `confirmedWeightKg × CARBON_PER_KG_FOOD_WASTE` |
| `redistributedAt` | Yes | ISO-8601 datetime of delivery confirmation |

A redistribution event cannot be marked `completed` without a corresponding `REPORT` entity containing all required fields.

---

## Ethical Guidelines

Impact reporting carries a responsibility to funders, partners, and the communities NourishNet serves. The following constraints are mandatory.

### No fabrication

- Impact data must never be fabricated, inflated, or estimated beyond the documented formulas and constants.
- Derived metrics must be computed only from measured, confirmed weights — never from projected or hoped-for values.
- Metrics labelled as estimates (meals, carbon) must always be presented as estimates in public-facing reports, never as exact counts.
- Any change to a constant or formula requires updating this document and the centralised constants file in the same change set, with the source citation recorded.

### No PII in aggregates

- Aggregated and public-facing impact reports must not expose individual donor or organisation identities, email addresses, names, phone numbers, or any other personally identifiable information.
- Internal records use the Cognito `userId` (a UUID) as the identifier; aggregate reports report totals only, never per-individual breakdowns that could re-identify a donor or organisation.
- CloudWatch logs related to impact events must not contain PII.

### No gamification of food safety

- The platform must not gamify impact in ways that incentivise unsafe practices — for example, redistributing food past safe use-by dates to inflate weight or meal counts.
- Impact leaderboards, badges, or similar mechanics must never reward volume at the expense of food safety or beneficiary dignity.
- Reducing friction in getting safe food to people who need it always takes priority over maximising a reported metric.

---

## References

- WRAP UK — *Quantification of food surplus, waste and related measures across the food supply chain* (2019). <https://wrap.org.uk/resources/report/quantification-food-surplus-waste>
- IPCC — *Climate Change 2022: Mitigation of Climate Change* (AR6), Chapter 12: Agriculture, Forestry and Other Land Use (AFOLU).
