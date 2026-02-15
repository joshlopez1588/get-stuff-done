# Team Orchestration

Comprehensive reference for how teams coordinate within the GSD framework. Covers detection, routing, synchronization, and failure handling for multi-team execution.

<when_to_use_teams>

## Teams vs Solo: Decision Framework

Not every project needs teams. Use this decision tree:

**Use solo mode (default) when:**
- Single developer working on the project
- All work falls within one domain (all frontend, all backend)
- Phase has fewer than 3 plans
- No cross-domain contracts needed
- Coordination overhead would exceed the benefit

**Use team mode when:**
- Phase spans 2+ distinct domains with clear boundaries (e.g., frontend + backend + data)
- Cross-domain interfaces need formal contracts (API shapes, schemas)
- Domain expertise matters for quality (security review, data modeling)
- Parallel execution across domains would significantly reduce phase duration
- The project has established team patterns from prior phases

**Decision matrix:**

| Domains Involved | Plans in Phase | Cross-Domain Interfaces | Recommendation |
|-----------------|----------------|------------------------|----------------|
| 1 | Any | None | Solo |
| 2 | 2-3 | 1-2 simple | Solo (contracts optional) |
| 2 | 4+ | 2+ with shared state | Teams |
| 3+ | Any | Any | Teams |
| Any | Any | Auth/Security critical | Teams (security team) |

**Config toggle:**
```json
{
  "team": {
    "enabled": false,   // Toggle to true to activate
    "mode": "solo",     // "solo", "coordinated", "full"
    "auto_detect": true // Let GSD recommend team mode based on phase analysis
  }
}
```

</when_to_use_teams>

<team_detection>

## Team Detection Algorithm

When `team.auto_detect: true`, the `analyze-teams` step during `plan-phase` determines whether the current phase benefits from team coordination.

**Detection inputs:**
1. Phase goal and description from ROADMAP.md
2. Files likely to be modified (from phase research)
3. Technologies and frameworks involved
4. Prior phase patterns (if teams were used before)

**Detection logic:**

```
1. SCAN phase goal for domain keywords:
   - Frontend signals: "UI", "component", "page", "form", "responsive", "CSS", "layout"
   - Backend signals: "API", "endpoint", "route", "middleware", "server", "handler"
   - Security signals: "auth", "permission", "role", "encrypt", "audit", "token"
   - Data signals: "schema", "migration", "model", "query", "index", "seed"
   - DevOps signals: "deploy", "CI/CD", "Docker", "monitor", "pipeline", "hosting"

2. COUNT distinct domains with 2+ signals each

3. ANALYZE file paths for domain clustering:
   - src/components/*, src/app/*, src/hooks/* → frontend
   - src/api/*, src/server/*, src/lib/* → backend
   - src/auth/*, src/middleware/auth* → security
   - prisma/*, src/db/*, migrations/* → data
   - .github/*, docker/*, infra/* → devops

4. DETECT cross-domain interfaces:
   - Frontend file imports from backend API path → API contract needed
   - API route imports from database client → Data contract needed
   - Multiple domains import from shared auth → Security contract needed

5. RECOMMEND:
   - 1 domain: solo
   - 2 domains, simple interfaces: solo with optional contracts
   - 2 domains, complex interfaces: coordinated (2 teams)
   - 3+ domains: full team mode
```

**Output format (presented to user):**

```
Team Analysis for Phase 03: Core Features
──────────────────────────────────────────
Domains detected: frontend (8 signals), backend (6 signals), data (3 signals)
Cross-domain interfaces: 4 (2 API, 1 data, 1 shared-component)
Recommendation: TEAM MODE (coordinated)
  - team-frontend: Dashboard UI, settings forms, data display
  - team-backend: Feature APIs, business logic, validation
  - team-data: Feature schema additions

Proceed with team mode? [Y/n]
```

</team_detection>

<team_routing>

## Team Routing in Workflows

How teams are integrated into existing GSD workflows.

### plan-phase (with teams)

```
plan-phase
├── 1. Load state (standard)
├── 2. Research phase (standard)
├── 3. Analyze teams (NEW - team detection)
│   ├── Run detection algorithm
│   ├── Present recommendation to user
│   └── User confirms team assignments
├── 4. Create contracts (NEW)
│   ├── gsd-team-planner identifies cross-team interfaces
│   ├── Writes CONTRACTS.md with draft contracts
│   └── gsd-team-coordinator reviews and marks "agreed"
├── 5. Generate team plans (MODIFIED)
│   ├── One TEAM-PLAN.md per team per wave
│   ├── Standard frontmatter + team fields
│   └── Plans reference CONTRACTS.md
├── 6. Generate team matrix (NEW)
│   ├── Update TEAM-MATRIX.md with phase assignments
│   └── Define wave dependencies
└── 7. User review (standard, expanded for contracts)
```

