---
name: gsd:plan-phase
description: Create detailed execution plan for a phase (PLAN.md) with verification loop
argument-hint: "[phase] [--research] [--skip-research] [--gaps] [--skip-verify] [--teams] [--team <name>]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---
<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate phase, research domain (unless skipped), spawn gsd-planner, verify with gsd-plan-checker, iterate until pass or max iterations, present results.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plan-phase.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase number: $ARGUMENTS (optional — auto-detects next unplanned phase if omitted)

**Flags:**
- `--research` — Force re-research even if RESEARCH.md exists
- `--skip-research` — Skip research, go straight to planning
- `--gaps` — Gap closure mode (reads VERIFICATION.md, skips research)
- `--skip-verify` — Skip verification loop
- `--teams` — Force team planning mode (parallel domain planners). Spawns gsd-team-planner agents per domain. Each team gets its own TEAM-PLAN.md with cross-team contracts.
- `--team <name>` — Plan for a single team only (e.g., `--team frontend`). Creates plans scoped to that team's domain.

**Team mode behavior:**
- `--teams` forces team planning mode regardless of config — spawns parallel domain planners that produce team-scoped TEAM-PLAN.md files and CONTRACTS.md
- `--team frontend` plans for a single team only — useful for re-planning one team's work without affecting others
- Without team flags: uses `config.team.enabled` to decide. If `true`, automatically uses team planning. If `false`, standard single-planner mode.

Normalize phase input in step 2 before any directory lookups.
</context>

<process>
Execute the plan-phase workflow from @~/.claude/get-shit-done/workflows/plan-phase.md end-to-end.
Preserve all workflow gates (validation, research, planning, verification loop, routing).
</process>
