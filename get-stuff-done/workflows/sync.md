<purpose>
Analyze and merge upstream changes from glittercowboy/get-shit-done into this fork.
Carefully classifies files, auto-merges safe changes, and uses agent analysis for conflicts.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<constants>
- FORK_REPO: joshlopez1588/get-stuff-done
- UPSTREAM_REPO: glittercowboy/get-shit-done
- SYNC_STATE_FILE: ~/.claude/get-stuff-done/sync-state.json
- UPSTREAM_CLONE_DIR: /tmp/gsd-upstream-sync
- FORK_SOURCE_DIR: The directory containing this GSD installation's source files
</constants>

<process>

<step name="read_sync_state">
Read the sync state file to determine the last synced upstream version:

```bash
cat ~/.claude/get-stuff-done/sync-state.json 2>/dev/null || echo '{"last_synced_upstream_version": null, "last_synced_upstream_sha": null}'
```

Parse the JSON to get:
- `last_synced_upstream_version` — last upstream version we synced from
- `last_synced_upstream_sha` — last upstream commit SHA we synced from
- `last_sync_timestamp` — when the last sync happened

If no sync state exists, this is the first sync. All upstream files will be classified as potential additions.
</step>

<step name="fetch_upstream">
Clone upstream to temp directory:

```bash
rm -rf /tmp/gsd-upstream-sync
git clone --depth 1 https://github.com/glittercowboy/get-shit-done.git /tmp/gsd-upstream-sync
```

Get upstream version and SHA:

```bash
node -e "console.log(require('/tmp/gsd-upstream-sync/package.json').version)"
```

```bash
git -C /tmp/gsd-upstream-sync rev-parse HEAD
```

Store these as `upstream_version` and `upstream_sha`.

**If clone fails:**
```
Couldn't fetch upstream (offline or GitHub unavailable).
Try again when you have network access.
```
Exit.
</step>

<step name="locate_fork_source">
Find the GSD installation source. The fork's files live in this repo — we need to compare against the actual source, not the installed copy.

Check if we're in the fork repo:
```bash
# Check if current directory is the fork repo
if [ -f "./package.json" ] && node -e "const p=require('./package.json'); process.exit(p.name === 'get-stuff-done' ? 0 : 1)"; then
  echo "REPO_DIR:$(pwd)"
else
  echo "NOT_IN_REPO"
fi
```

If NOT_IN_REPO, the comparison uses the installed files at `~/.claude/` as the fork baseline. This is less precise but still functional.
</step>

<step name="classify_files">
Compare every file between upstream and fork. Build a classification table.

Use this classification logic for each file found in either tree:

