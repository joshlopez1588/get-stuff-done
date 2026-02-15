<purpose>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates gsd-phase-researcher, gsd-planner, and gsd-plan-checker agents with a revision loop (max 3 iterations).
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.

@~/.claude/get-stuff-done/references/ui-brand.md
</required_reading>

<process>

## 1. Initialize

Load all context in one call (include file contents to avoid redundant reads):

```bash
INIT=$(node ~/.claude/get-stuff-done/bin/gsd-tools.cjs init plan-phase "$PHASE" --include state,roadmap,requirements,context,research,verification,uat)
```

Parse JSON for: `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_plans`, `plan_count`, `planning_exists`, `roadmap_exists`.

**File contents (from --include):** `state_content`, `roadmap_content`, `requirements_content`, `context_content`, `research_content`, `verification_content`, `uat_content`. These are null if files don't exist.

**If `planning_exists` is false:** Error — run `/gsd:new-project` first.

## 1.5. Automatic Team Detection

Teams are automatically engaged when multi-domain work is detected. No manual initialization required.

```bash
GSD_TOOLS=~/.claude/get-stuff-done/bin/gsd-tools.cjs
TEAM_AUTO=$(node "$GSD_TOOLS" config-get team.auto 2>/dev/null || echo "true")
```

**If `TEAM_AUTO` is "false":** Skip entirely — proceed to Step 2 (solo workflow).

**If `TEAM_AUTO` is "true" (default):**

1. **Analyze phase content to detect which domains are needed:**

Read the phase goal from ROADMAP.md, any CONTEXT.md, and RESEARCH.md. Scan for domain signals:

| Detected Content | Team Domain | Agent Spawned |
|-----------------|-------------|---------------|
| Frontend/UI tasks (components, pages, styling, React, CSS) | `frontend` | gsd-team-planner domain=frontend |
| Backend/API tasks (endpoints, services, middleware, Express, routes) | `backend` | gsd-team-planner domain=backend |
| Auth/security requirements (login, permissions, encryption, JWT) | `security` | gsd-team-planner domain=security |
| Infrastructure tasks (deploy, CI/CD, hosting, Docker) | `devops` | gsd-team-planner domain=devops |
| Database/schema tasks (models, migrations, queries, Prisma) | `data` | gsd-team-planner domain=data |
| Testing requirements (test setup, coverage, E2E) | `testing` | gsd-team-planner domain=testing |

2. **Decide team vs solo mode based on domain count:**

- **1 domain detected:** Use solo planning (Step 8a) — team overhead unnecessary
- **2+ domains detected:** Use team planning (Step 8b) — parallel specialist planners

Set `TEAM_PLANNING=true` if 2+ domains detected, `false` otherwise.

3. **If team planning, scaffold directories:**

```bash
mkdir -p ".planning/phases/${PHASE_DIR}/teams"
for DOMAIN in $DETECTED_DOMAINS; do
  mkdir -p ".planning/phases/${PHASE_DIR}/teams/${DOMAIN}"
done
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEAMS AUTO-DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ {N} domains detected: {list of domain names}
◆ Using team planning with parallel specialist planners
```

**If only 1 domain detected:**
```
◆ Single domain detected: {domain}
◆ Using solo planning (team overhead not needed)
```

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS: phase number (integer or decimal like `2.1`), flags (`--research`, `--skip-research`, `--gaps`, `--skip-verify`).

**If no phase number:** Detect next unplanned phase from roadmap.

**If `phase_found` is false:** Validate phase exists in ROADMAP.md. If valid, create the directory using `phase_slug` and `padded_phase` from init:
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

**Existing artifacts from init:** `has_research`, `has_plans`, `plan_count`.

## 3. Validate Phase

```bash
PHASE_INFO=$(node ~/.claude/get-stuff-done/bin/gsd-tools.cjs roadmap get-phase "${PHASE}")
```

**If `found` is false:** Error with available phases. **If `found` is true:** Extract `phase_number`, `phase_name`, `goal` from JSON.

## 4. Load CONTEXT.md

Use `context_content` from init JSON (already loaded via `--include context`).

**CRITICAL:** Use `context_content` from INIT — pass to researcher, planner, checker, and revision agents.

If `context_content` is not null, display: `Using phase context from: ${PHASE_DIR}/*-CONTEXT.md`

## 5. Handle Research

**Skip if:** `--gaps` flag, `--skip-research` flag, or `research_enabled` is false (from init) without `--research` override.

