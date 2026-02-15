# Team Contract Template

Template for `.planning/phases/{phase}/teams/CONTRACTS.md` — interface contracts between teams within a phase.

Contracts define the agreed-upon interfaces between teams. They are the single source of truth for what one team provides and another team consumes. Every cross-team dependency must have a corresponding contract entry.

---

## File Template

```markdown
---
phase: XX-name
teams_involved: [frontend, backend, security]
total_contracts: N
status_summary:
  draft: N
  agreed: N
  implemented: N
  verified: N
last_updated: YYYY-MM-DD
---

# Phase XX: Team Contracts

## Contract Registry

| ID | Type | Between | Owner | Status |
|----|------|---------|-------|--------|
| auth-api | api | frontend, backend | backend | agreed |
| user-schema | data | backend, data | data | implemented |
| auth-middleware | shared-component | frontend, backend, security | security | draft |
| session-events | event | backend, security | backend | draft |

---

## API Contracts

<contract id="auth-api" type="api" between="frontend,backend">
  <description>Authentication endpoints for user login and token management</description>

  <endpoint method="POST" path="/api/auth/login">
    <request>{ email: string, password: string }</request>
    <response status="200">{ token: string, refreshToken: string, user: { id: string, email: string, name: string } }</response>
    <error status="401">{ error: "Invalid credentials" }</error>
    <error status="422">{ error: "Validation failed", fields: { [key]: string } }</error>
  </endpoint>

  <endpoint method="POST" path="/api/auth/refresh">
    <request>{ refreshToken: string }</request>
    <response status="200">{ token: string, refreshToken: string }</response>
    <error status="401">{ error: "Token expired" }</error>
  </endpoint>

  <endpoint method="POST" path="/api/auth/logout">
    <request>{ refreshToken: string }</request>
    <response status="204">(empty)</response>
  </endpoint>

  <owner>backend</owner>
  <consumer>frontend</consumer>
  <ready_by>wave-1</ready_by>
  <status>agreed</status>
  <agreed_date>YYYY-MM-DD</agreed_date>
  <notes>Frontend will use httpOnly cookies for token storage. Backend sets cookies in response headers.</notes>
</contract>

## Data Contracts

<contract id="user-schema" type="data" between="backend,data">
  <description>User data shape shared between API responses and database schema</description>

  <schema name="User">
    <field name="id" type="string" format="uuid" required="true" />
    <field name="email" type="string" format="email" required="true" unique="true" />
    <field name="name" type="string" required="true" />
    <field name="passwordHash" type="string" required="true" internal="true" />
    <field name="role" type="enum" values="user,admin" default="user" />
    <field name="createdAt" type="datetime" required="true" />
    <field name="updatedAt" type="datetime" required="true" />
  </schema>

  <schema name="Session">
    <field name="id" type="string" format="uuid" required="true" />
    <field name="userId" type="string" format="uuid" required="true" />
    <field name="refreshToken" type="string" required="true" />
    <field name="expiresAt" type="datetime" required="true" />
    <field name="createdAt" type="datetime" required="true" />
  </schema>

  <owner>data</owner>
  <consumer>backend</consumer>
  <ready_by>wave-1</ready_by>
  <status>implemented</status>
  <implemented_date>YYYY-MM-DD</implemented_date>
  <migration>prisma/migrations/20250115_add_user_session</migration>
</contract>

## Shared Component Contracts

<contract id="auth-middleware" type="shared-component" between="frontend,backend,security">
  <description>Authentication middleware used by both frontend (route guards) and backend (API protection)</description>

  <component name="withAuth">
    <interface>
      (handler: RequestHandler) => RequestHandler
    </interface>
    <behavior>
      - Extracts JWT from Authorization header or httpOnly cookie
      - Validates token signature and expiry
      - Attaches user object to request context
      - Returns 401 if token invalid or missing
    </behavior>
    <location>src/lib/auth/middleware.ts</location>
  </component>

  <component name="useAuth">
    <interface>
      () => { user: User | null, isLoading: boolean, isAuthenticated: boolean }
    </interface>
    <behavior>
      - React hook for client-side auth state
      - Reads token from cookie
      - Validates on mount and token change
      - Provides loading state during validation
    </behavior>
    <location>src/hooks/useAuth.ts</location>
  </component>

  <owner>security</owner>
  <consumers>frontend, backend</consumers>
  <ready_by>wave-1</ready_by>
  <status>draft</status>
</contract>

## Event Contracts

<contract id="session-events" type="event" between="backend,security">
  <description>Session lifecycle events for audit logging and security monitoring</description>

  <event name="session.created">
    <trigger>User successfully logs in</trigger>
    <payload>{ userId: string, sessionId: string, ip: string, userAgent: string, timestamp: ISO8601 }</payload>
    <publisher>backend</publisher>
    <subscribers>security</subscribers>
  </event>

  <event name="session.expired">
    <trigger>Refresh token expires or is revoked</trigger>
    <payload>{ userId: string, sessionId: string, reason: "expired" | "revoked" | "logout", timestamp: ISO8601 }</payload>
    <publisher>backend</publisher>
    <subscribers>security</subscribers>
  </event>

  <event name="session.suspicious">
    <trigger>Multiple failed login attempts or unusual pattern</trigger>
    <payload>{ userId: string, ip: string, attemptCount: number, timestamp: ISO8601 }</payload>
    <publisher>security</publisher>
    <subscribers>backend</subscribers>
    <action>Backend locks account after threshold</action>
  </event>

  <owner>backend</owner>
  <consumer>security</consumer>
  <ready_by>wave-2</ready_by>
  <status>draft</status>
  <transport>In-process event emitter (no external message queue for MVP)</transport>
</contract>

---

## Conflict Log

Any disagreements or changes to contracts are logged here:

| Date | Contract | Change | Initiated By | Resolution |
|------|----------|--------|-------------|------------|
| YYYY-MM-DD | auth-api | Changed token format from opaque to JWT | security | Agreed — JWT enables stateless validation |

---
```

