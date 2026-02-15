# Team Handoff Protocol

How teams pass work between phases and within phases. Defines handoff types, checklists, context transfer formats, and failure recovery.

<handoff_types>

## Handoff Types

### Sequential Handoff (Team A then Team B)

One team completes work, another team picks it up. The most common handoff pattern.

**When used:**
- Backend builds API, then frontend consumes it
- Data team creates schema, then backend builds routes against it
- Security team creates middleware, then all teams integrate it

**Flow:**
```
Team A (source)                    Team B (target)
────────────────                   ────────────────
Execute plan                       (waiting)
  └── Complete tasks
  └── Write SUMMARY.md
  └── Update .team-state → "complete"
  └── Mark contracts → "implemented"
                                   Read Team A's SUMMARY.md
                                   Read CONTRACTS.md (status: implemented)
                                   Execute own plan
                                     └── Consume Team A's artifacts
                                     └── Complete tasks
                                     └── Write own SUMMARY.md
```

**Example:**

```
Phase 02: Authentication

Wave 1 - Sequential source:
  team-security: 02-01-TEAM-PLAN.md
    Task 1: Create auth middleware (withAuth)
    Task 2: Create token validation utilities
    → SUMMARY: "Auth middleware with JWT validation using jose, withAuth wrapper for route protection"
    → Contract auth-middleware: status → "implemented"

Wave 2 - Sequential target:
  team-backend: 02-02-TEAM-PLAN.md
    Task 1: Create protected API routes using withAuth from team-security
    Task 2: Add role-based access to admin endpoints
    → Consumes: auth-middleware contract
    → Reads: team-security 02-01-SUMMARY.md for middleware usage patterns
```

### Parallel Handoff (Merge Point)

Multiple teams work simultaneously, outputs are merged at a synchronization point.

**When used:**
- Frontend and backend build independently against agreed contracts
- Multiple teams work on different features within the same wave
- Teams produce artifacts that must be integrated at a merge point

**Flow:**
```
Team A (parallel)                  Team B (parallel)
────────────────                   ────────────────
Execute plan                       Execute plan
  └── Complete tasks                 └── Complete tasks
  └── Write SUMMARY.md              └── Write SUMMARY.md
  └── Update .team-state            └── Update .team-state

            ──── merge point ────
                     │
              gsd-team-verifier
              ├── Cross-team wiring check
              ├── Contract compliance check
              └── Integration verification

              gsd-team-synthesizer
              ├── Read both SUMMARY.md files
              ├── Produce SYNTHESIS.md
              └── Knowledge transfer prep
```

**Example:**

```
Phase 03: Core Features

Wave 1 - Parallel execution:
  team-backend: 03-01-TEAM-PLAN.md
    Task 1: Create GET /api/products endpoint
    Task 2: Create POST /api/products endpoint
    → Contract product-api: status → "implemented"

  team-frontend: 03-01-TEAM-PLAN.md
    Task 1: Create ProductList component (uses mock data)
    Task 2: Create ProductForm component (uses mock data)
    → Contract product-ui: status → "implemented"

  ──── merge point: wave 1 complete ────

Wave 2 - Integration:
  team-frontend: 03-02-TEAM-PLAN.md
    Task 1: Wire ProductList to GET /api/products
    Task 2: Wire ProductForm to POST /api/products
    → Consumes: product-api contract
    → Integration verified by gsd-team-verifier
```

### Checkpoint Handoff (Sync Gate)

All teams pause at a defined point, state is verified, then all proceed.

**When used:**
- Critical integration point where partial failure would cascade
- Before a phase transition where all teams must be complete
- After a high-coordination wave where contracts must be verified before continuing

**Flow:**
```
Team A          Team B          Team C
────────       ────────        ────────
Execute         Execute         Execute
  │               │               │
  ▼               ▼               ▼
GATE ─────────── GATE ────────── GATE
  │                                │
  └──── gsd-team-coordinator ──────┘
         ├── Verify all teams complete
         ├── Check all contracts fulfilled
         ├── Run integration checks
         ├── If all pass: open gate
         └── If any fail: hold gate, fix
                    │
  ┌────────────────┼────────────────┐
  ▼                ▼                ▼
Continue        Continue        Continue
```

**Example:**

```
Phase 02: Authentication - Checkpoint Gate after Wave 2

Wave 2 completes:
  team-backend: Auth API endpoints implemented
  team-security: Auth middleware implemented
  team-data: User/Session schema migrated

  ──── CHECKPOINT GATE ────
  gsd-team-coordinator verifies:
    ✓ Contract auth-api: implemented (backend)
    ✓ Contract auth-middleware: implemented (security)
    ✓ Contract user-schema: implemented (data)
    ✓ Integration: middleware protects API endpoints correctly
    ✓ Integration: API queries User/Session models correctly
  Gate: OPEN → proceed to Wave 3

Wave 3:
  team-frontend: Build login UI consuming auth API
```