| Category | Condition | Action |
|----------|-----------|--------|
| `upstream_only` | File exists in upstream but not in fork | Safe to add |
| `fork_only` | File exists in fork but not in upstream | Preserve (fork addition) |
| `identical` | File exists in both, content matches | Skip |
| `upstream_changed` | Content differs, fork copy matches last-synced upstream | Safe auto-merge (upstream updated, fork didn't touch) |
| `fork_changed` | Content differs, upstream copy matches last-synced upstream | Preserve (fork customized, upstream unchanged) |
| `both_changed` | Content differs from each other AND both differ from last-synced | Conflict — needs analysis |

**Fork-only paths** — these are always preserved regardless of classification:
- `agents/teams/` — team agent definitions
- `commands/gsd/team-*.md` — team commands
- `commands/gsd/sync.md` — this sync command
- `commands/gsd/distribute-phase.md`, `resolve-conflict.md`, `team-handoff.md`, `team-init.md`, `team-status.md`
- `get-stuff-done/workflows/sync.md` — this sync workflow
- `get-stuff-done/templates/team-*.md` — team templates
- `get-stuff-done/references/team-*.md` — team references

**Directories to compare** (everything relevant to GSD functionality):
- `commands/gsd/`
- `get-stuff-done/` (workflows, templates, references, bin)
- `agents/` (gsd-* agent files)
- `hooks/` (gsd-* hook files)
- `bin/`
- `scripts/`
- Root files: `package.json`, `CHANGELOG.md`

Run the classification by iterating both file trees:

```bash
# List all files in upstream (relative paths)
(cd /tmp/gsd-upstream-sync && find commands get-stuff-done agents hooks bin scripts -name '*.md' -o -name '*.js' -o -name '*.json' 2>/dev/null | sort) > /tmp/gsd-upstream-files.txt

# List all files in fork source (relative paths)
# Adjust the base path based on step 3
(cd "$FORK_SOURCE" && find commands get-stuff-done agents hooks bin scripts -name '*.md' -o -name '*.js' -o -name '*.json' 2>/dev/null | sort) > /tmp/gsd-fork-files.txt
```

Then for each file, compute MD5/SHA and classify.

Build the classification as a structured list with counts per category.
</step>

<step name="analyze_conflicts">
For each `both_changed` file, spawn a Task agent to analyze the differences:

The agent should:
1. Read the upstream version of the file
2. Read the fork version of the file
3. Identify what upstream changed (new features, bug fixes, refactoring)
4. Identify what fork customized (team additions, fork-specific behavior)
5. Determine if changes are **orthogonal** (different sections, can merge) or **conflicting** (same sections, need decision)
6. Produce a merge recommendation:
   - `auto_merge` — changes are in different sections, can be combined
   - `prefer_fork` — fork customization is important, upstream changes are minor
   - `prefer_upstream` — upstream changes are important, fork customizations can be reapplied
   - `manual` — requires human decision

For efficiency, group files by domain and spawn one agent per domain:
- **hooks domain**: gsd-check-update.js, gsd-statusline.js
- **workflow domain**: all workflow .md files
- **command domain**: all command .md files
- **agent domain**: all agent .md files
- **installer domain**: bin/install.js, scripts/build-hooks.js
- **config domain**: package.json, CHANGELOG.md

Each agent gets all `both_changed` files in its domain and returns analysis for each.
</step>

<step name="present_report">
Display a comprehensive sync report:

```
## Upstream Sync Report

**Upstream version:** X.Y.Z (SHA: abc1234)
**Last synced:** A.B.C (SHA: def5678) on 2026-01-15

### File Classification Summary

| Category | Count | Action |
|----------|-------|--------|
| Identical | N | Skip |
| Upstream only | N | Add to fork |
| Fork only | N | Preserve |
| Upstream changed (safe) | N | Auto-merge |
| Fork changed | N | Preserve |
| Both changed | N | See analysis below |

### Auto-Merge Files (upstream changed, fork untouched)
- `get-stuff-done/workflows/execute-plan.md` — upstream bug fix
- `agents/gsd-executor.md` — upstream improvement
...

### Conflict Analysis
────────────────────────────────────────────────────────────

**`hooks/gsd-check-update.js`** — Both changed
- Upstream: Added timeout handling
- Fork: Rewrote for GitHub-based checking
- Recommendation: **prefer_fork** (fork has complete rewrite)

**`get-stuff-done/workflows/help.md`** — Both changed
- Upstream: Added new command documentation
- Fork: Updated install references
- Recommendation: **auto_merge** (changes in different sections)

────────────────────────────────────────────────────────────

### New Upstream Files
- `get-stuff-done/workflows/new-feature.md` — New workflow

### Preserved Fork Files (not in upstream)
- `agents/teams/gsd-planner-frontend.md`
- `commands/gsd/team-init.md`
...
```

Use AskUserQuestion:
- Question: "How would you like to proceed with the sync?"
- Options:
  - "Apply all recommendations" (Recommended)
  - "Apply safe changes only (skip conflicts)"
  - "Review each conflict individually"
  - "Cancel sync"

**If user cancels:** Clean up temp directory and exit.
</step>

<step name="execute_sync">
Based on user choice, apply changes:

**For each `upstream_only` file:**
Copy from upstream to fork source directory.

**For each `upstream_changed` (safe auto-merge) file:**
Copy from upstream to fork source directory (fork's version is unchanged from last sync).

**For each `both_changed` file:**
Apply the recommendation:
- `auto_merge`: Attempt to merge by combining changes. If the changes are in clearly different sections, apply both. If automated merge fails, fall back to upstream version with fork changes appended as comments.
- `prefer_fork`: Keep fork version as-is.
- `prefer_upstream`: Copy upstream version.
- `manual`: If user chose "review each", show diff and AskUserQuestion for each file. Otherwise, skip (keep fork version).

**For `fork_only` and `fork_changed` files:**
No action needed — already preserved.

After applying all changes, if we're in the fork repo directory:
```bash
# Re-install to propagate changes to ~/.claude/
node bin/install.js --claude --global
```
</step>

<step name="update_sync_state">
Write updated sync state:

```json
{
  "last_synced_upstream_version": "X.Y.Z",
  "last_synced_upstream_sha": "abc123...",
  "last_sync_timestamp": "2026-02-15T12:00:00Z",
  "files_synced": {
    "added": ["list of upstream_only files added"],
    "updated": ["list of auto-merged files"],
    "conflicts_resolved": ["list of both_changed files that were resolved"],
    "skipped": ["list of conflicts skipped"]
  }
}
```

Write to `~/.claude/get-stuff-done/sync-state.json`.

Clear the update cache:
```bash
rm -f ~/.claude/cache/gsd-update-check.json
```
</step>

<step name="cleanup">
Clean up temp directory:

```bash
rm -rf /tmp/gsd-upstream-sync /tmp/gsd-upstream-files.txt /tmp/gsd-fork-files.txt
```

Display completion message:

```
╔═══════════════════════════════════════════════════════════╗
║  Upstream Sync Complete                                    ║
║  Synced to upstream vX.Y.Z                                ║
╚═══════════════════════════════════════════════════════════╝

Files added: N
Files updated: N
Conflicts resolved: N
Conflicts skipped: N

⚠️  Restart Claude Code to pick up any command changes.
```
</step>

</process>

<success_criteria>
- [ ] Sync state read correctly (or initialized for first sync)
- [ ] Upstream cloned successfully
- [ ] All files classified into correct categories
- [ ] Fork-only files (teams, sync command) always preserved
- [ ] Agent analysis produced for all both_changed files
- [ ] User presented with clear report and approval options
- [ ] Changes applied correctly per user choice
- [ ] sync-state.json updated with new upstream SHA/version
- [ ] Temp files cleaned up
- [ ] Cache cleared so statusline indicator disappears
</success_criteria>
