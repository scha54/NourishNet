# Impact Metrics

## Overview

This skill defines the NourishNet social impact measurement model: the metrics the platform reports, how they are calculated, where the constants live, which values are measured versus derived, the impact fields each entity must carry, and the ethical guardrails that keep reported impact credible. Use it whenever you implement, review, or test impact calculations and the records that back them.

NourishNet reports impact to funders, partners, and the public. The numbers must be defensible — every figure traces back to a confirmed weight and a documented formula.

---

## The Three Metrics

| Metric | Definition | Unit |
|--------|-----------|------|
| **Meals redistributed** | Estimated number of meals derived from redistributed food weight. | meals |
| **Food weight redirected** | Total weight of food redistributed instead of being discarded. | kilograms |
| **Carbon equivalent saved** | Estimated CO₂-equivalent emissions avoided by not sending food to landfill. | kg CO₂e |

---

## Calculation Formulas

```
meals                = weightKg × MEALS_PER_KG
carbonSavedKgCo2e    = weightKg × CARBON_PER_KG_FOOD_WASTE
```

Both metrics are a linear function of a confirmed weight in kilograms. There is no other arithmetic — nothing is rounded up, padded, or adjusted beyond these formulas.

---

## Centralised Constants

The multipliers are defined once in `backend/src/domain/impact-constants.ts` and **must never be hardcoded inline** anywhere else in the codebase.

| Constant | Value | Source |
|----------|-------|--------|
| `MEALS_PER_KG` | `2.5` | WRAP UK food waste guidance (2.5 meals per kilogram). |
| `CARBON_PER_KG_FOOD_WASTE` | `2.5` | WRAP UK / IPCC estimates (2.5 kg CO₂e per kilogram of food waste). |

**Citations** (also recorded in `docs/impact-model.md`):

- WRAP UK — *"Quantification of food surplus, waste and related measures across the food supply chain"* (2019).
- IPCC AR6 — *"Climate Change 2022: Mitigation of Climate Change"*, Chapter 12 (Agriculture, Forestry and Other Land Use).

Rules:

- Import the constants from `backend/src/domain/impact-constants.ts`; do not re-declare `2.5` as a literal in domain, repository, or handler code.
- Whenever a constant value or formula changes, update `docs/impact-model.md` in the same change.

---

## Metric Classification: Measured vs. Derived

| Value | Classification | Where it comes from |
|-------|---------------|---------------------|
| `weightKg` (listing estimate) | **Measured** | Entered by the Donor at listing time (estimate). |
| `actualWeightKg` (pickup) | **Measured** | Confirmed by the Volunteer at collection. |
| `confirmedWeightKg` (report) | **Measured** | Confirmed by the Organization on receipt — the authoritative weight for reporting. |
| `mealsEquivalent` | **Derived** | `confirmedWeightKg × MEALS_PER_KG`. |
| `carbonSavedKgCo2e` | **Derived** | `confirmedWeightKg × CARBON_PER_KG_FOOD_WASTE`. |

Measured values are inputs captured by a person. Derived values are computed at write time from a measured weight and the centralised constants — they are never entered by hand and never stored without being recomputed from their source weight.

---

## Required Impact Fields per Entity

### DONATION (written at creation and update)

```typescript
{
  weightKg: number;           // Required — estimated weight at listing time (measured)
  foodCategory: FoodCategory; // Required — see the food category enum
  donorId: string;            // Required — Cognito userId of the Donor
}
```

### PICKUP (written at completion)

```typescript
{
  actualWeightKg: number;     // Required — confirmed weight at pickup (measured)
  volunteerId: string;        // Required — Cognito userId of the Volunteer
  collectedAt: string;        // Required — ISO-8601 datetime
  deliveredAt: string;        // Required — ISO-8601 datetime
}
```

### REPORT (written after the Organization confirms receipt)

```typescript
{
  organizationId: string;     // Required — Cognito userId of the Organization
  donationId: string;         // Required — linked donation
  pickupId: string;           // Required — linked pickup
  confirmedWeightKg: number;  // Required — weight confirmed by the Organization (measured)
  mealsEquivalent: number;    // Derived — confirmedWeightKg × MEALS_PER_KG
  carbonSavedKgCo2e: number;  // Derived — confirmedWeightKg × CARBON_PER_KG_FOOD_WASTE
  redistributedAt: string;    // Required — ISO-8601 datetime of delivery confirmation
}
```

A redistribution event cannot be marked `completed` without a corresponding `REPORT` entity whose required fields are all populated and whose derived metrics were computed from the centralised constants.

---

## Responsible Reporting Guidelines

- **No fabrication beyond the documented formulas.** Impact figures are only ever `weight × constant`. Do not estimate, extrapolate, or inflate beyond what a confirmed weight and the published constants produce.
- **No PII in aggregates.** Individual donor and organisation identities must never appear in aggregated or public-facing impact reports. Aggregate on `userId` only internally; strip identity from anything published.
- **No gamification of food safety.** Never design incentives that reward higher metrics in ways that could encourage redistributing food past safe use-by dates or cutting safety corners to inflate numbers.
- **Derived from the authoritative weight.** Report metrics are derived from `confirmedWeightKg` (the Organization's confirmation), not the Donor's initial estimate.

---

## When to Use This Skill

- Implementing or reviewing impact calculation logic in `backend/src/domain/impact.ts`.
- Auditing REPORT entity writes for completeness and correct derivation.
- Reviewing `docs/impact-model.md` for accuracy against the code.
- Checking that derived metrics come from centralised constants, not inline literals.

## Related

- `backend/src/domain/impact-constants.ts` — the single source of truth for `MEALS_PER_KG` and `CARBON_PER_KG_FOOD_WASTE`.
- `.kiro/steering/social-impact.md` — the impact model, evidence requirements, and ethical constraints.
- `powers/nourishnet-community-food/skills/food-donation-domain/SKILL.md` — the lifecycle that produces a REPORT.
