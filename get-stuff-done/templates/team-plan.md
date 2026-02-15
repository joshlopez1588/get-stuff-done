# Team Plan Template

> **Note:** This template extends the standard `phase-prompt.md` PLAN.md format with team coordination fields.
> Use this template when `config.json` has `team.enabled: true`. Otherwise, use the standard plan template.

Template for `.planning/phases/{phase}/teams/{team}/{phase}-{plan}-TEAM-PLAN.md` — team-scoped executable plans with cross-team coordination.

**Naming:** Use `{phase}-{plan}-TEAM-PLAN.md` format (e.g., `03-02-TEAM-PLAN.md` for Phase 3, Plan 2)

**Location:** Plans are stored under the team's directory:
```
.planning/phases/03-features/teams/frontend/03-02-TEAM-PLAN.md
.planning/phases/03-features/teams/backend/03-01-TEAM-PLAN.md
```

---

## File Template

```markdown
---
phase: XX-name
plan: NN
type: execute
wave: N
depends_on: []
files_modified: []
autonomous: true
user_setup: []

# Team fields (extends standard PLAN.md frontmatter)
team: frontend                    # Domain: frontend, backend, security, devops, data, fullstack
assigned_team: team-alpha         # Team identifier from config
assigned_member: gsd-executor-01  # Specific executor agent name
coordination_cost: low            # none, low, medium, high, critical
team_dependencies:
  - team: backend
    artifact: "API endpoints for /api/users"
    ready_by: wave-1
  - team: security
    artifact: "Auth middleware"
    ready_by: wave-1

# Goal-backward verification
must_haves:
  truths: []
  artifacts: []
  key_links: []
---

<objective>
[What this plan accomplishes for this team's domain]

Purpose: [Why this matters for the overall phase goal]
Output: [What artifacts will be created by this team]
Team scope: [What this team owns vs what other teams provide]
</objective>

<execution_context>
@~/.claude/get-stuff-done/workflows/execute-plan.md
@~/.claude/get-stuff-done/templates/summary.md
@~/.claude/get-stuff-done/references/team-orchestration.md
[If plan contains checkpoint tasks:]
@~/.claude/get-stuff-done/references/checkpoints.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# Team-specific context
@.planning/phases/XX-name/teams/CONTRACTS.md
@.planning/phases/XX-name/teams/SYNTHESIS.md

# Cross-team dependencies (only if this plan consumes their output)
@.planning/phases/XX-name/teams/backend/XX-01-SUMMARY.md

[Relevant source files:]
@src/path/to/relevant.ts
</context>

<team_tasks domain="frontend">

<task team="frontend" type="auto">
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <action>[Specific implementation for this team's domain]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria]</done>
  <contracts>[Contract IDs this task fulfills or depends on, e.g., "consumes: auth-api"]</contracts>
</task>

<task team="frontend" type="auto">
  <name>Task 2: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[Specific implementation]</action>
  <verify>[Command or check]</verify>
  <done>[Acceptance criteria]</done>
  <contracts>[Contract IDs, e.g., "fulfills: user-list-component"]</contracts>
</task>

</team_tasks>

<synchronization>
<!-- Cross-team sync points within this plan -->

<checkpoint wave="1" type="gate">
  <description>Backend API endpoints available</description>
  <depends_on_team>backend</depends_on_team>
  <artifact>POST /api/auth/login, GET /api/users</artifact>
  <verification>curl -s http://localhost:3000/api/users returns 200</verification>
</checkpoint>

<checkpoint wave="2" type="merge">
  <description>Frontend + Backend integration verified</description>
  <teams>frontend, backend</teams>
  <artifact>End-to-end login flow working</artifact>
  <verification>Login form submits, receives token, redirects to dashboard</verification>
</checkpoint>

</synchronization>

<contracts>
<!-- References to CONTRACTS.md entries this plan implements or consumes -->
See: .planning/phases/XX-name/teams/CONTRACTS.md

Implements:
- contract:user-list-component (owner: frontend)

Consumes:
- contract:auth-api (owner: backend, ready_by: wave-1)
- contract:user-schema (owner: backend, ready_by: wave-1)
</contracts>

<verification>
Before declaring plan complete:
- [ ] [Team-specific test command]
- [ ] [Build/type check passes]
- [ ] [Contract obligations fulfilled]
- [ ] [Cross-team integration points verified]
</verification>

<success_criteria>
- All team tasks completed
- All verification checks pass
- Contract obligations met (check CONTRACTS.md status)
- No regressions in other teams' artifacts
- [Plan-specific criteria]
</success_criteria>

<output>
After completion:
1. Create `.planning/phases/XX-name/teams/{team}/{phase}-{plan}-SUMMARY.md`
2. Update `.planning/.team-state/{phase}-{plan}-{team}.json` status to "complete"
3. Notify gsd-team-coordinator of completion for synthesis
</output>
```

