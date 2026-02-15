# Team State Format

Defines the shared state format for team coordination. Team state files are the machine-readable mechanism by which agents communicate progress, status, and completion across team boundaries.

<file_location>

## File Location

```
.planning/.team-state/{phase}-{plan}-{team}.json
```

**Examples:**
```
.planning/.team-state/02-01-backend.json      # Phase 02, Plan 01, backend team
.planning/.team-state/02-01-security.json      # Phase 02, Plan 01, security team
.planning/.team-state/03-02-frontend.json      # Phase 03, Plan 02, frontend team
```

**Directory structure:**
```
.planning/
├── .team-state/
│   ├── 02-01-backend.json
│   ├── 02-01-security.json
│   ├── 02-01-data.json
│   ├── 02-02-backend.json
│   ├── 02-02-frontend.json
│   └── _phase-02-summary.json    # Phase-level aggregate (written by coordinator)
├── phases/
│   └── 02-auth/
│       └── teams/
│           ├── backend/
│           ├── frontend/
│           ├── security/
│           ├── CONTRACTS.md
│           └── SYNTHESIS.md
└── config.json
```

**Naming convention:** `{phase_number}-{plan_number}-{team_domain}.json`
- Phase number: zero-padded two digits (e.g., `02`)
- Plan number: zero-padded two digits (e.g., `01`)
- Team domain: lowercase team name (e.g., `backend`, `frontend`, `security`)

</file_location>

<json_schema>

## JSON Schema

### Team Plan State (per plan per team)

```json
{
  "$schema": "team-state-v1",
  "phase": "02-authentication",
  "plan": "01",
  "team": "backend",
  "assigned_team": "team-alpha",
  "assigned_member": "gsd-executor-01",

  "status": "complete",
  "status_history": [
    { "status": "pending", "timestamp": "2025-01-15T14:00:00Z", "actor": "gsd-team-coordinator" },
    { "status": "assigned", "timestamp": "2025-01-15T14:01:00Z", "actor": "gsd-team-coordinator" },
    { "status": "in_progress", "timestamp": "2025-01-15T14:02:00Z", "actor": "gsd-executor-01" },
    { "status": "complete", "timestamp": "2025-01-15T14:28:00Z", "actor": "gsd-executor-01" }
  ],

  "wave": 1,
  "started_at": "2025-01-15T14:02:00Z",
  "completed_at": "2025-01-15T14:28:00Z",
  "duration_minutes": 26,

  "tasks": {
    "total": 3,
    "completed": 3,
    "failed": 0,
    "details": [
      {
        "id": "task-1",
        "name": "Create auth API endpoints",
        "status": "complete",
        "commit": "abc123f",
        "completed_at": "2025-01-15T14:10:00Z"
      },
      {
        "id": "task-2",
        "name": "Add token validation",
        "status": "complete",
        "commit": "def456g",
        "completed_at": "2025-01-15T14:18:00Z"
      },
      {
        "id": "task-3",
        "name": "Add error handling",
        "status": "complete",
        "commit": "hij789k",
        "completed_at": "2025-01-15T14:26:00Z"
      }
    ]
  },

  "contracts": {
    "fulfills": [
      {
        "id": "auth-api",
        "status": "implemented",
        "verified_at": null
      }
    ],
    "consumes": [
      {
        "id": "user-schema",
        "required_status": "implemented",
        "actual_status": "implemented",
        "satisfied": true
      }
    ]
  },

  "artifacts": {
    "summary_path": ".planning/phases/02-auth/teams/backend/02-01-SUMMARY.md",
    "files_created": [
      "src/app/api/auth/login/route.ts",
      "src/app/api/auth/logout/route.ts",
      "src/app/api/auth/refresh/route.ts",
      "src/lib/auth/tokens.ts"
    ],
    "files_modified": [
      "src/middleware.ts"
    ]
  },

  "dependencies": {
    "blocked_by": [],
    "blocking": ["02-02-frontend", "02-02-security"]
  },

  "errors": [],

  "metadata": {
    "model_used": "opus",
    "context_tokens_used": 245000,
    "plan_path": ".planning/phases/02-auth/teams/backend/02-01-TEAM-PLAN.md"
  }
}
```

### Phase Aggregate State (per phase)

Written by gsd-team-coordinator after each wave completes. File: `_phase-{NN}-summary.json`

```json
{
  "$schema": "team-phase-state-v1",
  "phase": "02-authentication",
  "status": "in_progress",

  "waves": {
    "total": 3,
    "completed": 2,
    "current": 3,
    "details": [
      {
        "wave": 1,
        "status": "complete",
        "teams": ["data", "security"],
        "completed_at": "2025-01-15T14:28:00Z"
      },
      {
        "wave": 2,
        "status": "complete",
        "teams": ["backend"],
        "completed_at": "2025-01-15T14:55:00Z"
      },
      {
        "wave": 3,
        "status": "in_progress",
        "teams": ["frontend", "security"],
        "started_at": "2025-01-15T14:56:00Z"
      }
    ]
  },

  "teams": {
    "backend": { "plans_total": 2, "plans_complete": 2, "status": "complete" },
    "frontend": { "plans_total": 1, "plans_complete": 0, "status": "in_progress" },
    "security": { "plans_total": 2, "plans_complete": 1, "status": "in_progress" },
    "data": { "plans_total": 1, "plans_complete": 1, "status": "complete" }
  },

  "contracts": {
    "total": 4,
    "draft": 0,
    "agreed": 0,
    "implemented": 2,
    "verified": 2
  },

  "conflicts": {
    "open": 0,
    "resolved": 1
  }
}
```

