---
name: gsd:team-init
description: Initialize team configuration for a project
argument-hint: "[--teams frontend,backend,security] [--mode distributed]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---
<objective>
Initialize team configuration for multi-team project execution.

Sets up team infrastructure: config entries, TEAM-MATRIX.md template, and .team-state/ directory. After initialization, team-aware commands (/gsd:distribute-phase, /gsd:team-status, /gsd:team-handoff) become available.

Output: Updated config.json with team section, TEAM-MATRIX.md, and .planning/.team-state/ scaffolding.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/team-plan.md
</execution_context>

<context>
Flags: $ARGUMENTS

**Flags:**
- `--teams frontend,backend,security` — Pre-select teams (skip interactive prompt)
- `--mode distributed` — Pre-select mode: `solo`, `distributed`, or `hybrid` (skip interactive prompt)

@.planning/PROJECT.md
@.planning/config.json
</context>

<process>

## 0. Validate Project Exists

```bash
ls .planning/PROJECT.md 2>/dev/null
ls .planning/config.json 2>/dev/null
```

**If .planning/ does not exist:**

```
╔══════════════════════════════════════════════════════════════╗
║  ERROR                                                       ║
╚══════════════════════════════════════════════════════════════╝

No project found. Run `/gsd:new-project` first.
```

Exit.

## 1. Check Existing Team Config

```bash
cat .planning/config.json 2>/dev/null
```

**If `team.enabled` is already `true`:**
- Show current team configuration
- Ask if user wants to reconfigure or exit

## 2. Parse Arguments

Parse $ARGUMENTS for `--teams` and `--mode` flags.

If `--teams` provided: Extract comma-separated team names.
If `--mode` provided: Extract mode value (solo/distributed/hybrid).

## 3. Select Team Mode (if not provided via flag)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEAM INITIALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use AskUserQuestion to prompt for mode:

```
How should teams be organized?

1) Solo      — Single team, no coordination overhead (default GSD behavior)
2) Distributed — Multiple domain teams with contracts and handoffs
3) Hybrid    — Primary team with specialist support teams

Select mode [1/2/3]:
```

**Mode descriptions:**
- **Solo:** Standard GSD workflow. Plans are not team-scoped. Best for single-domain projects.
- **Distributed:** Full multi-team with contracts, synthesis, and handoffs. Each team owns a domain (frontend, backend, etc.). Best for complex projects with clear domain boundaries.
- **Hybrid:** One primary team handles most work. Specialist teams (security, devops) contribute targeted plans. Best for projects where one domain dominates but needs specialist input.

## 4. Select Teams (if not provided via flag)

**If mode is `solo`:** Skip — no teams needed.

**If mode is `distributed` or `hybrid`:**

Use AskUserQuestion to prompt for teams:

```
Which domain teams should be available?

Available domains:
  frontend  — UI components, pages, client-side logic
  backend   — API endpoints, server logic, database
  security  — Auth, permissions, vulnerability review
  devops    — CI/CD, deployment, infrastructure
  data      — Database design, migrations, ETL
  fullstack — Cross-cutting features spanning frontend + backend

Enter team names (comma-separated), e.g.: frontend,backend,security
```

Validate each team name is a recognized domain.

## 5. Update config.json

Read existing config:

```bash
cat .planning/config.json
```

Add or update the `team` section:

```json
{
  "team": {
    "enabled": true,
    "mode": "distributed",
    "available_teams": ["frontend", "backend", "security"],
    "model_overrides": {}
  }
}
```

**For `solo` mode:** Set `team.enabled: false` (or remove team section). Display message that standard GSD workflow is active.

Write updated config.json.

## 6. Create TEAM-MATRIX.md

Create `.planning/TEAM-MATRIX.md`:

```markdown
---
created: {ISO timestamp}
mode: distributed
teams: [frontend, backend, security]
---

# Team Matrix

## Teams

| Team | Domain | Owner | Status |
|------|--------|-------|--------|
| frontend | UI, components, client logic | gsd-team-planner | active |
| backend | API, server, database | gsd-team-planner | active |
| security | Auth, permissions, review | gsd-team-planner | active |

## Domain Boundaries

### frontend
- **Owns:** src/components/, src/app/(pages)/, src/hooks/, src/styles/
- **Consumes from backend:** API endpoints, data types
- **Consumes from security:** Auth context, permission guards

### backend
- **Owns:** src/api/, src/lib/, prisma/, src/services/
- **Consumes from security:** Auth middleware, token validation
- **Provides to frontend:** REST/GraphQL endpoints, shared types

### security
- **Owns:** src/auth/, src/middleware/auth*, src/lib/permissions/
- **Provides to frontend:** Auth components, permission hooks
- **Provides to backend:** Middleware, token utilities

## Coordination Rules

1. Cross-team interfaces defined in CONTRACTS.md per phase
2. Teams must not modify files owned by other teams without handoff
3. Shared types live in a neutral location (src/types/) with joint ownership
4. Conflicts escalated via `/gsd:resolve-conflict`
```

Customize the domain boundaries section based on actual project structure (read from PROJECT.md and any existing codebase map).

## 7. Scaffold Team State Directory

```bash
mkdir -p .planning/.team-state
```

Create `.planning/.team-state/README.md`:

```markdown
# Team State

This directory tracks per-plan team execution state.

Files are named: `{phase}-{plan}-{team}.json`

Example: `03-01-frontend.json`

Status values: pending, in-progress, blocked, complete

Managed automatically by team commands. Do not edit manually.
```

## 8. Display Setup Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEAM SETUP COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mode: distributed
Teams: frontend, backend, security

Files created:
  ✓ .planning/config.json (updated — team section added)
  ✓ .planning/TEAM-MATRIX.md
  ✓ .planning/.team-state/

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Distribute phase work across teams:**

`/gsd:distribute-phase <phase-number>`

Or plan a phase with team mode:

`/gsd:plan-phase <phase-number> --teams`

───────────────────────────────────────────────────────────────

**Also available:**
- `/gsd:team-status` — View team dashboard
- `/gsd:settings` — Adjust team configuration

───────────────────────────────────────────────────────────────
```

</process>

<success_criteria>
- [ ] Project existence validated (.planning/ exists)
- [ ] Existing team config checked (reconfigure or fresh setup)
- [ ] Team mode selected (solo/distributed/hybrid)
- [ ] Teams selected (if distributed/hybrid)
- [ ] config.json updated with team section
- [ ] TEAM-MATRIX.md created with domain boundaries
- [ ] .planning/.team-state/ directory scaffolded
- [ ] Setup summary displayed with next steps
</success_criteria>
</output>