### execute-phase (with teams)

```
execute-phase
├── 1. Load state + team state (MODIFIED)
│   ├── Read .planning/.team-state/*.json
│   └── Determine which teams have pending work
├── 2. Execute by wave (MODIFIED)
│   ├── Wave N:
│   │   ├── Identify all team plans in wave N
│   │   ├── Spawn executor per team plan (parallel within wave)
│   │   ├── Each executor uses team-specific model profile
│   │   └── Wait for all wave N executors to complete
│   ├── Synchronization gate:
│   │   ├── gsd-team-verifier checks contract compliance
│   │   ├── Update .team-state/*.json
│   │   └── Resolve conflicts if any
│   └── Proceed to wave N+1
├── 3. Cross-team verification (NEW)
│   ├── gsd-team-verifier checks all contracts fulfilled
│   ├── Integration tests across team boundaries
│   └── Report conflicts to gsd-team-coordinator
├── 4. Synthesis (NEW)
│   ├── gsd-team-synthesizer merges team summaries
│   ├── Creates SYNTHESIS.md for the phase
│   └── Identifies knowledge transfers needed
└── 5. Standard completion (update STATE.md, etc.)
```

### verify-work (with teams)

```
verify-work
├── 1. Standard must-haves verification
├── 2. Contract verification (NEW)
│   ├── For each contract in CONTRACTS.md:
│   │   ├── Check owner team's artifacts match contract spec
│   │   ├── Check consumer team's usage matches contract spec
│   │   └── Mark contract status: implemented → verified
│   └── Report unverified contracts
├── 3. Cross-team wiring (NEW)
│   ├── Verify frontend components call correct API endpoints
│   ├── Verify API routes query correct database models
│   └── Verify event publishers and subscribers are wired
└── 4. Standard verification report
```

</team_routing>

<wave_ordering>

## Wave Ordering with Cross-Team Dependencies

Waves are computed at plan-phase time. With teams, wave ordering must account for cross-team dependencies in addition to intra-team plan dependencies.

**Wave assignment rules:**

1. Plans with no dependencies → Wave 1
2. Plans depending only on Wave 1 plans → Wave 2
3. Plans depending on Wave N plans → Wave N+1
4. Cross-team dependencies add implicit ordering: if team-frontend Plan 02 depends on team-backend Plan 01, frontend Plan 02 cannot be in a wave earlier than backend Plan 01's wave + 1

**Example:**

```
Wave 1 (parallel):
  team-data:    01-01-TEAM-PLAN.md (schema + migration)
  team-backend: 01-01-TEAM-PLAN.md (project scaffold)
  team-devops:  01-01-TEAM-PLAN.md (docker compose)

  ──── synchronization gate: schema ready ────

Wave 2 (parallel):
  team-backend: 01-02-TEAM-PLAN.md (API endpoints, depends on schema)
  team-security: 01-01-TEAM-PLAN.md (auth middleware, depends on schema)

  ──── synchronization gate: API + auth ready ────

Wave 3 (parallel):
  team-frontend: 01-01-TEAM-PLAN.md (UI components, depends on API + auth)
  team-security: 01-02-TEAM-PLAN.md (audit logging, depends on API)
```

**Dependency resolution:**

```
For each team plan P:
  wave(P) = max(
    wave of each plan in P.depends_on + 1,
    wave of each cross-team dependency in P.team_dependencies + 1,
    1  # minimum wave
  )
```

</wave_ordering>

<artifact_flow>

## Artifact Flow Between Teams

Who writes what, who reads what:

### Planning Artifacts

| Artifact | Written By | Read By | Location |
|----------|-----------|---------|----------|
| TEAM-PLAN.md | gsd-team-planner | Assigned executor | `.planning/phases/{phase}/teams/{team}/` |
| CONTRACTS.md | gsd-team-planner → gsd-team-coordinator | All teams | `.planning/phases/{phase}/teams/` |
| CONFLICTS.md | gsd-team-coordinator | User, all teams | `.planning/phases/{phase}/teams/` |
| TEAM-MATRIX.md | gsd-team-planner | All agents | `.planning/` |

### Execution Artifacts

| Artifact | Written By | Read By | Location |
|----------|-----------|---------|----------|
| SUMMARY.md | Team executor (post-plan) | Next wave teams, synthesizer | `.planning/phases/{phase}/teams/{team}/` |
| Team state JSON | Team executor | Coordinator, next wave | `.planning/.team-state/` |
| SYNTHESIS.md | gsd-team-synthesizer | Next phase planners | `.planning/phases/{phase}/teams/` |

