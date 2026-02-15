# Team Model Profiles

Extended model profiles for team agents. Defines which Claude model each team-specific agent uses across quality profiles, domain-specific overrides, and cost analysis.

This reference extends `~/.claude/get-shit-done/references/model-profiles.md` with team-specific agent roles.

<team_agent_matrix>

## Team Agent Model Profile Matrix

| Agent | `quality` | `balanced` | `budget` | Primary Responsibility |
|-------|-----------|------------|----------|----------------------|
| gsd-team-planner | opus | opus | sonnet | Creates team plans, contracts, and matrix |
| gsd-team-coordinator | opus | sonnet | sonnet | Orchestrates execution, resolves conflicts |
| gsd-team-verifier | opus | sonnet | sonnet | Contract compliance, cross-team wiring |
| gsd-team-synthesizer | sonnet | sonnet | haiku | Merges summaries, knowledge transfer |

### Combined Matrix (Standard + Team Agents)

For completeness, here is the full agent matrix including standard GSD agents:

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| **Standard Agents** | | | |
| gsd-planner | opus | opus | sonnet |
| gsd-roadmapper | opus | sonnet | sonnet |
| gsd-executor | opus | sonnet | sonnet |
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-project-researcher | opus | sonnet | haiku |
| gsd-research-synthesizer | sonnet | sonnet | haiku |
| gsd-debugger | opus | sonnet | sonnet |
| gsd-codebase-mapper | sonnet | haiku | haiku |
| gsd-verifier | sonnet | sonnet | haiku |
| gsd-plan-checker | sonnet | sonnet | haiku |
| gsd-integration-checker | sonnet | sonnet | haiku |
| **Team Agents** | | | |
| gsd-team-planner | opus | opus | sonnet |
| gsd-team-coordinator | opus | sonnet | sonnet |
| gsd-team-verifier | opus | sonnet | sonnet |
| gsd-team-synthesizer | sonnet | sonnet | haiku |

</team_agent_matrix>

<domain_overrides>

## Domain-Specific Model Overrides

Certain domains warrant higher-quality models regardless of the global profile. These overrides are configured in `config.json`:

```json
{
  "team": {
    "enabled": true,
    "model_overrides": {
      "security": { "planner": "opus", "executor": "opus" },
      "data": { "planner": "opus" }
    }
  }
}
```

### Override Rules

| Domain | Override | Rationale |
|--------|---------|-----------|
| security | planner: opus, executor: opus | Security decisions require maximum reasoning. Auth bugs are critical. Token handling, encryption, access control — these cannot afford shortcuts. |
| data | planner: opus | Schema design has long-term consequences. Wrong schema decisions compound across the entire project. Execution can use sonnet since migrations follow the plan. |
| frontend | (none by default) | Frontend work follows clear patterns. Sonnet handles component implementation well. |
| backend | (none by default) | Backend follows API contracts closely. Sonnet is sufficient for contract-driven implementation. |
| devops | (none by default) | DevOps work is largely configuration-driven. Sonnet handles Docker, CI/CD configs well. |

### When to Add Custom Overrides

Add domain overrides when:
- The domain involves security-critical decisions (auth, encryption, access control)
- Schema or architectural decisions have irreversible consequences
- The domain requires complex multi-step reasoning (e.g., distributed system coordination)
- Past experience showed quality issues with lower-tier models for this domain

### Override Examples

**High-security project (all security work uses opus):**
```json
{
  "team": {
    "model_overrides": {
      "security": { "planner": "opus", "executor": "opus", "verifier": "opus" }
    }
  }
}
```

**Complex data project (data planning and execution use opus):**
```json
{
  "team": {
    "model_overrides": {
      "data": { "planner": "opus", "executor": "opus" }
    }
  }
}
```

**Budget project with security exception:**
```json
{
  "model_profile": "budget",
  "team": {
    "model_overrides": {
      "security": { "planner": "opus", "executor": "sonnet" }
    }
  }
}
```

</domain_overrides>

<philosophy>

## Philosophy: Quality Over Token Savings

Opus 4.6 is the default for critical reasoning tasks. This is a deliberate design choice.

### The 1M Context Window Changes the Calculus