---

## Extended Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `team` | Yes | Domain this plan belongs to: frontend, backend, security, devops, data, fullstack |
| `assigned_team` | Yes | Team identifier from `config.team.available_teams` |
| `assigned_member` | Yes | Specific executor agent assigned to this plan |
| `coordination_cost` | Yes | How much cross-team coordination this plan requires |
| `team_dependencies` | No | Array of cross-team dependencies with readiness requirements |

**Coordination cost levels:**

| Level | Meaning | Example |
|-------|---------|---------|
| `none` | Fully independent, no cross-team touchpoints | Internal refactoring |
| `low` | Consumes stable interface, minimal coordination | Frontend reads existing API |
| `medium` | Shared contracts need agreement before execution | New API endpoint + consumer |
| `high` | Multiple teams must synchronize mid-execution | Database migration + API + UI |
| `critical` | Failure cascades across all teams | Auth system change |

---

## When to Use Team Plans vs Standard Plans

**Use team-plan.md when:**
- `config.json` has `team.enabled: true`
- Phase involves 2+ domain teams (e.g., frontend + backend)
- Cross-team contracts exist (API boundaries, shared schemas)
- Wave ordering has cross-team dependencies

**Use standard phase-prompt.md when:**
- `team.enabled: false` (default) or `team.mode: "solo"`
- Single-domain phase (all frontend, all backend)
- No cross-team coordination needed

---

## Team Task Grouping

Tasks are grouped by domain using `<team_tasks domain="...">`:

```xml
<team_tasks domain="backend">
  <task team="backend" type="auto">
    <name>Task 1: Create user API endpoints</name>
    <files>src/api/users/route.ts</files>
    <action>Implement GET /api/users and POST /api/users per contract:user-api</action>
    <verify>curl tests pass for both endpoints</verify>
    <done>Endpoints return correct status codes and shapes</done>
    <contracts>fulfills: user-api</contracts>
  </task>
</team_tasks>
```

Each task carries a `team` attribute for routing and a `<contracts>` element linking to CONTRACTS.md entries.

---

## Synchronization Section

The `<synchronization>` section defines cross-team coordination points:

| Type | Purpose | Behavior |
|------|---------|----------|
| `gate` | Wait for another team's artifact | Blocks until dependency team marks artifact complete |
| `merge` | Multiple teams sync at a point | All named teams must reach checkpoint before proceeding |
| `handoff` | One team passes work to another | Source team completes, target team begins |

**Example: gate checkpoint**
```xml
<checkpoint wave="1" type="gate">
  <description>Database schema migrated</description>
  <depends_on_team>data</depends_on_team>
  <artifact>Prisma migration for User, Session, Product models</artifact>
  <verification>npx prisma migrate status shows no pending migrations</verification>
</checkpoint>
```

---

## Anti-Patterns

**Bad: Team plan without contracts**
```yaml
team: frontend
team_dependencies:
  - team: backend
    artifact: "some API"  # Vague, no contract reference
```

**Bad: All teams in one plan**
```xml
<team_tasks domain="frontend">...</team_tasks>
<team_tasks domain="backend">...</team_tasks>
<team_tasks domain="devops">...</team_tasks>
<!-- Split into separate team plans instead -->
```

**Bad: Missing synchronization for cross-team dependency**
```yaml
coordination_cost: high
team_dependencies:
  - team: backend
    artifact: "API endpoints"
    ready_by: wave-1
# But no <synchronization> section defining the gate
```

---

## Guidelines

- One team per TEAM-PLAN.md file. Multi-team phases produce multiple plans.
- Always reference CONTRACTS.md for cross-team interfaces.
- Synchronization checkpoints must match team_dependencies in frontmatter.
- Update `.planning/.team-state/` after plan completion.
- 2-3 tasks per plan, same sizing as standard plans.
- Cross-reference `~/.claude/get-stuff-done/references/team-orchestration.md` for coordination protocol.
- Cross-reference `~/.claude/get-stuff-done/references/team-handoff-protocol.md` for handoff patterns.