**If `has_research` is true (from init) AND no `--research` flag:** Use existing, skip to step 6.

**If RESEARCH.md missing OR `--research` flag:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning researcher...
```

### Spawn gsd-phase-researcher

```bash
PHASE_DESC=$(node ~/.claude/get-stuff-done/bin/gsd-tools.cjs roadmap get-phase "${PHASE}" | jq -r '.section')
# Use requirements_content from INIT (already loaded via --include requirements)
REQUIREMENTS=$(echo "$INIT" | jq -r '.requirements_content // empty' | grep -A100 "## Requirements" | head -50)
STATE_SNAP=$(node ~/.claude/get-stuff-done/bin/gsd-tools.cjs state-snapshot)
# Extract decisions from state-snapshot JSON: jq '.decisions[] | "\(.phase): \(.summary) - \(.rationale)"'
```

Research prompt:

```markdown
<objective>
Research how to implement Phase {phase_number}: {phase_name}
Answer: "What do I need to know to PLAN this phase well?"
</objective>

<phase_context>
IMPORTANT: If CONTEXT.md exists below, it contains user decisions from /gsd:discuss-phase.
- **Decisions** = Locked — research THESE deeply, no alternatives
- **Claude's Discretion** = Freedom areas — research options, recommend
- **Deferred Ideas** = Out of scope — ignore

{context_content}
</phase_context>

<additional_context>
**Phase description:** {phase_description}
**Requirements:** {requirements}
**Prior decisions:** {decisions}
</additional_context>

<output>
Write to: {phase_dir}/{phase}-RESEARCH.md
</output>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-phase-researcher.md for your role and instructions.\n\n" + research_prompt,
  subagent_type="general-purpose",
  model="{researcher_model}",
  description="Research Phase {phase}"
)
```

### Handle Researcher Return

- **`## RESEARCH COMPLETE`:** Display confirmation, continue to step 6
- **`## RESEARCH BLOCKED`:** Display blocker, offer: 1) Provide context, 2) Skip research, 3) Abort

## 6. Check Existing Plans

```bash
ls "${PHASE_DIR}"/*-PLAN.md 2>/dev/null
```

**If exists:** Offer: 1) Add more plans, 2) View existing, 3) Replan from scratch.

## 7. Use Context Files from INIT

All file contents are already loaded via `--include` in step 1 (`@` syntax doesn't work across Task() boundaries):

```bash
# Extract from INIT JSON (no need to re-read files)
STATE_CONTENT=$(echo "$INIT" | jq -r '.state_content // empty')
ROADMAP_CONTENT=$(echo "$INIT" | jq -r '.roadmap_content // empty')
REQUIREMENTS_CONTENT=$(echo "$INIT" | jq -r '.requirements_content // empty')
RESEARCH_CONTENT=$(echo "$INIT" | jq -r '.research_content // empty')
VERIFICATION_CONTENT=$(echo "$INIT" | jq -r '.verification_content // empty')
UAT_CONTENT=$(echo "$INIT" | jq -r '.uat_content // empty')
CONTEXT_CONTENT=$(echo "$INIT" | jq -r '.context_content // empty')
```

## 8. Plan Creation

Use the team detection result from Step 1.5:

### 8a. Solo Planning (single domain or team.auto disabled)

**If `TEAM_PLANNING` is false (1 domain or team.auto=false):**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLANNING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning planner...
```

Planner prompt:

```markdown
<planning_context>
**Phase:** {phase_number}
**Mode:** {standard | gap_closure}

**Project State:** {state_content}
**Roadmap:** {roadmap_content}
**Requirements:** {requirements_content}

**Phase Context:**
IMPORTANT: If context exists below, it contains USER DECISIONS from /gsd:discuss-phase.
- **Decisions** = LOCKED — honor exactly, do not revisit
- **Claude's Discretion** = Freedom — make implementation choices
- **Deferred Ideas** = Out of scope — do NOT include

{context_content}

**Research:** {research_content}
**Gap Closure (if --gaps):** {verification_content} {uat_content}
</planning_context>

<downstream_consumer>
Output consumed by /gsd:execute-phase. Plans need:
- Frontmatter (wave, depends_on, files_modified, autonomous)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
- [ ] PLAN.md files created in phase directory
- [ ] Each plan has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] Dependencies correctly identified
- [ ] Waves assigned for parallel execution
- [ ] must_haves derived from phase goal
</quality_gate>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-planner.md for your role and instructions.\n\n" + filled_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Plan Phase {phase}"
)
```

### 8b. Team Planning (2+ domains auto-detected)

**If `TEAM_PLANNING` is true (2+ domains detected):**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEAM PLANNING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning {N} team planners in parallel...
  → {domain1} team planner
  → {domain2} team planner
  → ...
```

