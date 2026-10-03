---
inclusion: always
---

# NourishNet — Product Steering

## Mission

NourishNet's mission is to turn surplus food into community meals. The platform connects surplus-food donors with verified community organisations and volunteers so that usable food is redistributed rather than discarded.

## The Four User Roles

| Role | Description |
|------|-------------|
| **Donor** | A business, restaurant, farm, or individual with surplus food to give away. Creates food listings and manages their donation history. |
| **Organization** | A verified community organisation (food bank, shelter, community kitchen) that discovers and claims food listings for its beneficiaries. |
| **Volunteer** | An individual who coordinates and executes the physical pickup and delivery of claimed food between Donor and Organisation. |
| **Admin** | A privileged operator who manages platform integrity, verifies Organisation accounts, resolves disputes, and monitors impact metrics. |

## Core Food Redistribution Workflow

```
DONOR creates listing
      │
      ▼
LISTING becomes visible to Organisations
      │
      ▼
ORGANIZATION discovers and claims listing
      │
      ▼
VOLUNTEER is assigned / self-selects for pickup
      │
      ▼
VOLUNTEER coordinates pickup with DONOR
      │
      ▼
Food is collected from DONOR
      │
      ▼
Food is delivered to ORGANIZATION
      │
      ▼
ORGANIZATION confirms receipt
      │
      ▼
Impact is recorded (weight, meals, carbon)
```

## Key Product Principles

1. **Food first** — every decision should reduce friction in getting food to people who need it.
2. **Trust through verification** — Organisations must be verified before claiming; this protects Donors and beneficiaries.
3. **Volunteer dignity** — Volunteers are community heroes, not couriers. The UX should reflect this.
4. **Transparency** — Donors, Organisations, and the public should be able to see aggregated impact data.
5. **Accessibility** — The platform must be usable on low-end mobile devices with limited connectivity.

## Listing Lifecycle States

`draft` → `available` → `claimed` → `in_transit` → `completed` | `cancelled` | `expired`

## Out of Scope (for all specs)

- Payment processing
- Cold-chain logistics management
- Direct messaging between users (use phone/email coordination for MVP)
