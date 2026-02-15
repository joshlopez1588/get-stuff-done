---
name: gsd:distribute-phase
description: Suggest how to partition phase tasks across teams
argument-hint: "<phase> [--strategy balanced|specialized]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Analyze phase plans and suggest team assignments for multi-team execution.

Reads existing PLAN.md files, classifies tasks by domain, suggests team ownership, and builds a dependency graph of cross-team interactions. Optionally applies assignments by writing team frontmatter to PLAN.md files.

Output: Team assignment suggestions with dependency graph. Optionally writes team assignments to plans.
</objective>

<execution_context>
@~/.claude/get-stuff-done/references/ui-brand.md
@~/.claude/get-stuff-done/templates/team-plan.md
</execution_context>

<context>
Phase: $ARGUMENTS (required — first positional argument is phase number)

**Flags:**
- `--strategy balanced` — Distribute work evenly across teams (default)
- `--strategy specialized` — Assign based on domain expertise, even if unbalanced

@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/config.json
@.planning/TEAM-MATRIX.md
</context>

<process>

## 0. Validate Team Configuration

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

Extract available teams from `config.team.available_teams`.

## 1. Parse Arguments

Extract phase number from $ARGUMENTS (first positional arg).
Extract `--strategy` flag (default: `balanced`).

**If no phase number provided:**

```
╔══════════════════════════════════════════════════════════════╗
║  ERROR                                                       ║
╚══════════════════════════════════════════════════════════════╝

Phase number required. Usage: `/gsd:distribute-phase 3`
```

Exit.

## 2. Load Phase Plans

```bash
ls .planning/phases/${PHASE}-*/${PHASE}-*-PLAN.md 2>/dev/null
```

**If no plans exist:**

```
╔══════════════════════════════════════════════════════════════╗
║  ERROR                                                       ║
╚══════════════════════════════════════════════════════════════╝

No plans found for phase ${PHASE}. Run `/gsd:plan-phase ${PHASE}` first.
```

Exit.

Read each PLAN.md file. Extract:
- Plan number and objective
- files_modified list
- Task names, files, and actions
- Any existing team assignments

## 3. Analyze Domain Content

```bash
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs analyze-teams "${PHASE}"
```

For each plan, classify domain affinity based on:

**File path signals:**
| Pattern | Domain |
|---------|--------|
| `src/components/`, `src/app/`, `src/pages/`, `*.tsx`, `*.css` | frontend |
| `src/api/`, `src/server/`, `src/services/`, `route.ts`, `prisma/` | backend |
| `src/auth/`, `src/middleware/auth*`, `**/permissions/` | security |
| `Dockerfile`, `.github/`, `deploy/`, `terraform/`, `k8s/` | devops |
| `prisma/migrations/`, `src/db/`, `**/seed*`, `**/migrate*` | data |

**Action content signals:**
| Keywords | Domain |
|----------|--------|
| "component", "render", "UI", "Tailwind", "CSS", "layout" | frontend |
| "endpoint", "API", "route", "query", "database", "model" | backend |
| "auth", "JWT", "permission", "middleware", "RBAC", "token" | security |
| "deploy", "CI", "pipeline", "Docker", "infrastructure" | devops |
| "migration", "schema", "seed", "index", "ETL" | data |

Score each plan against each available team. A plan may have affinity for multiple teams.

## 4. Build Team Assignment Suggestions

**Balanced strategy:** Distribute plans so each team has roughly equal work.
- Primary assignment based on highest domain score
- Redistribute if any team has >2x the plans of the lightest team
- Split plans that span multiple domains (create team-specific sub-plans)

**Specialized strategy:** Assign based purely on domain expertise.
- Each plan goes to team with highest domain score
- Accept unbalanced distribution if domain demands it
- Flag plans with no clear domain affinity for user decision

## 5. Build Dependency Graph

```bash
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-dependencies "${PHASE}"
```

For each suggested assignment, identify:
- **Intra-team dependencies:** Plans within the same team that depend on each other
- **Cross-team dependencies:** Plans that depend on artifacts from another team's plans
- **Shared files:** Files that appear in multiple team assignments (conflict risk)