### Verification Artifacts

| Artifact | Written By | Read By | Location |
|----------|-----------|---------|----------|
| VERIFICATION.md | gsd-team-verifier | Coordinator, user | `.planning/phases/{phase}/` |
| Contract status updates | gsd-team-verifier | All teams | Updates CONTRACTS.md in-place |

### Flow diagram

```
gsd-team-planner
  ├── writes TEAM-PLAN.md (per team)
  ├── writes CONTRACTS.md (shared)
  └── updates TEAM-MATRIX.md

gsd-team-coordinator
  ├── reviews CONTRACTS.md (draft → agreed)
  ├── resolves CONFLICTS.md
  └── orchestrates wave execution

team executors (per team, parallel within wave)
  ├── reads own TEAM-PLAN.md
  ├── reads CONTRACTS.md
  ├── writes code artifacts
  ├── writes SUMMARY.md
  └── updates .team-state/*.json

gsd-team-verifier
  ├── reads all SUMMARY.md files
  ├── reads CONTRACTS.md
  ├── checks contract compliance
  └── writes VERIFICATION.md

gsd-team-synthesizer
  ├── reads all team SUMMARY.md files
  ├── reads CONTRACTS.md
  ├── produces SYNTHESIS.md
  └── identifies knowledge transfers for next phase
```

</artifact_flow>

<synchronization_protocol>

## Synchronization Protocol

How teams coordinate during execution.

### Synchronization Points

| Point | When | What Happens | Who Manages |
|-------|------|-------------|-------------|
| Wave gate | Between waves | All wave N plans complete before wave N+1 starts | gsd-team-coordinator |
| Contract check | After owner completes | Verify artifact matches contract spec | gsd-team-verifier |
| Merge point | End of phase | All team outputs combined and verified | gsd-team-synthesizer |
| Handoff | Phase boundary | Context transferred to next phase teams | gsd-team-synthesizer |

### Wave Gate Protocol

```
1. All executors in wave N spawn in parallel
2. Each executor runs independently
3. As each executor completes:
   a. Write SUMMARY.md
   b. Update .team-state JSON to "complete"
   c. Signal coordinator
4. Coordinator waits for ALL wave N executors
5. If any executor fails:
   a. Check if failure is isolated (no downstream dependents)
   b. If isolated: mark failed, proceed with wave N+1 for non-dependent plans
   c. If blocking: retry once, then escalate to user
6. Run contract verification for wave N outputs
7. If contracts verified: proceed to wave N+1
8. If contracts fail: coordinator mediates resolution
```

### Contract Check Protocol

After each wave, for each contract with status "agreed":

```
1. Find owner team's artifacts for this wave
2. Check: does the artifact match the contract specification?
   - API: endpoint responds with correct shape and status codes
   - Data: schema fields match contract definition
   - Component: exports match interface specification
   - Event: publisher emits correct payload shape
3. If match: update contract status to "implemented"
4. If mismatch: log in CONFLICTS.md, notify coordinator
```

### Merge Point Protocol

At end of phase:

```
1. gsd-team-synthesizer reads all team SUMMARY.md files
2. Identifies:
   - Cross-team decisions that affect future phases
   - Patterns established by each team
   - Integration points that worked (and any that needed fixes)
3. Produces SYNTHESIS.md:
   - Combined accomplishment list
   - Unified decision log
   - Knowledge transfer recommendations
   - Contract status summary (all should be "verified")
4. Updates STATE.md with synthesized phase summary
```

</synchronization_protocol>

<failure_handling>

## Failure Handling

What happens when things go wrong in team execution.

### Executor Failure

**Scenario:** A team's executor agent fails mid-execution (context overflow, error, stuck).

**Protocol:**
```
1. Coordinator detects failure (no completion signal within timeout)
2. Check team-state JSON for last known progress
3. Assess impact:
   a. Which tasks were completed? (from partial SUMMARY or team-state)
   b. Which contracts were fulfilled? (check artifacts exist)
   c. Which downstream teams are blocked?
4. Recovery options (in priority order):
   a. RETRY: Spawn new executor with completed-task context, resume from failure point
   b. PARTIAL: Accept completed work, create fix plan for remaining tasks
   c. SKIP: If non-critical, proceed without this team's output (rare)
   d. ESCALATE: Present situation to user for decision
5. Update team-state with failure info
6. If downstream teams are blocked: notify them of delay
```

### Contract Violation

**Scenario:** Team A's output does not match the agreed contract.

