---
name: gsd:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only] [--team <team-name>]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
<objective>
Execute all plans in a phase using wave-based parallel execution.

Orchestrator stays lean: discover plans, analyze dependencies, group into waves, spawn subagents, collect results. Each subagent loads the full execute-plan context and handles its own plan.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@~/.claude/get-stuff-done/workflows/execute-phase.md
@~/.claude/get-stuff-done/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS

**Flags:**
- `--gaps-only` — Execute only gap closure plans (plans with `gap_closure: true` in frontmatter). Use after verify-work creates fix plans.
- `--team <team-name>` — Execute only the specified team's plans (e.g., `--team frontend`). Without this flag, all plans execute (existing behavior). Team routing activates automatically when team plans are detected.

**Team mode behavior (automatic):**
- `--team frontend` executes only plans where `team: frontend` or `assigned_team: frontend` in frontmatter
- Without `--team` flag: executes all plans regardless of team assignment (default behavior)
- Team routing activates automatically when plans have `team:` frontmatter or `CONTRACTS.md` exists — no manual setup needed

@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
Execute the execute-phase workflow from @~/.claude/get-stuff-done/workflows/execute-phase.md end-to-end.
Preserve all workflow gates (wave execution, checkpoint handling, verification, state updates, routing).
</process>