---

## Contract Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| `api` | HTTP endpoint interfaces | `<endpoint>` with method, path, request, response, error |
| `data` | Shared data shapes and schemas | `<schema>` with field definitions, types, constraints |
| `shared-component` | Reusable code consumed by multiple teams | `<component>` with interface, behavior, location |
| `event` | Pub/sub or event-driven interfaces | `<event>` with trigger, payload, publisher, subscribers |

---

## Contract Status Lifecycle

```
draft → agreed → implemented → verified
```

| Status | Meaning | Who transitions |
|--------|---------|-----------------|
| `draft` | Proposed by one team, not yet reviewed | gsd-team-planner creates |
| `agreed` | Both owner and consumer teams accept the interface | gsd-team-coordinator confirms |
| `implemented` | Owner team has built the artifact matching the contract | Owner team's executor marks |
| `verified` | Consumer team confirms the artifact works as specified | gsd-team-verifier confirms |

**Transition rules:**
- `draft` to `agreed`: Both teams must review. Coordinator mediates disagreements.
- `agreed` to `implemented`: Owner team's SUMMARY.md references contract fulfillment.
- `implemented` to `verified`: Verifier runs contract checks (type shapes match, endpoints respond correctly).

---

## Contract Fields Reference

### Common Fields (all contract types)

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier, kebab-case (e.g., `auth-api`) |
| `type` | Yes | Contract type: `api`, `data`, `shared-component`, `event` |
| `between` | Yes | Comma-separated team names involved |
| `description` | Yes | What this contract defines |
| `owner` | Yes | Team responsible for implementing |
| `consumer` / `consumers` | Yes | Team(s) that depend on this contract |
| `ready_by` | Yes | Wave or phase when this must be available |
| `status` | Yes | Current lifecycle status |
| `notes` | No | Implementation notes, decisions, constraints |

### API Contract Fields

| Field | Description |
|-------|-------------|
| `<endpoint method="" path="">` | HTTP method and URL path |
| `<request>` | Request body shape (TypeScript-style) |
| `<response status="">` | Success response shape with HTTP status |
| `<error status="">` | Error response shape with HTTP status |

### Data Contract Fields

| Field | Description |
|-------|-------------|
| `<schema name="">` | Named data shape |
| `<field name="" type="" required="" ...>` | Field definition with type and constraints |
| `<migration>` | Path to database migration implementing this schema |

### Event Contract Fields

| Field | Description |
|-------|-------------|
| `<event name="">` | Event identifier (dot-notation) |
| `<trigger>` | What causes this event to fire |
| `<payload>` | Event data shape |
| `<publisher>` | Team that emits this event |
| `<subscribers>` | Teams that consume this event |
| `<transport>` | How events are delivered (emitter, queue, webhook) |

---

## Usage in Team Plans

Team plans reference contracts via the `<contracts>` element:

```xml
<task team="backend" type="auto">
  <name>Task 1: Implement login endpoint</name>
  <files>src/api/auth/login/route.ts</files>
  <action>Implement POST /api/auth/login per contract:auth-api</action>
  <verify>curl -X POST localhost:3000/api/auth/login returns expected shape</verify>
  <done>Response matches contract:auth-api endpoint shape</done>
  <contracts>fulfills: auth-api</contracts>
</task>
```

Verification checks contract compliance:
```bash
# Verify API contract: response shape matches
curl -s -X POST localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq 'has("token") and has("user")'
# Expected: true
```

---

## CONFLICTS.md

When contracts cannot be agreed upon, create `.planning/phases/{phase}/teams/CONFLICTS.md`:

```markdown
---
phase: XX-name
open_conflicts: N
resolved_conflicts: N
---

# Contract Conflicts

## Open

### CONFLICT-001: Auth token format
- **Contract:** auth-api
- **Teams:** frontend vs security
- **Frontend position:** Opaque tokens (simpler client-side handling)
- **Security position:** JWT (enables stateless validation, reduces DB lookups)
- **Impact:** Blocks wave-1 execution for both teams
- **Escalation:** Requires gsd-team-coordinator decision

## Resolved

### CONFLICT-002: User schema nullable fields
- **Contract:** user-schema
- **Resolution:** All fields required at creation, name nullable for OAuth users
- **Decided by:** gsd-team-coordinator
- **Date:** YYYY-MM-DD
```

---

## Guidelines

- Every cross-team dependency in a TEAM-PLAN.md must have a corresponding contract entry.
- Contracts are created during `plan-phase` by `gsd-team-planner` and refined by `gsd-team-coordinator`.
- The CONTRACTS.md file is the canonical reference; team plans point to it, not duplicate it.
- Keep contract IDs stable. Changing an ID requires updating all referencing team plans.
- Log all changes in the Conflict Log, even minor refinements.
- Cross-reference `~/.claude/get-stuff-done/templates/team-plan.md` for how contracts are consumed.
- Cross-reference `~/.claude/get-stuff-done/references/team-orchestration.md` for coordination protocol.