**Protocol:**
```
1. gsd-team-verifier identifies mismatch
2. Log in CONFLICTS.md with details:
   - Which contract
   - Expected (from contract)
   - Actual (from artifact)
   - Severity (minor shape difference vs completely wrong)
3. gsd-team-coordinator assesses:
   a. Can consumer team adapt? (minor difference)
   b. Must owner team fix? (contract violation)
   c. Should contract be updated? (contract was wrong)
4. Resolution:
   a. FIX: Create fix plan for owner team, re-execute
   b. AMEND: Update CONTRACTS.md to match reality, notify consumers
   c. ESCALATE: Present options to user
```

### Cross-Team Integration Failure

**Scenario:** Individual team outputs work in isolation but fail when integrated.

**Protocol:**
```
1. gsd-team-verifier runs cross-team wiring checks
2. Identifies broken link (e.g., frontend calls /api/users but backend serves /api/user)
3. Determine root cause:
   a. Contract followed but contract itself was wrong → amend contract
   b. Contract not followed → fix the non-compliant artifact
   c. No contract existed for this interface → create contract, fix artifact
4. gsd-team-coordinator assigns fix to appropriate team
5. Re-verify after fix
```

</failure_handling>

<context_budget>

## Context Budget Management with Teams

Each agent operates within its own context window. With Opus 4.6, each agent has a 1 million token context window, which provides substantial room for complex team operations.

### Context allocation per agent role

| Agent | Context Priority | Primary Content | Typical Usage |
|-------|-----------------|-----------------|---------------|
| gsd-team-planner | Phase research, all team plans, contracts | ROADMAP, research output, CONTRACTS.md | 200-400K tokens |
| gsd-team-coordinator | All team states, contracts, conflicts | .team-state/*.json, CONTRACTS.md, CONFLICTS.md | 100-300K tokens |
| Team executor | Own plan + relevant contracts + source code | TEAM-PLAN.md, CONTRACTS.md, source files | 300-600K tokens |
| gsd-team-verifier | All team summaries, contracts, source code | SUMMARY.md files, CONTRACTS.md, artifacts | 300-500K tokens |
| gsd-team-synthesizer | All team summaries, contracts, matrix | SUMMARY.md files, CONTRACTS.md, TEAM-MATRIX.md | 200-400K tokens |

### Context isolation principle

Each agent gets a **fresh 1M context window**. This means:
- Team executors do not carry context from other teams (isolation prevents cross-contamination)
- Coordinators get a clean view of all team states (fresh perspective on conflicts)
- Verifiers see the combined output without execution bias

### What goes into each agent's context

**Team executor context load:**
```
1. Own TEAM-PLAN.md (2-5K tokens)
2. Relevant sections of CONTRACTS.md (1-3K tokens)
3. SYNTHESIS.md from prior phase (if exists, 2-5K tokens)
4. Source files listed in plan's <context> section (variable, 50-400K tokens)
5. PROJECT.md, ROADMAP.md, STATE.md (5-10K tokens)
6. Workflow instructions (execute-plan.md) (10-15K tokens)
```

Total typical load: 70-440K tokens of the 1M budget, leaving ample room for reasoning and code generation.

**Coordinator context load:**
```
1. All .team-state/*.json files (1-5K tokens total)
2. CONTRACTS.md (2-10K tokens)
3. CONFLICTS.md if exists (1-3K tokens)
4. TEAM-MATRIX.md (3-5K tokens)
5. Current wave's TEAM-PLAN.md files (5-15K tokens)
```

Total typical load: 12-38K tokens. Coordinators are lightweight by design.

### When context gets tight

With 1M tokens, context pressure is rare but possible in large codebases:

1. **Executor hitting limits:** Split the team plan into smaller plans (2 tasks max)
2. **Verifier hitting limits:** Verify one team at a time instead of all at once
3. **Synthesizer hitting limits:** Summarize individual summaries before merging

The 1M context window means you should prioritize **quality over token savings**. Include full file contents rather than snippets. Include complete contract definitions rather than references. The budget is generous enough to support thorough, high-quality reasoning.

</context_budget>

<agent_reference>

## Team Agent Roles

| Agent | Purpose | When Spawned |
|-------|---------|-------------|
| gsd-team-planner | Creates team plans, contracts, and matrix | During plan-phase |
| gsd-team-coordinator | Orchestrates cross-team execution, resolves conflicts | During execute-phase |
| gsd-team-verifier | Checks contract compliance, cross-team wiring | After each wave and at phase end |
| gsd-team-synthesizer | Merges team outputs, produces SYNTHESIS.md | At phase end |

See `~/.claude/get-stuff-done/references/team-model-profiles.md` for model assignments per agent.
See `~/.claude/get-stuff-done/references/team-handoff-protocol.md` for how teams pass work.
See `~/.claude/get-stuff-done/references/team-state-format.md` for shared state format.

</agent_reference>
