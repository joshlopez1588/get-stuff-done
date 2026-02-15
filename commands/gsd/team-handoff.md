---
name: gsd:team-handoff
description: Prepare and execute task handoff between teams
argument-hint: "<from-team> <to-team> <phase>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Prepare and execute a structured handoff of completed work from one team to another.

Verifies the source team's work is complete, creates a handoff summary (what was built, decisions made, patterns used), briefs the receiving team with context, and creates a checkpoint in the next plan.

Output: Handoff document, updated team state, receiving team briefed with integration points.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/team-plan.md
</execution_context>

<context>
Arguments: $ARGUMENTS (expected: <from-team> <to-team> <phase>)

Example: `/gsd:team-handoff backend frontend 3`

@.planning/STATE.md
@.planning/config.json
@.planning/TEAM-MATRIX.md
</context>

<process>

## 0. Validate Arguments and Team Config

```bash
cat .planning/config.json 2>/dev/null
```

**If `team.enabled` is not `true`:**

```
╔══════════════════════════════════════════════════════════════╗
║  ERROR                                                       ║
╚══════════════════════════════════════════════════════════════╝

Team mode is not enabled. Run `/gsd:team-init` first.
```

Exit.

Parse $ARGUMENTS for three positional args: from-team, to-team, phase number.

**If any argument missing:**

```
╔══════════════════════════════════════════════════════════════╗
║  ERROR                                                       ║
╚══════════════════════════════════════════════════════════════╝

Usage: `/gsd:team-handoff <from-team> <to-team> <phase>`
Example: `/gsd:team-handoff backend frontend 3`
```

Exit.

Validate both team names exist in `config.team.available_teams`.

## 1. Verify Source Team Completion

```bash
# Check for SUMMARY.md files from source team
ls .planning/phases/${PHASE}-*/teams/${FROM_TEAM}/*-SUMMARY.md 2>/dev/null

# Check team state
cat .planning/.team-state/${PHASE}-*-${FROM_TEAM}.json 2>/dev/null
```

**Verification checks:**

1. **SUMMARY.md exists:** Source team must have completed at least one plan with a summary.
2. **Tests pass (if applicable):**
   ```bash
   # Run test suite relevant to source team's domain
   npm test 2>/dev/null || echo "No test runner configured"
   ```
3. **Contract obligations met:** Check CONTRACTS.md for contracts owned by source team:
   ```bash
   cat .planning/phases/${PHASE}-*/teams/CONTRACTS.md 2>/dev/null
   ```
   Verify contracts owned by `${FROM_TEAM}` have status "complete" or artifacts exist.

**If source team work is incomplete:**

```
╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Verification Required                           ║
╚══════════════════════════════════════════════════════════════╝

Source team "${FROM_TEAM}" has incomplete work:

| Check | Status | Detail |
|-------|--------|--------|
| SUMMARY.md | {✓/✗} | {detail} |
| Tests | {✓/✗} | {detail} |
| Contracts | {✓/✗} | {pending contracts} |

──────────────────────────────────────────────────────────────
→ Proceed anyway? (work may be incomplete) or fix first?
──────────────────────────────────────────────────────────────
```

## 2. Gather Handoff Context

Read source team's completed work:

```bash
# Read all summaries from source team
cat .planning/phases/${PHASE}-*/teams/${FROM_TEAM}/*-SUMMARY.md

# Read contracts this team fulfilled
grep -A 10 "Owner: ${FROM_TEAM}" .planning/phases/${PHASE}-*/teams/CONTRACTS.md 2>/dev/null
```

Extract from summaries:
- **What was built:** Key files created/modified, features implemented
- **Decisions made:** Architecture choices, library selections, trade-offs
- **Patterns used:** Code patterns, naming conventions, structure decisions
- **Known issues:** Deviations, TODOs, caveats documented in summaries
- **Integration points:** API endpoints, shared types, event hooks, exported utilities

## 3. Identify Receiving Team's Needs

Read the receiving team's plans:

```bash
# Check what the receiving team expects from source team
cat .planning/phases/${PHASE}-*/teams/${TO_TEAM}/*-PLAN.md 2>/dev/null
grep -A 5 "team: ${FROM_TEAM}" .planning/phases/${PHASE}-*/teams/${TO_TEAM}/*-PLAN.md 2>/dev/null
```

Extract from receiving team's plans:
- **Dependencies on source team:** What artifacts they need
- **Contracts they consume:** Contract IDs referencing source team
- **Integration touchpoints:** Where receiving team connects to source team's work

## 4. Create Handoff Document

Create `.planning/phases/${PHASE}-*/teams/HANDOFF-${FROM_TEAM}-to-${TO_TEAM}.md`:

```markdown
---
phase: {phase}
from_team: {from_team}
to_team: {to_team}
handoff_date: {ISO timestamp}
status: complete
---

# Handoff: {from_team} → {to_team} — Phase {N}

## What Was Built

### Key Artifacts

| File | Purpose | Notes |
|------|---------|-------|
| src/api/users/route.ts | User CRUD endpoints | Paginated GET, validated POST |
| src/lib/auth.ts | JWT token utilities | Uses jose library, 15min expiry |
| prisma/schema.prisma | User + Session models | UUID IDs, email unique |

### Decisions Made

| Decision | Rationale | Impact on {to_team} |
|----------|-----------|---------------------|
| jose over jsonwebtoken | Edge runtime compatibility | Import from src/lib/auth |
| httpOnly cookies for JWT | Security best practice | Frontend reads from cookie, not localStorage |

### Patterns to Follow

- **API routes:** `src/api/{resource}/route.ts` with GET/POST/PUT/DELETE exports
- **Error format:** `{ error: string, code: string }` with appropriate HTTP status
- **Types:** Shared types in `src/types/{resource}.ts`, imported by both frontend and backend

## Integration Points

### API Endpoints Available

| Method | Path | Request | Response | Auth |
|--------|------|---------|----------|------|
| GET | /api/users | ?page=1&limit=10 | { users: User[], total: number } | Required |
| POST | /api/users | { email, name, password } | { user: User } | Admin only |

### Shared Types

```typescript
// src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

### Environment Variables

| Variable | Source | Required |
|----------|--------|----------|
| DATABASE_URL | .env | Yes |
| JWT_SECRET | .env | Yes |

## Contracts Fulfilled

| Contract ID | Status | Artifact |
|-------------|--------|----------|
| contract:user-api | ✓ Complete | GET/POST /api/users |
| contract:auth-middleware | ✓ Complete | src/middleware/auth.ts |

## Known Issues / Caveats

{List any documented issues, TODOs, or caveats the receiving team should know about}

## What {to_team} Needs to Do

1. Import User type from `src/types/user.ts`
2. Use `fetchWithAuth()` from `src/lib/api-client.ts` for authenticated requests
3. Check auth state via `useAuth()` hook (provided by security team)

---

_Handoff prepared: {timestamp}_
_Source: {from_team} | Target: {to_team}_
```

## 5. Create Handoff Checkpoint in Receiving Team's Next Plan

Find the receiving team's next pending plan:

```bash
# Find plans not yet completed
for plan in .planning/phases/${PHASE}-*/teams/${TO_TEAM}/*-PLAN.md; do
  summary="${plan/PLAN/SUMMARY}"
  if [ ! -f "$summary" ]; then
    echo "$plan"
    break
  fi
done
```

If a pending plan exists, prepend a handoff checkpoint to its context section:

```markdown
<context>
# Handoff from {from_team}
@.planning/phases/{phase}-*/teams/HANDOFF-{from_team}-to-{to_team}.md

[... existing context ...]
</context>
```

## 6. Update Team State

Update `.planning/.team-state/` files:

For source team completed plans:
```json
{
  "status": "complete",
  "handoff_to": "{to_team}",
  "handoff_date": "{ISO timestamp}"
}
```

For receiving team pending plans:
```json
{
  "status": "pending",
  "dependencies_met": true,
  "handoff_from": "{from_team}",
  "handoff_received": "{ISO timestamp}"
}
```

## 7. Commit and Display Summary

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(${PHASE}): handoff ${FROM_TEAM} → ${TO_TEAM}" --files .planning/phases/${PHASE}-*/teams/HANDOFF-${FROM_TEAM}-to-${TO_TEAM}.md .planning/.team-state/
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► HANDOFF COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{from_team} → {to_team} for Phase {N}

Artifacts handed off:
  ✓ {count} files documented
  ✓ {count} contracts fulfilled
  ✓ {count} integration points briefed
  ✓ Handoff document created
  ✓ Receiving team's plan updated with context

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Continue execution with receiving team:**

`/gsd:execute-phase {N} --team {to_team}`

───────────────────────────────────────────────────────────────

**Also available:**
- `/gsd:team-status {N}` — View updated team dashboard
- `/gsd:verify-work {N} --team {from_team}` — Verify source team's work

───────────────────────────────────────────────────────────────
```

</process>

<success_criteria>
- [ ] Team config validated (team.enabled = true)
- [ ] Arguments parsed (from-team, to-team, phase)
- [ ] Source team completion verified (SUMMARY.md, tests, contracts)
- [ ] Handoff context gathered (artifacts, decisions, patterns)
- [ ] Receiving team needs identified (dependencies, contracts, touchpoints)
- [ ] Handoff document created with full integration context
- [ ] Receiving team's plan updated with handoff reference
- [ ] Team state files updated
- [ ] Changes committed
- [ ] Summary displayed with next steps
</success_criteria>
</output>