#### Step 1: Load existing contracts (if any)

```bash
EXISTING_CONTRACTS=""
if [ -f ".planning/phases/${PHASE_DIR}/teams/CONTRACTS.md" ]; then
  EXISTING_CONTRACTS=$(cat ".planning/phases/${PHASE_DIR}/teams/CONTRACTS.md")
fi
```

#### Step 2: Spawn parallel team planners (one per detected domain)

For each detected team domain from Step 1.5, spawn in parallel:

```
Task(
  prompt="<team_context>
    <domain>{domain}</domain>
    <phase>
      <phase_number>{phase_number}</phase_number>
      <phase_name>{phase_name}</phase_name>
      <phase_goal>{goal from ROADMAP}</phase_goal>
    </phase>
    <requirements>{requirements_content}</requirements>
    <research>{research_content}</research>
    <context>
      IMPORTANT: If context exists below, it contains USER DECISIONS from /gsd:discuss-phase.
      - Decisions = LOCKED — honor exactly, do not revisit
      - Claude's Discretion = Freedom — make implementation choices
      - Deferred Ideas = Out of scope — do NOT include

      {context_content}
    </context>
    <contracts>{existing_contracts}</contracts>
    <project_state>{state_content}</project_state>
    <roadmap>{roadmap_content}</roadmap>
  </team_context>

  <output>
  Write team plan to: .planning/phases/{phase_dir}/teams/{domain}/{phase}-{plan_number}-TEAM-PLAN.md
  Include in frontmatter: team, domain, wave, depends_on, files_modified, contracts_required
  </output>

  <quality_gate>
  - [ ] TEAM-PLAN.md created in team directory
  - [ ] Frontmatter includes team domain and contract requirements
  - [ ] Tasks scoped to this team's domain only
  - [ ] Cross-team dependencies explicitly declared in contracts_required
  - [ ] Interface contracts defined (API shapes, data formats, shared types)
  </quality_gate>",
  subagent_type="gsd-team-planner",
  model="{team_planner_model}",
  description="Team Plan: {domain} for Phase {phase}"
)
```

#### Step 3: Synthesize team plans

After all team planners complete, spawn team synthesizer to merge plans into unified PLAN.md files:

```
Task(
  prompt="<synthesis_context>
    <phase>
      <phase_number>{phase_number}</phase_number>
      <phase_name>{phase_name}</phase_name>
      <phase_goal>{goal from ROADMAP}</phase_goal>
    </phase>
    <team_plans>
      Read all TEAM-PLAN.md files from: .planning/phases/{phase_dir}/teams/*/
    </team_plans>
    <requirements>{requirements_content}</requirements>
    <research>{research_content}</research>
    <context>{context_content}</context>
  </synthesis_context>

  <instructions>
  1. Read all TEAM-PLAN.md files from each team subdirectory
  2. Merge into unified PLAN.md files in the phase directory
  3. Resolve wave ordering across teams (respect inter-team dependencies)
  4. Generate CONTRACTS.md with interface agreements between teams
  5. Write SYNTHESIS.md summarizing how team plans were merged
  </instructions>

  <output>
  Write to:
  - .planning/phases/{phase_dir}/*-PLAN.md (unified plans)
  - .planning/phases/{phase_dir}/teams/CONTRACTS.md (interface contracts)
  - .planning/phases/{phase_dir}/teams/SYNTHESIS.md (merge summary)
  </output>",
  subagent_type="gsd-team-synthesizer",
  model="{team_synthesizer_model}",
  description="Synthesize team plans for Phase {phase}"
)
```

#### Step 4: Check for cross-team conflicts

```bash
CONFLICTS=$(node "$GSD_TOOLS" team-conflicts --phase "${PHASE}")
```

**If conflicts found:**

Write conflicts to `.planning/phases/${PHASE_DIR}/teams/CONFLICTS.md`.

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TEAM CONFLICTS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} conflict(s) found between team plans:

{conflict_summary}

