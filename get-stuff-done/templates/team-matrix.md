# Team Matrix Template

Template for `.planning/TEAM-MATRIX.md` — project-level team assignment and coordination matrix.

The team matrix provides a bird's-eye view of which teams are involved in which phases, their utilization, and the knowledge transfer schedule between phases. Created during project setup when `team.enabled: true`, updated as phases are planned.

---

## File Template

```markdown
---
project: [project-name]
milestone: [v1.0]
total_phases: N
total_teams: N
team_mode: [solo | coordinated | full]
last_updated: YYYY-MM-DD
---

# Team Matrix

## Team Roster

| Team | Domain | Capabilities | Lead Agent | Model Profile |
|------|--------|-------------|------------|---------------|
| team-frontend | frontend | React, Next.js, Tailwind, accessibility | gsd-team-planner-fe | balanced |
| team-backend | backend | Node.js, Prisma, REST APIs, WebSocket | gsd-team-planner-be | balanced |
| team-security | security | Auth, encryption, audit, compliance | gsd-team-planner-sec | quality |
| team-data | data | Schema design, migrations, seeding, queries | gsd-team-planner-data | balanced |
| team-devops | devops | CI/CD, Docker, monitoring, deployment | gsd-team-planner-ops | budget |

## Phase Assignment Matrix

Involvement levels: **L** = Lead (owns deliverables), **S** = Support (provides artifacts), **R** = Review (verifies output), **-** = Not involved

| Phase | Frontend | Backend | Security | Data | DevOps | Coordination Cost |
|-------|----------|---------|----------|------|--------|-------------------|
| 01-foundation | - | L | S | L | S | medium |
| 02-authentication | S | L | L | S | - | high |
| 03-core-features | L | L | R | S | - | high |
| 04-dashboard | L | S | R | - | - | low |
| 05-deployment | - | S | R | - | L | medium |

### Phase Details

#### Phase 01: Foundation
- **Data (Lead):** Schema design, initial migration, seed data
- **Backend (Lead):** Project scaffolding, middleware stack, error handling
- **Security (Support):** Review schema for PII handling, advise on field encryption
- **DevOps (Support):** Dev environment setup, Docker compose

#### Phase 02: Authentication
- **Backend (Lead):** Auth endpoints, token management, session handling
- **Security (Lead):** Auth middleware, token validation, rate limiting, audit logging
- **Frontend (Support):** Login/register forms consuming auth API
- **Data (Support):** User and Session schema per security requirements

#### Phase 03: Core Features
- **Frontend (Lead):** User dashboard, settings UI, data display components
- **Backend (Lead):** Feature API endpoints, business logic, data validation
- **Security (Review):** Verify auth applied to all new endpoints
- **Data (Support):** Feature-specific schema additions

#### Phase 04: Dashboard
- **Frontend (Lead):** Admin dashboard, analytics views, responsive layout
- **Backend (Support):** Dashboard data aggregation endpoints
- **Security (Review):** Admin role verification, data access controls

#### Phase 05: Deployment
- **DevOps (Lead):** CI/CD pipeline, Docker images, hosting configuration
- **Backend (Support):** Health checks, environment config, graceful shutdown
- **Security (Review):** Security headers, CORS policy, secrets management

## Wave Dependencies (Cross-Phase)

```
Phase 01 ──────────────────────────────────────────┐
  Wave 1: [data: schema] [backend: scaffold]       │
  Wave 2: [backend: middleware] [devops: docker]    │
                                                    ▼
Phase 02 ──────────────────────────────────────────┐
  Wave 1: [security: middleware] [data: auth-schema]│
  Wave 2: [backend: auth-api]                       │
  Wave 3: [frontend: auth-ui] [security: audit]     │
                                                    ▼
Phase 03 ──────────────────────────────────────────┐
  Wave 1: [backend: feature-api] [data: feature-schema]
  Wave 2: [frontend: feature-ui]                    │
  Wave 3: [security: review]                        │
                                                    ▼
