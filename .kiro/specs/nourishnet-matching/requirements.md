# Requirements Document

**NourishNet Matching**

## Introduction

**Spec 3 — Matching and Claiming**

This spec covers donation discovery by community organisations, deterministic matching score calculation, list filtering, and the critical atomic claiming operation that prevents duplicate claims.

This spec depends on Spec 1 (Foundation) and Spec 2 (Donation Lifecycle) being complete.

---

## Requirements

<!-- PENDING -->

> **Status: PENDING**
>
> Requirements for Spec 3 have not yet been written.
> This directory is scaffolded to receive requirements when Spec 2 is complete and reviewed.
>
> Planned requirements areas:
> - Organisation browsing interface (list available donations)
> - Filtering (by category, vegetarian flag, approximate distance, quantity, pickup window)
> - Deterministic matching score: `score = distanceScore*0.35 + urgencyScore*0.30 + quantityScore*0.20 + categoryScore*0.15`
> - Score always in [0, 1]; same inputs always produce same score
> - Match reasons returned alongside score (e.g., "nearby", "pickup deadline soon")
> - Atomic claiming via DynamoDB conditional update (status=AVAILABLE condition)
> - Race condition handling: second claim attempt returns DONATION_ALREADY_CLAIMED error
> - Property-based tests: score bounds, determinism, claim uniqueness invariant