Options:
1. Auto-resolve — let coordinator handle (Recommended)
2. Manual review — review CONFLICTS.md and decide
```

If auto-resolve: Spawn gsd-team-coordinator to resolve conflicts, then re-run synthesis.
If manual review: Present CONFLICTS.md, get user decisions, update plans accordingly.

**If no conflicts:** Display confirmation and continue.

#### Step 5: Proceed to plan-checker (Step 10) with synthesized PLAN.md files

The plan-checker receives the unified PLAN.md files (same as solo mode). Team provenance is preserved in plan frontmatter (`team` field) for downstream execution routing.

## 9. Handle Planner Return

- **`## PLANNING COMPLETE`:** Display plan count. If `--skip-verify` or `plan_checker_enabled` is false (from init): skip to step 13. Otherwise: step 10.
- **`## CHECKPOINT REACHED`:** Present to user, get response, spawn continuation (step 12)
- **`## PLANNING INCONCLUSIVE`:** Show attempts, offer: Add context / Retry / Manual

## 10. Spawn gsd-plan-checker Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan checker...
```

```bash
PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)
```

Checker prompt:

```markdown
<verification_context>
**Phase:** {phase_number}
**Phase Goal:** {goal from ROADMAP}

**Plans to verify:** {plans_content}
**Requirements:** {requirements_content}

**Phase Context:**
IMPORTANT: Plans MUST honor user decisions. Flag as issue if plans contradict.
- **Decisions** = LOCKED — plans must implement exactly
- **Claude's Discretion** = Freedom areas — plans can choose approach
- **Deferred Ideas** = Out of scope — plans must NOT include

{context_content}
</verification_context>

<expected_output>
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="Verify Phase {phase} plans"
)
```

## 11. Handle Checker Return

- **`## VERIFICATION PASSED`:** Display confirmation, proceed to step 13.
- **`## ISSUES FOUND`:** Display issues, check iteration count, proceed to step 12.

## 12. Revision Loop (Max 3 Iterations)

Track `iteration_count` (starts at 1 after initial plan + check).

**If iteration_count < 3:**

Display: `Sending back to planner for revision... (iteration {N}/3)`

```bash
PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)
```

Revision prompt:

```markdown
<revision_context>
**Phase:** {phase_number}
**Mode:** revision

**Existing plans:** {plans_content}
**Checker issues:** {structured_issues_from_checker}

**Phase Context:**
Revisions MUST still honor user decisions.
{context_content}
</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-planner.md for your role and instructions.\n\n" + revision_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Revise Phase {phase} plans"
)
```

After planner returns -> spawn checker again (step 10), increment iteration_count.

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:` + issue list

Offer: 1) Force proceed, 2) Provide guidance and retry, 3) Abandon

## 13. Present Final Status

Route to `<offer_next>` OR `auto_advance` depending on flags/config.

## 14. Auto-Advance Check

Check for auto-advance trigger:

1. Parse `--auto` flag from $ARGUMENTS
2. Read `workflow.auto_advance` from config:
   ```bash
   AUTO_CFG=$(node ~/.claude/get-stuff-done/bin/gsd-tools.cjs config get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CFG` is true:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTO-ADVANCING TO EXECUTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans ready. Spawning execute-phase...
```

Spawn execute-phase as Task:
```
Task(
  prompt="Run /gsd:execute-phase ${PHASE}",
  subagent_type="general-purpose",
  description="Execute Phase ${PHASE}"
)
```

**Handle execute-phase return:**
- **PHASE COMPLETE** → Display final summary:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GSD ► PHASE ${PHASE} COMPLETE ✓
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Auto-advance pipeline finished.

  Next: /gsd:discuss-phase ${NEXT_PHASE} --auto
  ```
- **GAPS FOUND / VERIFICATION FAILED** → Display result, stop chain:
  ```
  Auto-advance stopped: Execution needs review.

  Review the output above and continue manually:
  /gsd:execute-phase ${PHASE}
  ```

**If neither `--auto` nor config enabled:**
Route to `<offer_next>` (existing behavior).

</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/gsd:execute-phase {X}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase-dir}/*-PLAN.md — review plans
- /gsd:plan-phase {X} --research — re-research first

───────────────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] .planning/ directory validated
- [ ] Phase validated against roadmap
- [ ] Phase directory created if needed
- [ ] CONTEXT.md loaded early (step 4) and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] gsd-phase-researcher spawned with CONTEXT.md
- [ ] Existing plans checked
- [ ] gsd-planner spawned with CONTEXT.md + RESEARCH.md
- [ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)
- [ ] gsd-plan-checker spawned with CONTEXT.md
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps
</success_criteria>
