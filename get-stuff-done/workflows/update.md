<purpose>
Check for GSD fork updates via GitHub, display changelog for versions between installed and latest, obtain user confirmation, and execute clean installation via git clone.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="get_installed_version">
Detect whether GSD is installed locally or globally by checking both locations:

```bash
# Check local first (takes priority)
if [ -f "./.claude/get-stuff-done/VERSION" ]; then
  cat "./.claude/get-stuff-done/VERSION"
  echo "LOCAL"
elif [ -f ~/.claude/get-stuff-done/VERSION ]; then
  cat ~/.claude/get-stuff-done/VERSION
  echo "GLOBAL"
else
  echo "UNKNOWN"
fi
```

Parse output:
- If last line is "LOCAL": installed version is first line, use `--local` flag for update
- If last line is "GLOBAL": installed version is first line, use `--global` flag for update
- If "UNKNOWN": proceed to install step (treat as version 0.0.0)

**If VERSION file missing:**
```
## GSD Update

**Installed version:** Unknown

Your installation doesn't include version tracking.

Running fresh install...
```

Proceed to install step (treat as version 0.0.0 for comparison).
</step>

<step name="check_latest_version">
Check GitHub for the latest fork version:

```bash
curl -s https://raw.githubusercontent.com/joshlopez1588/get-stuff-done/main/package.json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).version)}catch(e){console.log('ERROR')}})"
```

**If check fails:**
```
Couldn't check for updates (offline or GitHub unavailable).

To update manually:
git clone https://github.com/joshlopez1588/get-stuff-done.git /tmp/gsd-install \
  && node /tmp/gsd-install/bin/install.js --claude --global \
  && rm -rf /tmp/gsd-install
```

Exit.
</step>

<step name="compare_versions">
Compare installed vs latest:

**If installed == latest:**
```
## GSD Update

**Installed:** X.Y.Z
**Latest:** X.Y.Z

You're already on the latest version.
```

Exit.

**If installed > latest:**
```
## GSD Update

**Installed:** X.Y.Z
**Latest:** A.B.C

You're ahead of the latest release (development version?).
```

Exit.
</step>

<step name="show_changes_and_confirm">
**If update available**, fetch and show what's new BEFORE updating:

1. Fetch changelog from GitHub raw URL:
```bash
curl -s https://raw.githubusercontent.com/joshlopez1588/get-stuff-done/main/CHANGELOG.md
```
2. Extract entries between installed and latest versions
3. Display preview and ask for confirmation:

```
## GSD Update Available

**Installed:** 1.5.10
**Latest:** 1.5.15

### What's New
────────────────────────────────────────────────────────────

## [1.5.15] - 2026-01-20

### Added
- Feature X

## [1.5.14] - 2026-01-18

### Fixed
- Bug fix Y

────────────────────────────────────────────────────────────

⚠️  **Note:** The installer performs a clean install of GSD folders:
- `commands/gsd/` will be wiped and replaced
- `get-stuff-done/` will be wiped and replaced
- `agents/gsd-*` files will be replaced

(Paths are relative to your install location: `~/.claude/` for global, `./.claude/` for local)

Your custom files in other locations are preserved:
- Custom commands not in `commands/gsd/` ✓
- Custom agents not prefixed with `gsd-` ✓
- Custom hooks ✓
- Your CLAUDE.md files ✓

If you've modified any GSD files directly, they'll be automatically backed up to `gsd-local-patches/` and can be reapplied with `/gsd:reapply-patches` after the update.
```

Use AskUserQuestion:
- Question: "Proceed with update?"
- Options:
  - "Yes, update now"
  - "No, cancel"

**If user cancels:** Exit.
</step>

<step name="run_update">
Run the update using git clone + install:

**If LOCAL install:**
```bash
git clone --depth 1 https://github.com/joshlopez1588/get-stuff-done.git /tmp/gsd-update && node /tmp/gsd-update/bin/install.js --claude --local && rm -rf /tmp/gsd-update
```

**If GLOBAL install (or unknown):**
```bash
git clone --depth 1 https://github.com/joshlopez1588/get-stuff-done.git /tmp/gsd-update && node /tmp/gsd-update/bin/install.js --claude --global && rm -rf /tmp/gsd-update
```

Capture output. If install fails, show error and exit.

Clear the update cache so statusline indicator disappears:

**If LOCAL install:**
```bash
rm -f ./.claude/cache/gsd-update-check.json
```

**If GLOBAL install:**
```bash
rm -f ~/.claude/cache/gsd-update-check.json
```
</step>

<step name="display_result">
Format completion message (changelog was already shown in confirmation step):

```
╔═══════════════════════════════════════════════════════════╗
║  GSD Updated: v1.5.10 → v1.5.15                           ║
╚═══════════════════════════════════════════════════════════╝

⚠️  Restart Claude Code to pick up the new commands.

[View full changelog](https://github.com/joshlopez1588/get-stuff-done/blob/main/CHANGELOG.md)
```
</step>


<step name="check_local_patches">
After update completes, check if the installer detected and backed up any locally modified files:

Check for gsd-local-patches/backup-meta.json in the config directory.

**If patches found:**

```
Local patches were backed up before the update.
Run /gsd:reapply-patches to merge your modifications into the new version.
```

**If no patches:** Continue normally.
</step>
</process>

<success_criteria>
- [ ] Installed version read correctly
- [ ] Latest version checked via GitHub raw URL
- [ ] Update skipped if already current
- [ ] Changelog fetched and displayed BEFORE update
- [ ] Clean install warning shown
- [ ] User confirmation obtained
- [ ] Update executed via git clone successfully
- [ ] Restart reminder shown
</success_criteria>