With Opus 4.6's 1 million token context window, the historical pressure to use smaller models for context efficiency is largely eliminated. Each team agent gets a fresh 1M window, meaning:

- **Planners can see everything.** Full project context, all team plans, complete contract definitions, extensive code — all fit comfortably within the context budget.
- **Executors can be thorough.** No need to truncate file contents or skip contextual references. Include complete source files, full contract specs, detailed instructions.
- **Verifiers can cross-check broadly.** Read all team summaries, all contracts, all relevant source files in a single pass.

### When Quality Matters Most

**Always use opus for:**
1. **Planning** — Architecture decisions, task decomposition, contract design. These decisions propagate through the entire execution chain. A poor plan wastes more tokens in re-execution than opus costs upfront.
2. **Security domain** — Auth, encryption, access control. Security bugs are the most expensive to fix and the most damaging when missed.
3. **Conflict resolution** — When teams disagree on contracts or integration approaches. Nuanced reasoning prevents costly rework.
4. **Cross-team verification** — Checking that independently developed components integrate correctly requires understanding both sides deeply.

**Sonnet is appropriate for:**
1. **Execution** — Following explicit TEAM-PLAN.md instructions. The plan contains the reasoning; execution is implementation.
2. **Synthesis** — Merging team summaries into SYNTHESIS.md. This is structured aggregation, not decision-making.
3. **Simple verification** — Checking existence, stub detection, basic wiring. Pattern matching rather than reasoning.

**Haiku is appropriate for:**
1. **Read-only exploration** — Codebase mapping, file listing, pattern extraction.
2. **Simple synthesis** — When merging short, well-structured summaries.
3. **Budget mode only** — Never use haiku for team agents in quality or balanced profiles.

### The Cost Argument

"But opus costs more per token."

True. But consider:
- A bad security plan costs 3-5 executor re-runs to fix. Opus planning saves more tokens than it costs.
- A wrong contract design discovered during integration costs 2 teams' rework. Opus coordination catches it early.
- A missed cross-team wiring issue discovered in UAT costs a full re-verification cycle. Opus verification catches it in one pass.

**The most expensive model call is the one you have to make twice.**

</philosophy>

<model_resolution>

## How Model Resolution Works with Team Overrides

When spawning a team agent, the model is resolved through a precedence chain:

### Resolution Precedence (highest to lowest)

```
1. config.team.model_overrides.{domain}.{role}    ← Domain-specific role override
2. config.team.model_overrides.{domain}            ← Domain-wide override (legacy format)
3. model_profiles[agent_name][config.model_profile] ← Standard profile lookup
4. "sonnet"                                         ← Fallback default
```

### Resolution Algorithm

```
function resolveTeamModel(agentName, teamDomain, agentRole) {
  // 1. Load config
  config = loadConfig(".planning/config.json")
  profile = config.model_profile || "balanced"

  // 2. Check domain-specific role override
  domainOverrides = config.team?.model_overrides?.[teamDomain]
  if (domainOverrides && domainOverrides[agentRole]) {
    return domainOverrides[agentRole]  // e.g., "opus"
  }

  // 3. Check standard profile table
  profileTable = loadProfileTable()  // From model-profiles.md
  if (profileTable[agentName] && profileTable[agentName][profile]) {
    return profileTable[agentName][profile]
  }

  // 4. Fallback
  return "sonnet"
}
```

### Resolution Examples

**Example 1: Security team planner, balanced profile, with security override**
```
agentName: "gsd-team-planner"
teamDomain: "security"
agentRole: "planner"
config.model_profile: "balanced"
config.team.model_overrides.security: { "planner": "opus", "executor": "opus" }

Step 1: config → domain "security" → role "planner" → "opus"
Result: opus (domain override takes precedence)
```

**Example 2: Frontend team executor, balanced profile, no override**
```
agentName: "gsd-team-coordinator"
teamDomain: "frontend"
agentRole: "coordinator"
config.model_profile: "balanced"
config.team.model_overrides: { "security": { ... } }  // No frontend override

Step 1: config → domain "frontend" → not found
Step 2: profileTable["gsd-team-coordinator"]["balanced"] → "sonnet"
Result: sonnet (standard profile lookup)
```

