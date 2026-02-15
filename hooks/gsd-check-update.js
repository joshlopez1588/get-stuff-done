#!/usr/bin/env node
// Check for GSD updates in background, write result to cache
// Called by SessionStart hook - runs once per session
//
// Checks two sources:
// 1. Fork (joshlopez1588/get-stuff-done) — for /gsd:update
// 2. Upstream (glittercowboy/get-shit-done) — for /gsd:sync

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const homeDir = os.homedir();
const cwd = process.cwd();
const cacheDir = path.join(homeDir, '.claude', 'cache');
const cacheFile = path.join(cacheDir, 'gsd-update-check.json');

// VERSION file locations (check project first, then global)
const projectVersionFile = path.join(cwd, '.claude', 'get-stuff-done', 'VERSION');
const globalVersionFile = path.join(homeDir, '.claude', 'get-stuff-done', 'VERSION');

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Run check in background (spawn background process)
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const https = require('https');

  const cacheFile = ${JSON.stringify(cacheFile)};
  const projectVersionFile = ${JSON.stringify(projectVersionFile)};
  const globalVersionFile = ${JSON.stringify(globalVersionFile)};

  // Sync state file for upstream tracking
  const syncStateFile = ${JSON.stringify(path.join(homeDir, '.claude', 'get-stuff-done', 'sync-state.json'))};

  // Check project directory first (local install), then global
  let installed = '0.0.0';
  try {
    if (fs.existsSync(projectVersionFile)) {
      installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
    } else if (fs.existsSync(globalVersionFile)) {
      installed = fs.readFileSync(globalVersionFile, 'utf8').trim();
    }
  } catch (e) {}

  // Read last synced upstream version from sync state
  let lastSyncedUpstream = null;
  try {
    if (fs.existsSync(syncStateFile)) {
      const state = JSON.parse(fs.readFileSync(syncStateFile, 'utf8'));
      lastSyncedUpstream = state.last_synced_upstream_version || null;
    }
  } catch (e) {}

  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode));
          res.resume();
          return;
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  async function check() {
    const result = {
      update_available: false,
      upstream_sync_available: false,
      installed,
      latest: 'unknown',
      upstream_latest: 'unknown',
      last_synced_upstream: lastSyncedUpstream,
      checked: Math.floor(Date.now() / 1000)
    };

    // Check fork version
    try {
      const forkPkg = await fetchJson('https://raw.githubusercontent.com/joshlopez1588/get-stuff-done/main/package.json');
      result.latest = forkPkg.version || 'unknown';
      result.update_available = result.latest !== 'unknown' && installed !== result.latest;
    } catch (e) {}

    // Check upstream version
    try {
      const upstreamPkg = await fetchJson('https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/package.json');
      result.upstream_latest = upstreamPkg.version || 'unknown';
      // Upstream sync available if upstream version differs from last synced
      if (result.upstream_latest !== 'unknown' && lastSyncedUpstream) {
        result.upstream_sync_available = result.upstream_latest !== lastSyncedUpstream;
      } else if (result.upstream_latest !== 'unknown' && !lastSyncedUpstream) {
        // No sync state yet — might have upstream changes
        result.upstream_sync_available = true;
      }
    } catch (e) {}

    fs.writeFileSync(cacheFile, JSON.stringify(result));
  }

  check().catch(() => {});
`], {
  stdio: 'ignore',
  windowsHide: true,
  detached: true
});

child.unref();
