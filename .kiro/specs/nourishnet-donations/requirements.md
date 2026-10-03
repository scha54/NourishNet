# Requirements Document

**NourishNet Donations**

## Introduction

**Spec 2 — Donation Lifecycle**

This spec covers the complete donation lifecycle for NourishNet: creating surplus food listings, updating them, listing and viewing donations, donor-initiated cancellation, system-driven expiry, and the full donation state machine.

This spec depends on the Foundation Spec (Spec 1) being complete. Authentication, database, API skeleton, and frontend shell must be in place before implementing donation features.

---

## Requirements

<!-- PENDING -->

> **Status: PENDING**
>
> Requirements for Spec 2 have not yet been written.
> This directory is scaffolded to receive requirements when the Foundation Spec is complete and reviewed.
>
> Planned requirements areas:
> - Donation creation (all required fields, validation, initial status = AVAILABLE)
> - Donation update (donor can edit DRAFT and AVAILABLE donations)
> - Donation listing (paginated, filterable by status, category, location)
> - Donation detail view (full field set, claim status, pickup info)
> - Donor cancellation (AVAILABLE → CANCELLED, CLAIMED → CANCELLED with notification)
> - System expiry (AVAILABLE → EXPIRED when expiresAt is passed)
> - State machine enforcement (all valid transitions, all invalid rejections)
> - Property-based tests for state machine invariants

