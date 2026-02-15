---
name: gsd:resolve-conflict
description: AI-driven conflict resolution between teams
argument-hint: "[phase] [--type architecture|implementation|scope]"
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
Resolve conflicts between teams by analyzing competing positions, presenting trade-offs, and recording decisions.

Reads CONFLICTS.md from team synthesis (or detects conflicts from overlapping plans), analyzes both positions, presents options with impact analysis, and updates STATE.md and CONTRACTS.md with the resolution.

Output: Conflict resolution with decision recorded in STATE.md and interface changes in CONTRACTS.md.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS (optional — first positional arg is phase number)

**Flags:**
- `--type architecture` — Filter to architectural conflicts (patterns, structure)
- `--type implementation` — Filter to implementation conflicts (library choice, approach)
- `--type scope` — Filter to scope conflicts (feature boundaries, ownership)

@.planning/STATE.md
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

## 1. Determine Phase

If $ARGUMENTS includes a phase number, use that.

Otherwise, read STATE.md for current active phase:

```bash
cat .planning/STATE.md 2>/dev/null
```

## 2. Load Conflicts

**Source 1: CONFLICTS.md (from team synthesis)**

```bash
cat .planning/phases/${PHASE}-*/teams/CONFLICTS.md 2>/dev/null
```

**Source 2: Detect from overlapping plans**

If no CONFLICTS.md exists, scan for conflicts:

```bash
# Find shared file modifications across team plans
node ~/.claude/get-shit-done/bin/gsd-tools.js team-conflicts "${PHASE}"
```

Detect conflicts from:
- **File ownership overlaps:** Multiple teams modifying the same file
- **Contract disagreements:** Mismatched interface expectations between teams
- **Dependency cycles:** Team A waits on B, B waits on A
- **Scope creep:** One team's plan encroaches on another team's domain

**If no conflicts found:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► NO CONFLICTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No conflicts detected for Phase {N}.
All team plans are compatible.
```

Exit.

## 3. Filter Conflicts (if --type specified)

If `--type` flag provided, filter to matching conflict type:
- `architecture` — Patterns, folder structure, layer design
- `implementation` — Library choices, API design, data format
- `scope` — Feature ownership, domain boundaries

## 4. Present Conflicts

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESOLVE CONFLICTS — Phase {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{M} conflict(s) detected
```

For each conflict, display:

```
───────────────────────────────────────────────────────────────

### Conflict {i}: {Title}

**Type:** {architecture|implementation|scope}
**Teams:** {team-a} vs {team-b}
**Severity:** {low|medium|high|critical}

**{team-a}'s position:**
{Description of what team-a's plan proposes}

**{team-b}'s position:**
{Description of what team-b's plan proposes}

**Root cause:**
{Why these positions are incompatible}

───────────────────────────────────────────────────────────────
```

## 5. Analyze Each Conflict

For each conflict, spawn analysis using Task:

```
Task(
  prompt="Analyze this conflict and propose resolution options:

  Conflict: {conflict description}
  Team A ({team_a}): {position}
  Team B ({team_b}): {position}

  Project context:
  - Architecture: {from PROJECT.md}
  - Phase goal: {from ROADMAP.md}

  Propose 2-3 resolution options with:
  1. Description of the resolution
  2. Impact on each team's work
  3. Pros and cons
  4. Estimated rework required
  5. Recommendation with rationale",
  description="Analyze conflict: {title}"
)
```

## 6. Present Resolution Options

For each conflict:

```
╔══════════════════════════════════════════════════════════════╗
║  CHECKPOINT: Decision Required                               ║
╚══════════════════════════════════════════════════════════════╝

### Conflict: {Title}

**Option A: {Name}** ⚡ Recommended
  Impact on {team-a}: {description}
  Impact on {team-b}: {description}
  Rework: {estimate}
  Pros: {list}
  Cons: {list}

**Option B: {Name}**
  Impact on {team-a}: {description}
  Impact on {team-b}: {description}
  Rework: {estimate}
  Pros: {list}
  Cons: {list}

**Option C: {Name}** (if applicable)
  Impact on {team-a}: {description}
  Impact on {team-b}: {description}
  Rework: {estimate}
  Pros: {list}
  Cons: {list}

──────────────────────────────────────────────────────────────
→ Select: A / B / C (or describe a different resolution)
──────────────────────────────────────────────────────────────
```

Use AskUserQuestion to get the user's decision for each conflict.

## 7. Record Decisions

For each resolved conflict:

**Update STATE.md decisions section:**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js state add-decision \
  --phase "${PHASE}" \
  --summary "Conflict resolved: {title} — chose {option}. {team-a} will {action}, {team-b} will {action}."
```

**Update CONTRACTS.md if interface changes needed:**

Read existing contracts:

```bash
cat .planning/phases/${PHASE}-*/teams/CONTRACTS.md 2>/dev/null
```

If the resolution changes an interface contract:
- Update the contract definition (schema, endpoints, types)
- Mark old contract version as superseded
- Update both teams' plans to reference new contract

Write updated CONTRACTS.md.

**Update or create CONFLICTS.md with resolution:**

```markdown
## Conflict: {Title}

- **Status:** Resolved
- **Resolution:** Option {X} — {description}
- **Decision date:** {ISO timestamp}
- **Impact:**
  - {team-a}: {what changes}
  - {team-b}: {what changes}
- **Recorded in:** STATE.md decisions
```

## 8. Update Affected Plans

If resolution requires changes to team plans:

```bash
# Read affected plans
cat .planning/phases/${PHASE}-*/teams/${TEAM}/*-PLAN.md
```

Update frontmatter or task details to reflect the resolved conflict:
- Adjust `team_dependencies` if interface changed
- Update `files_modified` if file ownership changed
- Modify task actions if approach changed

## 9. Commit and Display Summary

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js commit "docs(${PHASE}): resolve team conflicts" --files .planning/phases/${PHASE}-*/teams/CONFLICTS.md .planning/phases/${PHASE}-*/teams/CONTRACTS.md .planning/STATE.md
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CONFLICTS RESOLVED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{M} conflict(s) resolved for Phase {N}

| Conflict | Resolution | Teams Affected |
|----------|------------|----------------|
| {title} | Option {X}: {brief} | {team-a}, {team-b} |

Decisions recorded in STATE.md.
Contracts updated in CONTRACTS.md.

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Continue execution:**

`/gsd:execute-phase {N}`

───────────────────────────────────────────────────────────────

**Also available:**
- `/gsd:team-status {N}` — View updated team dashboard
- `/gsd:distribute-phase {N}` — Redistribute if needed

───────────────────────────────────────────────────────────────
```

</process>

<success_criteria>
- [ ] Team config validated (team.enabled = true)
- [ ] Phase identified (from args or STATE.md)
- [ ] Conflicts loaded (from CONFLICTS.md or detected from plans)
- [ ] Conflicts filtered by type (if --type flag used)
- [ ] Each conflict analyzed with resolution options
- [ ] User selected resolution for each conflict
- [ ] Decisions recorded in STATE.md
- [ ] CONTRACTS.md updated if interfaces changed
- [ ] CONFLICTS.md updated with resolution status
- [ ] Affected plans updated
- [ ] Changes committed
</success_criteria>
</output>