Phase 04 ─── Phase 05
```

## Knowledge Transfer Schedule

Knowledge transfers happen at phase boundaries to ensure context flows between teams.

| From Phase | To Phase | Transfer | Source Team | Target Team | Format |
|-----------|----------|----------|-------------|-------------|--------|
| 01 → 02 | Schema decisions | data | security, backend | SUMMARY.md + CONTRACTS.md |
| 01 → 02 | Middleware patterns | backend | security | SUMMARY.md |
| 02 → 03 | Auth integration guide | security | frontend, backend | SYNTHESIS.md |
| 02 → 03 | Token handling patterns | backend | frontend | CONTRACTS.md |
| 03 → 04 | Component library | frontend | frontend | SUMMARY.md (self-transfer) |
| 03 → 05 | API surface area | backend | devops | SYNTHESIS.md |
| 04 → 05 | Build requirements | frontend | devops | SUMMARY.md |

### Transfer Artifacts

Each knowledge transfer produces:
1. **Source SUMMARY.md** — completed by the source team, includes decisions, patterns, key files
2. **SYNTHESIS.md** — produced by gsd-team-synthesizer, merges relevant summaries for the target team
3. **Updated CONTRACTS.md** — carries forward any contracts still active in the next phase

## Team Utilization Summary

| Team | Phases Active | Lead Phases | Support Phases | Review Phases | Utilization |
|------|--------------|-------------|----------------|---------------|-------------|
| Frontend | 4 of 5 | 2 | 1 | 1 | 80% |
| Backend | 5 of 5 | 2 | 2 | 1 | 100% |
| Security | 4 of 5 | 1 | 1 | 2 | 80% |
| Data | 3 of 5 | 1 | 2 | 0 | 60% |
| DevOps | 2 of 5 | 1 | 1 | 0 | 40% |

**Peak coordination phases:** Phase 02 (4 teams, high coordination), Phase 03 (4 teams, high coordination)

**Low utilization opportunity:** DevOps idle during Phases 02-04. Consider: early CI/CD setup in Phase 02, test infrastructure in Phase 03.

## Escalation Paths

When teams cannot resolve coordination issues independently:

| Issue Type | First Responder | Escalation | Resolution SLA |
|-----------|----------------|------------|----------------|
| Contract disagreement | gsd-team-coordinator | User decision | Before wave execution |
| Blocking dependency | gsd-team-coordinator | Re-sequence waves | Same phase |
| Quality concern | gsd-team-verifier | gsd-team-coordinator | Before phase transition |
| Scope conflict | gsd-team-planner | User decision | Before planning complete |
| Integration failure | gsd-team-verifier | gsd-team-synthesizer | Before phase complete |

## Configuration Reference

```json
{
  "team": {
    "enabled": true,
    "mode": "coordinated",
    "auto_detect": true,
    "available_teams": ["frontend", "backend", "security", "data", "devops"],
    "model_overrides": {
      "security": { "planner": "opus", "executor": "opus" }
    }
  }
}
```
```

---

## Matrix Fields Reference

### Frontmatter

| Field | Required | Description |
|-------|----------|-------------|
| `project` | Yes | Project name from PROJECT.md |
| `milestone` | Yes | Current milestone version |
| `total_phases` | Yes | Total phases in roadmap |
| `total_teams` | Yes | Number of active teams |
| `team_mode` | Yes | `solo` (1 team), `coordinated` (2-3 teams), `full` (4+ teams) |
| `last_updated` | Yes | Last update date |

### Involvement Levels

| Level | Code | Meaning | Responsibilities |
|-------|------|---------|-----------------|
| Lead | L | Owns phase deliverables | Creates plans, executes tasks, owns quality |
| Support | S | Provides artifacts others need | Implements contracts, responds to requests |
| Review | R | Verifies output quality | Reviews artifacts, checks contract compliance |
| Not involved | - | No participation | No context load, no artifacts expected |

---

## When to Create Team Matrix

- Created by `gsd-team-planner` during `new-project` or `new-milestone` when `team.enabled: true`
- Updated by `gsd-team-coordinator` after each `plan-phase` completes
- Referenced by `gsd-team-synthesizer` for knowledge transfer planning
- Consulted by `gsd-team-verifier` for cross-team verification scope

---

## Updating the Matrix

After each phase is planned:
1. Update Phase Assignment Matrix with actual team assignments
2. Refine Wave Dependencies based on plan frontmatter
3. Add Knowledge Transfer entries for the phase
4. Recalculate Team Utilization Summary
5. Commit update: `docs: update team matrix for phase XX`

After each phase completes:
1. Mark phase row as complete
2. Verify knowledge transfers occurred
3. Note any escalations that happened and their resolutions
4. Update utilization actuals

---

## Anti-Patterns

**Bad: Every team involved in every phase**
```
| 01-foundation | L | L | L | L | L |  # Over-coordination, most teams idle
```

**Bad: No lead team designated**
```
| 03-features | S | S | S | S | - |  # Who owns the deliverables?
```

**Bad: Missing knowledge transfers at high-coordination boundaries**
```
Phase 02 (high coordination) → Phase 03 (high coordination)
# No transfer schedule = context lost between phases
```

---

## Guidelines

- Every phase must have at least one Lead team.
- High coordination phases (3+ teams active) must have explicit wave dependency diagrams.
- Knowledge transfers are mandatory between phases where team composition changes.
- Review the utilization summary to identify idle teams that could contribute.
- The matrix is a living document — update it as plans become concrete.
- Cross-reference `~/.claude/get-stuff-done/references/team-orchestration.md` for coordination protocol.
- Cross-reference `~/.claude/get-stuff-done/references/team-handoff-protocol.md` for transfer format.
