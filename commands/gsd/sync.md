---
name: gsd:sync
description: Sync upstream changes from glittercowboy/get-shit-done into this fork
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - AskUserQuestion
  - Task
---

<objective>
Analyze and merge upstream changes from glittercowboy/get-shit-done into this fork (joshlopez1588/get-stuff-done).

This command:
- Fetches the latest upstream code
- Classifies every file by change type (upstream-only, fork-only, both-changed, etc.)
- Auto-merges safe changes, flags conflicts for analysis
- Spawns domain-specific agents for complex merge decisions
- Presents a detailed report for user approval
- Executes the sync and updates tracking state
</objective>

<execution_context>
@~/.claude/get-stuff-done/workflows/sync.md
</execution_context>

<process>
**Follow the sync workflow** from `@~/.claude/get-stuff-done/workflows/sync.md`.

The workflow handles all logic including:
1. Reading sync state (last synced SHA/version)
2. Fetching upstream via shallow clone
3. File classification into categories
4. Agent analysis for conflicting changes
5. User approval of merge plan
6. Executing safe merges and conflict resolutions
7. Re-installing to propagate changes
8. Updating sync-state.json
</process>
