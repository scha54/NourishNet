# Requirements Document

**NourishNet Pickup**

## Introduction

**Spec 4 — Pickup Workflow**

This spec covers the volunteer pickup workflow: pickup assignment to a volunteer, volunteer acceptance, food collection from the donor, delivery to the organisation, and the complete status history recorded at each transition.

This spec depends on Spec 1 (Foundation), Spec 2 (Donation Lifecycle), and Spec 3 (Matching and Claiming) being complete.

---

## Requirements

<!-- PENDING -->

> **Status: PENDING**
>
> Requirements for Spec 4 have not yet been written.
> This directory is scaffolded to receive requirements when Spec 3 is complete and reviewed.
>
> Planned requirements areas:
> - Pickup assignment (CLAIMED donation → volunteer assigned → PICKUP_ASSIGNED)
> - Volunteer dashboard (view assigned pickups, pickup details, donor contact)
> - Volunteer acceptance (PICKUP_ASSIGNED → ACCEPTED)
> - Collection confirmation (ACCEPTED → COLLECTED, record actualWeightKg and collectedAt)
> - Delivery confirmation (COLLECTED → DELIVERED, record deliveredAt, trigger REPORT creation)
> - Pickup cancellation (ASSIGNED or ACCEPTED → CANCELLED, donation returns to AVAILABLE or re-assigns)
> - Status history (each transition records timestamp, actorId, previousStatus, newStatus)
> - No invalid backwards transitions permitted
> - Property-based tests: transition validity invariants

