# Requirements Document

**NourishNet Moderation**

## Introduction

**Spec 6 — Moderation**

This spec covers the platform moderation system: users reporting donations for admin review, the admin moderation dashboard, and the report resolution workflow (resolve or dismiss).

This spec depends on Specs 1–4 being complete. Moderation operates on existing donation, user, and pickup entities.

---

## Requirements

<!-- PENDING -->

> **Status: PENDING**
>
> Requirements for Spec 6 have not yet been written.
> This directory is scaffolded to receive requirements when Specs 1–4 are complete and reviewed.
>
> Planned requirements areas:
> - Report creation (any authenticated user can report a donation listing)
> - Report categories: potentially_unsafe, misleading_information, inappropriate_content, suspicious_behaviour, other
> - Report state machine: OPEN → UNDER_REVIEW → RESOLVED | DISMISSED
> - Admin moderation dashboard (list open and under-review reports)
> - Admin report detail view (donation details, reporter info, report reason)
> - Admin resolve action (UNDER_REVIEW → RESOLVED, optional action on the donation)
> - Admin dismiss action (UNDER_REVIEW → DISMISSED with reason)
> - Reported donations can be flagged for visibility reduction (not automatic removal)
> - POST /v1/reports (authenticated, any role)
> - GET /v1/admin/reports (Admin only)
> - PATCH /v1/admin/reports/{id} (Admin only)