**Example 3: Backend team executor, quality profile, no override**
```
agentName: "gsd-executor"  // Standard executor, not team-specific
teamDomain: "backend"
agentRole: "executor"
config.model_profile: "quality"
config.team.model_overrides: {}

Step 1: config → domain "backend" → not found
Step 2: profileTable["gsd-executor"]["quality"] → "opus"
Result: opus (quality profile gives opus to executors)
```

### Role Mapping for Overrides

When specifying overrides in config, use these role names:

| Override Key | Applies To Agent |
|-------------|-----------------|
| `planner` | gsd-team-planner |
| `coordinator` | gsd-team-coordinator |
| `executor` | gsd-executor (standard executor running team plan) |
| `verifier` | gsd-team-verifier |
| `synthesizer` | gsd-team-synthesizer |

</model_resolution>

<cost_analysis>

## Cost Analysis: When to Use Opus vs Sonnet for Team Roles

### Per-Agent Cost Profile (approximate)

| Agent | Typical Context Load | Typical Output | Profile Impact |
|-------|---------------------|----------------|----------------|
| gsd-team-planner | 200-400K tokens (research + project context) | 20-40K tokens (plans + contracts) | High — opus planning prevents rework |
| gsd-team-coordinator | 12-38K tokens (state + contracts) | 5-10K tokens (decisions, updates) | Medium — sonnet handles routine coordination |
| gsd-executor (per team) | 300-600K tokens (plan + code + context) | 50-200K tokens (code output) | Low-Medium — follows explicit instructions |
| gsd-team-verifier | 300-500K tokens (summaries + contracts + code) | 10-20K tokens (verification report) | Medium-High — needs thorough cross-checking |
| gsd-team-synthesizer | 200-400K tokens (all summaries + contracts) | 10-20K tokens (synthesis) | Low — structured aggregation |

### Cost-Benefit by Profile

**Quality profile (opus everywhere):**
- Highest per-token cost
- Lowest rework probability
- Best for: critical projects, security-heavy work, complex architecture
- Estimated overhead vs balanced: +40-60% token cost
- Estimated rework savings: -70-90% rework cost

**Balanced profile (default):**
- Moderate per-token cost
- Moderate rework probability
- Best for: most projects, good quality-cost balance
- Baseline cost reference

**Budget profile (minimal opus):**
- Lowest per-token cost
- Highest rework probability (especially in planning)
- Best for: well-understood patterns, high-volume simple work
- Estimated savings vs balanced: -30-50% token cost
- Estimated rework increase: +100-200% rework frequency

### Decision Framework

```
                         ┌─────────────────┐
                         │ Is this a        │
                         │ security domain? │
                         └────────┬────────┘
                                  │
                          Yes ────┤──── No
                          │               │
                     Use opus        ┌────┴────┐
                     always          │ Is this  │
                                     │ planning │
                                     │ or coord?│
                                     └────┬────┘
                                          │
                                  Yes ────┤──── No
                                  │               │
                             Use opus        ┌────┴────┐
                             (balanced+)     │ Budget   │
                                             │ mode?    │
                                             └────┬────┘
                                                  │
                                          Yes ────┤──── No
                                          │               │
                                     Use sonnet      Use sonnet
                                                     (balanced)
                                                     or opus
                                                     (quality)
```

</cost_analysis>

<guidelines>

## Guidelines

- The team agent matrix extends, not replaces, the standard model profiles.
- Domain overrides in config.json always take precedence over the standard profile table.
- Security domain should almost always use opus for planning and execution, regardless of profile.
- The 1M context window means you should optimize for quality, not context conservation.
- When unsure between opus and sonnet, prefer opus. The cost of rework exceeds the cost of higher-quality reasoning.
- Team executors use the standard gsd-executor agent (not a separate team-specific executor agent). The model override applies based on team domain.
- Cross-reference `~/.claude/get-shit-done/references/model-profiles.md` for the standard agent profile table.
- Cross-reference `~/.claude/get-shit-done/references/model-profile-resolution.md` for the general resolution pattern.
- Cross-reference `~/.claude/get-shit-done/references/team-orchestration.md` for how model profiles are applied during team execution.

</guidelines>