</handoff_types>

<handoff_checklist>

## Handoff Checklist

Before a handoff is considered complete, the source team must verify:

### Source Team Checklist

- [ ] **SUMMARY.md complete** — substantive one-liner, accomplishments, files created/modified, decisions made
- [ ] **All tasks in plan marked done** — no partial completion
- [ ] **Tests passing** — `npm test`, `npm run build`, or equivalent passes without errors
- [ ] **Contracts fulfilled** — all contracts this team owns in this wave marked "implemented"
- [ ] **Team state updated** — `.planning/.team-state/{phase}-{plan}-{team}.json` set to "complete"
- [ ] **No regressions** — source team's changes do not break other teams' existing artifacts
- [ ] **Key decisions documented** — any deviations from plan recorded in SUMMARY.md

### Target Team Checklist (before starting)

- [ ] **Source SUMMARY.md read** — understand what was built, decisions made, patterns established
- [ ] **Contracts verified** — contract status is "implemented" for all dependencies
- [ ] **Artifacts accessible** — source team's files exist and are importable/callable
- [ ] **No blocking conflicts** — CONFLICTS.md has no open conflicts affecting this team

### Coordinator Checklist (at sync gates)

- [ ] **All source teams complete** — team-state shows "complete" for all wave N plans
- [ ] **All contracts at correct status** — no "draft" contracts that should be "agreed" or "implemented"
- [ ] **Integration verified** — gsd-team-verifier ran cross-team checks
- [ ] **SYNTHESIS.md produced** — if this is a phase boundary, synthesizer has merged summaries
- [ ] **Knowledge transfers scheduled** — if next phase has different team composition

</handoff_checklist>

<context_transfer_format>

## Context Transfer Format

When teams hand off work, the receiving team needs structured context. This section defines what goes into the handoff summary.

### Handoff Summary Structure

The handoff summary is embedded in the SYNTHESIS.md or provided as a section in the source team's SUMMARY.md:

```markdown
## Handoff: [source-team] → [target-team]

### What Was Built
- [Artifact 1]: [description and location]
- [Artifact 2]: [description and location]

### How to Use It
- Import `withAuth` from `src/lib/auth/middleware.ts` to protect routes
- Call `validateToken(token)` to manually check token validity
- User type is exported from `src/types/user.ts`

### Decisions That Affect You
- JWT tokens expire in 15 minutes (frontend must handle refresh)
- Refresh tokens are httpOnly cookies (cannot be read from JavaScript)
- User.role is "user" | "admin" (use for conditional rendering)

### Patterns Established
- All auth errors return `{ error: string, code: string }` shape
- Protected routes return 401 with `{ error: "Unauthorized" }`, never redirect

### Known Limitations
- Rate limiting not yet implemented (planned for Phase 04)
- OAuth login not supported yet (only email/password)

### Contract Status
- auth-api: implemented (endpoints match contract spec)
- auth-middleware: implemented (withAuth works, tested)
- user-schema: implemented (migration applied, models generated)

### Files to Reference
- `src/lib/auth/middleware.ts` — withAuth wrapper, validateToken
- `src/lib/auth/tokens.ts` — createToken, refreshToken, revokeToken
- `src/app/api/auth/login/route.ts` — login endpoint implementation
- `prisma/schema.prisma` — User and Session models
```

### Transfer via SYNTHESIS.md

For phase-boundary handoffs, gsd-team-synthesizer creates a comprehensive SYNTHESIS.md:

```markdown
---
phase: 02-authentication
teams_contributing: [backend, security, data, frontend]
target_phase: 03-core-features
target_teams: [frontend, backend]
---

# Phase 02 Synthesis

## Combined Accomplishments
- [Merged list from all team SUMMARY.md files]

## Cross-Team Integration Summary
- Auth middleware (security) used by all API routes (backend)
- Login UI (frontend) calls auth API (backend) — verified working
- User/Session schema (data) consumed by auth logic (backend, security)

## Handoff: Phase 02 → Phase 03

### For team-frontend (Phase 03 Lead):
[Structured handoff from backend + security teams]

### For team-backend (Phase 03 Lead):
[Structured handoff from security + data teams]

## Open Items
- [Any unresolved concerns carried forward]

## Contract Carryover
[Contracts that remain active in Phase 03]
```

</context_transfer_format>

<failure_recovery>

## Failure Recovery

What happens when handoffs go wrong.

### Handoff Fails: Source Team Incomplete

**Scenario:** Source team's executor failed or produced incomplete output. Target team is waiting.