Build and display the dependency graph:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DISTRIBUTE PHASE {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strategy: {balanced|specialized}

## Suggested Assignments

| Plan | Objective | Team | Domain Score | Coordination |
|------|-----------|------|-------------|--------------|
| {phase}-01 | Create user model + API | backend | 0.92 | low |
| {phase}-02 | Build auth middleware | security | 0.88 | medium |
| {phase}-03 | User dashboard UI | frontend | 0.95 | medium |

## Dependency Graph

  backend:{phase}-01 (User model + API)
    │
    ├──→ security:{phase}-02 (Auth middleware)
    │       │
    │       └──→ frontend:{phase}-03 (Dashboard UI)
    │               ↑
    └───────────────┘

## Cross-Team Dependencies

| From | To | Artifact | Coordination Cost |
|------|----|----------|-------------------|
| backend:{phase}-01 | security:{phase}-02 | User model types | low |
| backend:{phase}-01 | frontend:{phase}-03 | GET /api/users | medium |
| security:{phase}-02 | frontend:{phase}-03 | Auth context provider | medium |

## Shared File Conflicts

| File | Teams | Resolution |
|------|-------|------------|
| src/types/user.ts | backend, frontend | backend owns, frontend consumes |

## Team Workload

| Team | Plans | Est. Tasks | Coordination Cost |
|------|-------|-----------|-------------------|
| frontend | 1 | 3 | medium |
| backend | 1 | 2 | low |
| security | 1 | 2 | medium |
```

## 6. Confirm or Adjust

Use AskUserQuestion:

```
Apply these team assignments?

1) Apply as suggested
2) Adjust assignments (interactive)
3) Cancel — I'll assign manually

Select [1/2/3]:
```

**If "Adjust":** Show each plan and ask which team it should go to.

## 7. Apply Assignments (if confirmed)

For each plan:

1. Read the existing PLAN.md
2. Add team frontmatter fields:
   ```yaml
   team: frontend
   assigned_team: frontend
   coordination_cost: medium
   team_dependencies:
     - team: backend
       artifact: "GET /api/users endpoint"
       ready_by: wave-1
   ```
3. Write updated PLAN.md

Create team directory structure:

```bash
mkdir -p .planning/phases/${PHASE}-*/teams/frontend
mkdir -p .planning/phases/${PHASE}-*/teams/backend
mkdir -p .planning/phases/${PHASE}-*/teams/security
```

Move or copy plans to team directories if using TEAM-PLAN format.

Create initial `.planning/.team-state/{phase}-{plan}-{team}.json` files:

```json
{
  "phase": "{phase}",
  "plan": "{plan}",
  "team": "{team}",
  "status": "pending",
  "assigned_at": "{ISO timestamp}",
  "dependencies_met": false
}
```

## 8. Create Phase CONTRACTS.md

Create `.planning/phases/${PHASE}-*/teams/CONTRACTS.md` with cross-team interface definitions:

```markdown
# Phase {N} Contracts

## contract:user-api
- **Owner:** backend
- **Consumers:** frontend, security
- **Artifact:** GET /api/users, POST /api/users
- **Schema:** { id: string, email: string, name: string }
- **Ready by:** wave-1
- **Status:** pending
```

## 9. Commit and Display Summary

```bash
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs commit "docs(${PHASE}): distribute phase across teams" --files .planning/phases/${PHASE}-*/${PHASE}-*-PLAN.md .planning/phases/${PHASE}-*/teams/CONTRACTS.md
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DISTRIBUTION COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase {N} distributed across {M} teams.

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute the phase with team routing:**

`/gsd:execute-phase {N}`

───────────────────────────────────────────────────────────────

**Also available:**
- `/gsd:team-status {N}` — View team dashboard
- `/gsd:team-handoff` — Prepare handoff between teams

───────────────────────────────────────────────────────────────
```

</process>

<success_criteria>
- [ ] Team config validated (team.enabled = true)
- [ ] Phase plans loaded and parsed
- [ ] Domain content analyzed per plan (file paths + action keywords)
- [ ] Team assignments suggested based on strategy
- [ ] Dependency graph built with cross-team edges
- [ ] Shared file conflicts identified
- [ ] User confirmed or adjusted assignments
- [ ] Team frontmatter written to PLAN.md files (if applied)
- [ ] CONTRACTS.md created with cross-team interfaces
- [ ] Team state files initialized
- [ ] Changes committed
</success_criteria>
</output>
