---
inclusion: always
---

# NourishNet — Social Impact Steering

## Mission Alignment

Every engineering decision should be evaluated against NourishNet's core social mission: reducing food waste and increasing food security in underserved communities. Features that do not serve this mission require explicit justification.

## Impact Measurement Model

NourishNet tracks social impact through three primary metrics:

| Metric | Definition | Unit |
|--------|-----------|------|
| **Meals redistributed** | Estimated number of meals derived from redistributed food weight | meals |
| **Food weight redirected** | Total weight of food redistributed instead of being discarded | kilograms |
| **Carbon equivalent saved** | Estimated CO₂-equivalent emissions avoided by not sending food to landfill | kg CO₂e |

### Calculation Formulas

```
meals = weight_kg × MEALS_PER_KG
carbon_saved_kg_co2e = weight_kg × CARBON_PER_KG_FOOD_WASTE
```

**Constants (documented in `docs/impact-model.md`):**

| Constant | Value | Source |
|----------|-------|--------|
| `MEALS_PER_KG` | 2.5 | WRAP UK food waste guidance |
| `CARBON_PER_KG_FOOD_WASTE` | 2.5 | WRAP UK / IPCC estimates |

These constants must be centralised in `backend/src/domain/impact-constants.ts` and never hardcoded inline.

## Required Impact Fields per Entity

### DONATION entity (written at creation and update)

```typescript
{
  weightKg: number;          // Required — estimated weight at listing time
  foodCategory: FoodCategory; // Required — see enum below
  donorId: string;           // Required — Cognito userId of Donor
}
```

### PICKUP entity (written at completion)

```typescript
{
  actualWeightKg: number;    // Required — confirmed weight at pickup
  volunteerId: string;       // Required — Cognito userId of Volunteer
  collectedAt: string;       // Required — ISO-8601 datetime
  deliveredAt: string;       // Required — ISO-8601 datetime
}
```

### REPORT entity (written after Organization confirms receipt)

```typescript
{
  organizationId: string;    // Required — Cognito userId of Organization
  donationId: string;        // Required — linked donation
  pickupId: string;          // Required — linked pickup
  confirmedWeightKg: number; // Required — weight confirmed by Organization
  mealsEquivalent: number;   // Derived — calculated from confirmedWeightKg
  carbonSavedKgCo2e: number; // Derived — calculated from confirmedWeightKg
  redistributedAt: string;   // Required — ISO-8601 datetime of delivery confirmation
}
```

## Food Category Enum

```typescript
type FoodCategory =
  | 'produce'       // Fruit and vegetables
  | 'bakery'        // Bread, pastries
  | 'dairy'         // Milk, cheese, yoghurt
  | 'prepared'      // Cooked or prepared meals
  | 'dry_goods'     // Pasta, rice, tinned goods
  | 'frozen'        // Frozen food
  | 'beverages'     // Drinks
  | 'other';        // Uncategorised
```

## Evidence Requirements

For NourishNet to report impact credibly to funders and partners, every completed redistribution event must produce:

1. A `REPORT` entity in DynamoDB with all required fields populated.
2. Derived metrics (`mealsEquivalent`, `carbonSavedKgCo2e`) calculated at write time using the centralised constants.
3. A CloudWatch metric `FoodRedistributedKg` emitted after each successful `REPORT` write.

## Social Impact Reviewer Responsibilities

The `social-impact-reviewer` agent must check:

- Every repository write to `DONATION`, `PICKUP`, or `REPORT` entities includes the required impact fields listed above.
- Derived metrics are computed from the centralised constants, not hardcoded values.
- No redistribution event can be marked `completed` without a corresponding `REPORT` entity.
- The `docs/impact-model.md` is updated whenever calculation formulas or constants change.

## Ethical Constraints

- Impact data must never be fabricated or estimated beyond the documented formulas.
- Individual donor and organisation identities must not appear in aggregated public reports.
- The platform must not gamify impact in ways that incentivise poor food safety practices (e.g., redistributing food past safe use-by dates to inflate metrics).
