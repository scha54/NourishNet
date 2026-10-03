# NourishNet — AI Agents Guide

NourishNet uses Kiro custom agents to bring specialised expertise into the development workflow. Each agent carries a focused system prompt tuned to a specific aspect of the platform.

---

## Custom Agents

### product-reviewer

**File:** `.kiro/agents/product-reviewer.md`

**Purpose:** Evaluates features and design decisions against NourishNet's social mission of reducing food waste and increasing community food security. Reviews user-facing flows from the perspective of all four roles (Donor, Organization, Volunteer, Admin) and challenges implementations that drift from the core redistribution workflow.

**Best suited for:**
- Reviewing new feature proposals before implementation
- Assessing whether acceptance criteria reflect real user needs
- Checking that role-based access controls align with the product model
- Identifying missing edge cases in the food listing → claim → pickup → delivery workflow

---

### serverless-architect

**File:** `.kiro/agents/serverless-architect.md`

**Purpose:** Reviews AWS Lambda, Amazon API Gateway, and Amazon DynamoDB design decisions against the NourishNet documented architecture and access patterns. Flags violations of least-privilege IAM, missing index coverage, or handler designs that would cause hot-partition issues or cold-start latency problems.

**Best suited for:**
- Reviewing CDK stack changes before deployment
- Auditing Lambda handler implementations for DynamoDB anti-patterns
- Verifying that new Access Patterns are covered by existing GSIs before adding indexes
- Reviewing API Gateway route and authoriser configuration

---

### property-test-engineer

**File:** `.kiro/agents/property-test-engineer.md`

**Purpose:** Generates and reviews fast-check property-based tests for Backend domain functions. Identifies invariant, round-trip, idempotence, and metamorphic properties for pure functions and advises on when integration tests are more appropriate than property tests.

**Best suited for:**
- Generating property-based tests for new domain functions in `backend/src/domain/`
- Reviewing existing property tests for completeness and shrinking quality
- Advising on fast-check arbitrary generators for domain types
- Distinguishing which acceptance criteria warrant PBT vs. example-based tests

---

### social-impact-reviewer

**File:** `.kiro/agents/social-impact-reviewer.md`

**Purpose:** Verifies that impact data fields are present, correctly typed, and consistent with the NourishNet social impact measurement model. Ensures that every food redistribution event produces the evidence records needed to calculate meals redistributed, carbon-equivalent saved, and community reach.

**Best suited for:**
- Reviewing write operations in `backend/src/repositories/` for required impact fields
- Checking that REPORT entity data matches the impact model schema
- Auditing impact calculation logic against documented formulas
- Reviewing the `docs/impact-model.md` for completeness

---

## NourishNet Kiro Power

**Directory:** `powers/nourishnet-community-food/`

The **NourishNet Community Food** power packages domain knowledge and MCP server capabilities for use by Kiro agents. It provides tools that allow agents to query live or seed NourishNet data during development.

**How to activate:** The power activates automatically when user messages or tasks contain any of the keywords: `nourishnet`, `food`, `donation`, `redistribution`, `impact`. It can also be activated manually via the Kiro Powers panel.

**Available MCP tools (stubs):**
- `get_donation_by_id` — Fetch a donation record by its ID
- `list_donations_by_status` — List donations filtered by status (available, claimed, completed)
- `list_organizations` — List all verified community organizations
- `get_impact_summary` — Return aggregate impact metrics (meals, weight, carbon)

See `powers/nourishnet-community-food/POWER.md` for full documentation.

---

## Hooks

Hooks are automation definitions that fire on IDE events and invoke agent actions automatically.

### api-contract-guard

**File:** `.kiro/hooks/api-contract-guard.md`
**Triggers on:** Edits to `backend/src/handlers/**/*.ts`
**Action:** Verifies that the edited Lambda handler returns responses conforming to the NourishNet API response envelope format (`{ data: ... }` for success, `{ error: { code, message } }` for errors).

---

### security-review

**File:** `.kiro/hooks/security-review.md`
**Triggers on:** Edits to `backend/src/**/*.ts` or `infra/lib/**/*.ts`
**Action:** Checks for hardcoded secrets or credentials, overly-broad IAM policies (`*` actions or resources), and missing input validation in handler code.

---

### test-coverage-reminder

**File:** `.kiro/hooks/test-coverage-reminder.md`
**Triggers on:** Edits to `backend/src/domain/**/*.ts`
**Action:** Checks whether a corresponding property-based test exists in `tests/properties/` for the modified domain function and reminds the developer to add one if it is missing.

---

### impact-data-integrity

**File:** `.kiro/hooks/impact-data-integrity.md`
**Triggers on:** Edits to `backend/src/repositories/**/*.ts`
**Action:** Verifies that repository write operations include all fields required by the social impact measurement model (weight, unit, category, donorId, organizationId, volunteerId, redistributedAt).
