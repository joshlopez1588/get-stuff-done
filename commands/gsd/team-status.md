---
name: gsd:team-status
description: Show current team progress, assignments, and blocking dependencies
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---
<objective>
Display team progress, assignments, and coordination status for a phase.

Provides situational awareness of multi-team execution: who is working on what, what is blocked, and where coordination overhead is highest.

Output: Formatted team status dashboard with progress, dependencies, and utilization.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS (optional — auto-detects current phase if omitted)

@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>

## 0. Check Team Configuration

```bash
TEAM_CONFIG=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init team-status "${PHASE:-}")
```

Read `.planning/config.json` and check `team.enabled`:

```bash
cat .planning/config.json 2>/dev/null
```

**If `team.enabled` is not `true`:**

```
╔══════════════════════════════════════════════════════════════╗
║  ERROR                                                       ║
╚══════════════════════════════════════════════════════════════╝

Team mode is not enabled for this project.

**To enable:** Run `/gsd:team-init` to configure teams.
```

Exit.

## 1. Determine Phase

If $ARGUMENTS provided, use that phase number.

If not provided, read STATE.md to find current active phase:

```bash
cat .planning/STATE.md 2>/dev/null
```

Extract current phase from "Current Phase" or "Position" section. If no active phase found, prompt user.

## 2. Load Team State

```bash
# Load team matrix
cat .planning/TEAM-MATRIX.md 2>/dev/null

# Load team state files
ls .planning/.team-state/ 2>/dev/null

# Analyze teams for this phase
node ~/.claude/get-shit-done/bin/gsd-tools.js analyze-teams "${PHASE}"
```

Read the phase directory for team plans:

```bash
ls .planning/phases/${PHASE}-*/teams/ 2>/dev/null
ls .planning/phases/${PHASE}-*/teams/*/  2>/dev/null
```

## 3. Collect Plan Status Per Team

For each team directory found:

```bash
# Count plans and summaries per team
for team_dir in .planning/phases/${PHASE}-*/teams/*/; do
  team=$(basename "$team_dir")
  plans=$(ls "$team_dir"/*-PLAN.md 2>/dev/null | wc -l)
  summaries=$(ls "$team_dir"/*-SUMMARY.md 2>/dev/null | wc -l)
  echo "$team: $summaries/$plans complete"
done
```

## 4. Identify Blocking Dependencies

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js team-dependencies "${PHASE}"
```

Parse team_dependencies from TEAM-PLAN.md frontmatter across all team plans. Identify:
- Dependencies where the source team has not completed the required artifact
- Circular dependencies (error condition)
- Stalled chains (team waiting on team waiting on team)

## 5. Calculate Coordination Costs

Read `coordination_cost` from each team plan frontmatter. Aggregate:
- Total plans per coordination level (none, low, medium, high, critical)
- Teams with highest coordination overhead

## 6. Display Status Dashboard

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEAM STATUS — Phase {N}: {Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Active Teams

| Team | Plans | Complete | Progress | Status |
|------|-------|----------|----------|--------|
| frontend | 3 | 2/3 | ████████░░ 67% | ◆ In Progress |
| backend | 2 | 2/2 | ██████████ 100% | ✓ Complete |
| security | 1 | 0/1 | ░░░░░░░░░░ 0% | ○ Blocked |

## Blocking Dependencies

| Blocked Team | Waiting For | From Team | Artifact | Status |
|-------------|-------------|-----------|----------|--------|
| security | Auth middleware contract | backend | POST /api/auth | ✓ Ready |
| frontend | User API endpoints | backend | GET /api/users | ◆ In Progress |

## Coordination Summary

| Level | Plans | Teams Involved |
|-------|-------|----------------|
| none | 2 | backend |
| low | 1 | frontend |
| medium | 1 | frontend, backend |
| high | 1 | security, backend, frontend |

## Team Utilization

| Team | Assigned Plans | Active | Waiting | Done |
|------|----------------|--------|---------|------|
| frontend | 3 | 1 | 1 | 1 |
| backend | 2 | 0 | 0 | 2 |
| security | 1 | 0 | 1 | 0 |
```

## 7. Offer Next Actions

Based on status, suggest:
- If blocked teams exist: `/gsd:team-handoff` to unblock
- If conflicts detected: `/gsd:resolve-conflict` to resolve
- If all teams complete: `/gsd:verify-work` to validate
- If distribution needed: `/gsd:distribute-phase` for next phase

</process>

<success_criteria>
- [ ] Team config checked (team.enabled = true)
- [ ] Phase identified (from args or STATE.md)
- [ ] Team state loaded from .planning/.team-state/
- [ ] Plan status collected per team
- [ ] Blocking dependencies identified
- [ ] Coordination costs calculated
- [ ] Status dashboard displayed with tables
- [ ] Next actions suggested based on current state
</success_criteria>
</output>