**Recovery protocol:**
```
1. Coordinator detects incomplete handoff:
   - team-state still shows "in_progress" past expected completion
   - SUMMARY.md missing or has no accomplishments
   - Contracts still at "draft" or "agreed" (should be "implemented")

2. Assess scope of incompleteness:
   a. Partial completion (some tasks done, some not)
   b. Total failure (no meaningful output)

3. Recovery actions:
   a. PARTIAL: Create fix plan for remaining tasks, re-execute, then handoff
   b. TOTAL: Retry full plan with fresh executor
   c. BYPASS: If target team can proceed without source artifacts (rare)
   d. ESCALATE: Present situation to user

4. Update team-state:
   {
     "status": "failed",
     "failure_reason": "executor_timeout",
     "completed_tasks": ["task-1", "task-2"],
     "pending_tasks": ["task-3"],
     "recovery_action": "partial_reexecute"
   }

5. Notify target team of delay via coordinator
```

### Handoff Fails: Receiving Team Makes Wrong Assumptions

**Scenario:** Target team proceeds but misinterprets source team's output. Integration breaks.

**Detection:**
- gsd-team-verifier finds broken cross-team wiring
- Tests fail at integration points
- Contract compliance check fails for consumer side

**Recovery protocol:**
```
1. Identify the assumption gap:
   - Contract was correct but implementation subtly different?
   - Contract was incomplete (missing edge case)?
   - Target team misread SUMMARY.md?

2. Determine fix scope:
   a. Target team fix (their code is wrong, source is correct)
   b. Source team fix (their code doesn't match contract)
   c. Contract update (contract was ambiguous, both teams were reasonable)

3. Create fix plan:
   - Assign to the team that needs to change
   - Reference the specific contract and mismatch
   - Include verification that catches the original issue

4. Re-verify after fix:
   - gsd-team-verifier re-runs cross-team checks
   - Contract compliance re-verified
   - Update CONFLICTS.md with resolution
```

### Handoff Fails: Contract Never Agreed

**Scenario:** Teams proceeded with "draft" contracts that were never formally agreed upon. At integration, shapes don't match.

**This is the most common handoff failure.** Prevention is better than cure.

**Prevention:**
- gsd-team-coordinator blocks wave execution if any consumed contract is still "draft"
- plan-phase gate requires all cross-team contracts to reach "agreed" before planning completes

**Recovery if it happens anyway:**
```
1. Stop both teams
2. Coordinator convenes contract review:
   - What did Team A build?
   - What does Team B expect?
   - What should the contract be?
3. Agree on correct contract
4. Determine which team must change (prefer changing the consumer if source is already deployed)
5. Create fix plan, execute, re-verify
```

</failure_recovery>

<state_transfer>

## State Transfer via .team-state/

Teams communicate state through JSON files in `.planning/.team-state/`. See `~/.claude/get-stuff-done/references/team-state-format.md` for the full schema.

### State files involved in handoffs

**Source team writes:**
```
.planning/.team-state/02-01-backend.json
{
  "status": "complete",
  "completed_at": "2025-01-15T14:50:33Z",
  "contracts_fulfilled": ["auth-api"],
  "summary_path": ".planning/phases/02-auth/teams/backend/02-01-SUMMARY.md"
}
```

**Coordinator reads and validates:**
```
Check: all source team states for this wave are "complete"
Check: all referenced contracts are "implemented"
Result: gate OPEN or BLOCKED (with reason)
```

**Target team reads (via coordinator-provided context):**
```
Source state confirms:
  - What was built (summary_path → read SUMMARY.md)
  - What contracts are ready (contracts_fulfilled → check CONTRACTS.md)
  - When it was completed (for timeline tracking)
```

### Cleanup After Phase Completion

When a phase is fully complete (all teams, all waves, verification passed):

```
1. All .team-state/{phase}-*.json files archived or cleaned
2. SYNTHESIS.md is the lasting record of cross-team work
3. CONTRACTS.md statuses should all be "verified"
4. STATE.md updated with phase completion info
```

See `~/.claude/get-stuff-done/references/team-state-format.md` for cleanup protocol details.

</state_transfer>

<guidelines>

## Guidelines

- Every cross-team dependency must use a defined handoff type (sequential, parallel, or checkpoint).
- Source teams must complete the handoff checklist before target teams begin.
- Contracts must be "agreed" before execution and "implemented" before handoff.
- Handoff summaries are mandatory, not optional. They are the primary vehicle for cross-team context.
- When in doubt about handoff type, use checkpoint (sync gate). It is safer but slower.
- Failures should be caught early through contract verification, not discovered late through integration testing.
- State transfer via `.team-state/` is the machine-readable companion to human-readable SUMMARY.md.
- Cross-reference `~/.claude/get-stuff-done/references/team-orchestration.md` for the overall coordination protocol.
- Cross-reference `~/.claude/get-stuff-done/references/team-state-format.md` for the state JSON schema.
- Cross-reference `~/.claude/get-stuff-done/templates/team-contract.md` for contract structure.

</guidelines>
