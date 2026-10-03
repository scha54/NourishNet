# NourishNet Community Food Power

## Overview

The **NourishNet Community Food** power packages domain knowledge and MCP server capabilities for use by Kiro agents working on the NourishNet surplus food redistribution platform. It provides structured skills covering the food donation lifecycle, social impact measurement, and AWS serverless patterns, plus stub MCP tools for querying NourishNet data during development.

**Activation keywords:** `nourishnet`, `food`, `donation`, `redistribution`, `impact`

These are the keywords declared in `plugin.json`. This power activates automatically when any of them appear in a user message or task. It can also be activated manually via the Kiro Powers panel.

---

## Available Skills

### food-donation-domain

**Path:** `skills/food-donation-domain/SKILL.md`

Domain knowledge for the food donation lifecycle: the seven listing states (`draft → available → claimed → in_transit → completed | cancelled | expired`), valid state transitions, claiming semantics, food safety boundaries, and the four user roles (Donor, Organization, Volunteer, Admin).

Use this skill when:
- Designing or reviewing the donation listing workflow
- Evaluating state machine transitions for correctness
- Checking role permissions against the product model
- Writing or reviewing acceptance criteria for donation-related features

---

### impact-metrics

**Path:** `skills/impact-metrics/SKILL.md`

Social impact measurement model including calculation formulas, centralised constants (`MEALS_PER_KG = 2.5`, `CARBON_PER_KG_FOOD_WASTE = 2.5`), required entity fields for DONATION/PICKUP/REPORT, and responsible reporting guidelines to ensure credible, non-fabricated impact evidence.

Use this skill when:
- Implementing or reviewing impact calculation logic in `backend/src/domain/impact.ts`
- Auditing REPORT entity writes for completeness
- Reviewing `docs/impact-model.md` for accuracy
- Checking that derived metrics are computed from centralised constants, not inline literals

---

### serverless-patterns

**Path:** `skills/serverless-patterns/SKILL.md`

Reusable AWS serverless patterns for NourishNet Lambda handlers, DynamoDB single-table repositories, Cognito JWT authorization, and CDK stack construction. Covers least-privilege IAM, the handler → domain → repository layer separation rule, API Gateway Cognito authorizer configuration, and the API response envelope standard.

Use this skill when:
- Scaffolding new Lambda handlers
- Reviewing CDK stack changes for IAM or DynamoDB anti-patterns
- Implementing repository functions with correct key builder patterns
- Configuring API Gateway routes and authorisers

---

## Available MCP Tools

The `nourishnet-domain` MCP server provides stub tools for querying NourishNet data during development. These tools are stubs in the foundation phase — they return seed or mock data until the real DynamoDB table is populated.

### get_donation_by_id

Fetch a single donation record by its id.

**Signature:** `get_donation_by_id(id: string): DonationRecord | null`

**Parameters:**
- `id` (string, required) — UUID of the donation to retrieve

**Returns:** A `DonationRecord` (DONATION entity) object, or `null` if no donation matches the id.

**Example invocation:**
```json
{ "id": "d1e2f3a4-b5c6-7890-abcd-ef1234567890" }
```

---

### list_donations_by_status

List all donations filtered by their current lifecycle status.

**Signature:** `list_donations_by_status(status: string): DonationRecord[]`

**Parameters:**
- `status` (string, required) — one of `draft | available | claimed | in_transit | completed | cancelled | expired`

**Returns:** Array of `DonationRecord` (DONATION entity) objects whose status matches. Empty array if none match.

**Example invocation:**
```json
{ "status": "available" }
```

---

### list_organizations

List all verified community organizations registered on the platform.

**Signature:** `list_organizations(): OrganizationRecord[]`

**Parameters:** None.

**Returns:** Array of `OrganizationRecord` objects — USER entities with role `Organization` and verified status.

**Example invocation:**
```json
{}
```

---

### get_impact_summary

Return aggregate impact metrics across all completed redistribution events.

**Signature:** `get_impact_summary(): ImpactSummary`

**Parameters:** None.

**Returns:** An `ImpactSummary` object:
```json
{
  "totalWeightKg": 1250.5,
  "totalMealsEquivalent": 3126,
  "totalCarbonSavedKgCo2e": 3126.25,
  "completedRedistributions": 47,
  "activeOrganizations": 12,
  "activeVolunteers": 31
}
```

---

## Usage Examples

### Ask an agent to review a new donation feature

> "Review this new donation listing handler against the food-donation-domain skill. Check that all lifecycle states are handled and that the impact fields are populated correctly."

### Generate property-based tests for impact calculations

> "Using the impact-metrics skill, generate fast-check property tests for the `calculateImpact` function in `backend/src/domain/impact.ts`."

### Query current available donations during development

> "Use the nourishnet-domain MCP tool to list available donations and verify the seed data is correct."

---

## Architecture Constraints

All tools in this power operate on the NourishNet single-table DynamoDB design:

- **Table:** `NourishNetTable-<environment>`
- **PK/SK** primary key with **GSI1** and **GSI2**
- See `docs/architecture.md` for full key patterns and access patterns

MCP tools call the table using the documented access patterns only — no scan operations.