</json_schema>

<state_lifecycle>

## State Lifecycle

```
pending → assigned → in_progress → complete → verified
                 ↘                     ↗
                  failed → retrying ──┘
```

### Status Definitions

| Status | Meaning | Set By | Transitions To |
|--------|---------|--------|----------------|
| `pending` | Plan exists but not yet assigned to an executor | gsd-team-coordinator | `assigned` |
| `assigned` | Executor designated, waiting for wave gate | gsd-team-coordinator | `in_progress` |
| `in_progress` | Executor is actively working on this plan | Team executor | `complete`, `failed` |
| `complete` | All tasks done, SUMMARY.md written | Team executor | `verified` |
| `verified` | gsd-team-verifier confirmed output quality | gsd-team-verifier | (terminal) |
| `failed` | Executor encountered unrecoverable error | Team executor | `retrying` |
| `retrying` | New executor spawned for retry attempt | gsd-team-coordinator | `in_progress` |

### Transition Rules

**pending → assigned:**
```
Preconditions:
  - Plan file exists (TEAM-PLAN.md)
  - All consumed contracts are at status "agreed" or better
  - Config resolved (model profile, team assignment)
Actor: gsd-team-coordinator
Action: Set assigned_team and assigned_member fields
```

**assigned → in_progress:**
```
Preconditions:
  - Wave gate is open (all prior wave plans complete)
  - All blocking dependencies satisfied
Actor: Team executor (on start)
Action: Set started_at timestamp
```

**in_progress → complete:**
```
Preconditions:
  - All tasks in plan completed
  - SUMMARY.md written
  - Contracts this plan fulfills marked "implemented"
Actor: Team executor (on finish)
Action: Set completed_at, duration_minutes, task details, artifact paths
```

**in_progress → failed:**
```
Preconditions:
  - Executor encountered unrecoverable error
  - OR: Executor timed out
  - OR: Context window exhausted without completion
Actor: Team executor or coordinator (on detection)
Action: Set errors array with failure details
```

**failed → retrying:**
```
Preconditions:
  - Coordinator decides to retry
  - Retry count < max_retries (default: 1)
Actor: gsd-team-coordinator
Action: Reset status, increment retry_count, assign new executor
```

**complete → verified:**
```
Preconditions:
  - gsd-team-verifier checked artifacts against must_haves
  - All fulfilled contracts marked "verified" in CONTRACTS.md
  - Cross-team wiring checks pass
Actor: gsd-team-verifier
Action: Final status, no further transitions
```

</state_lifecycle>

<conflict_detection>

## Conflict Detection via State Comparison

Team state files enable automated conflict detection by comparing expected vs actual state across teams.

### File Conflict Detection

Two teams should never modify the same file. Detect by comparing `artifacts.files_created` and `artifacts.files_modified` across all team state files in the same phase:

```javascript
// Pseudo-code for file conflict detection
function detectFileConflicts(phaseStates) {
  const fileOwners = {};

  for (const state of phaseStates) {
    const allFiles = [
      ...state.artifacts.files_created,
      ...state.artifacts.files_modified
    ];

    for (const file of allFiles) {
      if (fileOwners[file]) {
        return {
          conflict: true,
          file: file,
          teams: [fileOwners[file], state.team],
          resolution: "Assign file ownership to one team, other team uses contract"
        };
      }
      fileOwners[file] = state.team;
    }
  }

  return { conflict: false };
}
```

### Contract Conflict Detection

Check that consumed contracts are actually fulfilled:

```javascript
function detectContractConflicts(phaseStates) {
  const fulfilled = new Set();
  const consumed = [];

  // Collect all fulfilled contracts
  for (const state of phaseStates) {
    for (const contract of state.contracts.fulfills) {
      if (contract.status === "implemented" || contract.status === "verified") {
        fulfilled.add(contract.id);
      }
    }
  }

  // Check all consumed contracts are fulfilled
  for (const state of phaseStates) {
    for (const contract of state.contracts.consumes) {
      if (!fulfilled.has(contract.id)) {
        consumed.push({
          conflict: true,
          contract_id: contract.id,
          consumer_team: state.team,
          resolution: "Owner team must complete contract before consumer proceeds"
        });
      }
    }
  }

  return consumed;
}
```

### Dependency Deadlock Detection

Check for circular dependencies between team states:

```javascript
function detectDeadlocks(phaseStates) {
  // Build dependency graph
  const graph = {};
  for (const state of phaseStates) {
    const key = `${state.phase}-${state.plan}-${state.team}`;
    graph[key] = state.dependencies.blocked_by;
  }

  // Check for cycles using DFS
  // If A blocks B and B blocks A: deadlock
  return findCycles(graph);
}
```

### Stale State Detection

Detect team states that have been "in_progress" longer than expected:

```javascript
function detectStaleStates(phaseStates, maxDurationMinutes = 60) {
  const now = new Date();
  const stale = [];

  for (const state of phaseStates) {
    if (state.status === "in_progress" && state.started_at) {
      const elapsed = (now - new Date(state.started_at)) / 60000;
      if (elapsed > maxDurationMinutes) {
        stale.push({
          team: state.team,
          plan: state.plan,
          elapsed_minutes: Math.round(elapsed),
          action: "Check executor status, consider timeout and retry"
        });
      }
    }
  }

  return stale;
}
```

</conflict_detection>

<reading_and_writing>

## Reading and Writing State

### Writing State (by executors)

Executors update their team state at key moments:

**On executor start:**
```bash
# Read existing state, update status
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state update \
  --phase "02" --plan "01" --team "backend" \
  --status "in_progress" \
  --started-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

**On task completion:**
```bash
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state task-complete \
  --phase "02" --plan "01" --team "backend" \
  --task-id "task-1" --commit "abc123f"
```

**On plan completion:**
```bash
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state complete \
  --phase "02" --plan "01" --team "backend" \
  --summary-path ".planning/phases/02-auth/teams/backend/02-01-SUMMARY.md" \
  --contracts-fulfilled "auth-api"
```

**On failure:**
```bash
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state fail \
  --phase "02" --plan "01" --team "backend" \
  --error "Context window exhausted at task-3"
```

### Reading State (by coordinator)

Coordinator reads state to make decisions:

```bash
# Get all team states for a phase
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state list --phase "02"

# Check if wave is complete
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state wave-check \
  --phase "02" --wave 1

# Detect conflicts
node ~/.claude/get-stuff-done/bin/gsd-tools.cjs team-state conflicts --phase "02"

# Get phase aggregate
cat .planning/.team-state/_phase-02-summary.json
```

### Direct JSON Access

When gsd-tools.cjs is not available, agents can read/write JSON directly:

```bash
# Read team state
cat .planning/.team-state/02-01-backend.json | jq '.status'

# Check all wave 1 team states
for f in .planning/.team-state/02-01-*.json; do
  echo "$(basename $f): $(jq -r '.status' $f)"
done

# Write minimal state update (careful — use gsd-tools.cjs when available)
jq '.status = "complete" | .completed_at = "2025-01-15T14:28:00Z"' \
  .planning/.team-state/02-01-backend.json > tmp && mv tmp .planning/.team-state/02-01-backend.json
```

</reading_and_writing>

<cleanup_protocol>

## Cleanup Protocol After Phase Completion

When a phase is fully complete (all teams verified), clean up team state files:

### Cleanup Steps

```
1. Verify phase is truly complete:
   - All team states in "verified" status
   - Phase aggregate shows status: "complete"
   - SYNTHESIS.md exists and is complete
   - All contracts in "verified" status

2. Archive team state files:
   - Move .planning/.team-state/{phase}-*.json to .planning/.team-state/archive/{phase}/
   - Keep _phase-{NN}-summary.json as the lasting record

3. Clean active directory:
   - Remove individual plan state files (archived)
   - Phase summary remains for reference

4. Commit cleanup:
   docs: archive team state for phase {phase}
```

### Archive Structure

```
.planning/.team-state/
├── archive/
│   ├── 01-foundation/
│   │   ├── 01-01-backend.json
│   │   ├── 01-01-data.json
│   │   └── _phase-01-summary.json
│   └── 02-authentication/
│       ├── 02-01-backend.json
│       ├── 02-01-security.json
│       ├── 02-02-frontend.json
│       └── _phase-02-summary.json
├── 03-01-frontend.json          # Active phase state files
├── 03-01-backend.json
└── _phase-03-summary.json
```

### When NOT to Clean Up

- Phase has unresolved conflicts in CONFLICTS.md
- Any team state shows "failed" without resolution
- Contracts still at "implemented" (not yet "verified")
- User explicitly requests keeping state for debugging

</cleanup_protocol>

<guidelines>

## Guidelines

- Team state files are the single source of truth for execution progress during a phase.
- Always use gsd-tools.cjs for state updates when available; direct JSON manipulation is a fallback.
- State transitions must follow the lifecycle rules. Never skip statuses (e.g., never go from "pending" directly to "complete").
- The status_history array provides an audit trail. Never delete entries, only append.
- File conflict detection should run before wave execution, not after.
- Contract conflict detection should run at wave gates.
- Archive team state after phase completion to keep the active directory clean.
- Cross-reference `~/.claude/get-stuff-done/references/team-orchestration.md` for how state fits into the overall coordination protocol.
- Cross-reference `~/.claude/get-stuff-done/references/team-handoff-protocol.md` for how state enables handoffs.

</guidelines>
