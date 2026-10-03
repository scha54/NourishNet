# Food Donation Domain

## Overview

This skill captures the core domain knowledge for the NourishNet food donation lifecycle: how a listing moves from creation to completion, who acts at each stage, and the invariants that keep redistribution safe and trustworthy. Use it when designing, reviewing, or testing any donation-related feature so that implementations stay faithful to the product model.

NourishNet's mission is to turn surplus food into community meals. Every rule below exists to reduce friction in getting usable food to people who need it, while protecting donors, beneficiaries, and volunteers through verification and clear state semantics.

---

## The Four User Roles

| Role | Description | Relationship to the lifecycle |
|------|-------------|-------------------------------|
| **Donor** | A business, restaurant, farm, or individual with surplus food to give away. | Creates and manages listings. Owns a listing while it is `draft`, publishes it to `available`, and coordinates handover during `in_transit`. |
| **Organization** | A verified community organisation (food bank, shelter, community kitchen). | Discovers `available` listings and **claims** them for its beneficiaries. Must be verified before claiming. Confirms receipt to drive a listing toward `completed`. |
| **Volunteer** | An individual who coordinates and executes the physical pickup and delivery. | Self-selects or is assigned once a listing is `claimed`, then collects from the Donor and delivers to the Organization during `in_transit`. |
| **Admin** | A privileged operator who manages platform integrity. | Verifies Organisation accounts (a precondition for claiming), resolves disputes, and may move a listing to `cancelled` or `expired` when integrity requires it. |

> Volunteers are community heroes, not couriers — the surrounding UX and language should reflect that dignity.

---

## Donation Lifecycle

A food donation listing moves through seven states:

```
draft → available → claimed → in_transit → completed
                                         ↘ cancelled
                                         ↘ expired
```

| State | Meaning |
|-------|---------|
| `draft` | Created by the Donor but not yet published. Not visible to Organisations. |
| `available` | Published and discoverable. Part of the **available pool** and eligible to be claimed. |
| `claimed` | A verified Organization has claimed the listing. It has left the available pool. |
| `in_transit` | A Volunteer has collected the food and is delivering it to the Organization. |
| `completed` | The Organization has confirmed receipt. Impact is recorded (weight, meals, carbon). Terminal state. |
| `cancelled` | The listing was withdrawn or voided before completion. Terminal state. |
| `expired` | The listing lapsed (e.g., food past safe use-by, or no claim in time). Terminal state. |

### Valid Transitions

| From | To | Trigger |
|------|----|---------|
| `draft` | `available` | Donor publishes the listing. |
| `draft` | `cancelled` | Donor discards an unpublished listing. |
| `available` | `claimed` | A verified Organization claims the listing. |
| `available` | `expired` | Listing lapses before any claim (time / safety). |
| `available` | `cancelled` | Donor withdraws, or Admin voids. |
| `claimed` | `in_transit` | A Volunteer collects the food from the Donor. |
| `claimed` | `cancelled` | Claim falls through (Donor, Organization, or Admin action). |
| `claimed` | `expired` | Food lapses before pickup. |
| `in_transit` | `completed` | Organization confirms receipt. |
| `in_transit` | `cancelled` | Delivery fails and the event is voided. |

`completed`, `cancelled`, and `expired` are **terminal** — no transitions leave them. Any transition not listed above is invalid and must be rejected.

---

## Food Categories

Every listing is tagged with exactly one category from this fixed enum:

| Value | Description |
|-------|-------------|
| `produce` | Fruit and vegetables |
| `bakery` | Bread, pastries |
| `dairy` | Milk, cheese, yoghurt |
| `prepared` | Cooked or prepared meals |
| `dry_goods` | Pasta, rice, tinned goods |
| `frozen` | Frozen food |
| `beverages` | Drinks |
| `other` | Uncategorised |

The enum is defined as `FoodCategory` in `backend/src/domain/types.ts`. Validation schemas must use an explicit allowlist (`z.enum([...])`) — never accept arbitrary category strings.

---

## Claim Semantics

- Only **Organizations** can claim listings, and only listings in the `available` state.
- An Organization must be **verified by an Admin** before it is permitted to claim. Verification is the trust gate that protects Donors and beneficiaries.
- Claiming transitions a listing `available → claimed` and removes it from the available pool.
- Donors, Volunteers, and unverified Organizations cannot claim. Role is read from the authoritative `cognito:groups` claim, never from request input.

### Claim-Uniqueness Invariant

> A listing can be claimed by **at most one** Organization.

Once a listing is claimed it leaves the available pool and is no longer offered to other Organisations. There is no concurrent or partial claiming:

- A second claim attempt on an already-`claimed` listing must fail.
- A claim attempt on a listing that is not `available` (e.g., `draft`, `in_transit`, or any terminal state) must fail.
- This invariant must hold under concurrency — enforce it with a conditional write (e.g., only transition when the current status is still `available`).

This invariant is a high-value property-based testing target: for any sequence of claim attempts, the number of successful claims on a single listing is never greater than one.

---

## When to Use This Skill

- Designing or reviewing the donation listing workflow end to end.
- Evaluating state machine transitions for correctness and completeness.
- Checking role permissions and the verification gate against the product model.
- Writing or reviewing acceptance criteria and property tests for donation features.

## Related

- `powers/nourishnet-community-food/skills/impact-metrics/SKILL.md` — what gets recorded when a listing reaches `completed`.
- `.kiro/steering/product.md` — the four roles and the core redistribution workflow.
- `backend/src/domain/types.ts` — `DonationStatus`, `FoodCategory`, and `UserRole` definitions.
