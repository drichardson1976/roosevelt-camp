# Claude Code VS Code Extension — Diagnostic Report (BEFORE REINSTALL)
**Date:** 2026-02-14 ~5:59 PM PST
**VS Code Version:** 1.109.3 (arm64)
**Claude Code Extension:** 2.1.42
**Claude CLI:** 2.1.42 (/Users/derek/.local/bin/claude)
**OS:** macOS Darwin 24.6.0 (Apple Silicon)

---

## Problem
The Claude Code extension in VS Code shows spinning status words ("Baking...", "Synthesizing...", "Doing...") but never produces a response.

## Root Cause Identified
The extension **activates twice** on every VS Code launch, creating two competing MCP servers with different auth tokens. This creates a race condition where the CLI can't determine which WebSocket session is valid.

## Evidence

### Lock Files (Always 2+)
Every VS Code launch creates 2 lock files pointing to the same PID but with different auth tokens:

**Session 1 (17:52, multi-root workspace):**
```
~/.claude/ide/34617.lock → pid:87475, token:bc71a596-31d3-4872-ac3e-b8f8232556af
~/.claude/ide/52068.lock → pid:87475, token:c7e32891-cb27-4f99-bea5-a2a3052d9841
```

**Session 2 (17:59, single folder — same problem):**
```
~/.claude/ide/15289.lock → pid:88057, token:fee12040-ad76-4d29-a729-49356e08e557
~/.claude/ide/38968.lock → pid:88057, token:878cceb6-be4a-401a-a1f1-8b728c73d009
```

### Extension Log Timeline (17:59 session, single folder)
```
17:59:00.333 — "Claude code extension is now active?" → MCP Server on port 15289
17:59:00.773 — "Loading config cache by launching Claude..."
17:59:00.777 — Spawning Claude (permission mode: default) ← config cache process
17:59:00.785 — "launch_claude" message from webview
17:59:00.786 — Spawning Claude (permission mode: bypassPermissions) ← actual session
17:59:02.120 — Config cache Claude writes .claude.json (PID 88119)
17:59:02.095 — Session Claude writes .claude.json (PID 88118) ← RACE CONDITION on same file
17:59:02.245 — Config cache Claude fires SessionEnd → shuts down (but lock file remains)
17:59:02.370 — ERROR: MCP server "claude-vscode" Failed to fetch tools: MCP error -32601: Method not found
17:59:06.356 — "Claude code extension is now active?" → MCP Server on port 38968 ← SECOND ACTIVATION
```

### Key Observations
1. **Double activation:** Extension activates at 17:59:00 AND 17:59:06 (6 seconds apart)
2. **Two Claude CLI processes spawned simultaneously:** PIDs visible in temp file names (88118, 88119)
3. **Race condition on .claude.json:** Both processes write atomically to same file within 25ms
4. **Stale lock files:** Config cache process shuts down but doesn't clean up its lock file
5. **MCP error every startup:** `MCP server "claude-vscode" Failed to fetch tools: MCP error -32601: Method not found`
6. **Not caused by multi-root workspace:** Problem persists with single folder

## VS Code User Settings
```json
{
    "claudeCode.preferredLocation": "panel",
    "claudeCode.allowDangerouslySkipPermissions": true,
    "claudeCode.initialPermissionMode": "bypassPermissions"
}
```

## Claude CLI Settings (~/.claude/settings.json)
```json
{
  "permissions": {
    "allow": [
      "Edit", "Write", "Read",
      "Bash(chmod:*)", "Bash(npm install)", "Bash(brew install:*)", "Bash(brew:*)",
      "Bash(xargs -I {} sh -c 'echo \"\"=== {} ===\"\" && cat \"\"{}\"\"')",
      "Bash(/opt/homebrew/bin/npx playwright test --update-snapshots --project=chromium)",
      "Bash(export PATH=\"/opt/homebrew/bin:$PATH\")",
      "Bash(npx playwright test:*)", "Bash(ls:*)", "Bash(kill:*)",
      "WebFetch(domain:timeapi.io)", "Bash(wc:*)",
      "Read(//Users/derek/Documents/roosevelt-camp/**)"
    ]
  }
}
```

## Installed VS Code Extensions
```
anthropic.claude-code@2.1.42
```
(Only extension installed)

## Remediation Attempts (All Failed)
| Step | Action | Result |
|------|--------|--------|
| 1 | `rm -f ~/.claude/ide/*.lock` | Lock files regenerated immediately, still broken |
| 2 | Quit VS Code → remove locks → reopen | Same 2 lock files created again |
| 3 | Uninstall + reinstall extension | Same problem |
| 4 | `rm -rf ~/.claude/cache ~/.claude/ide` | Same problem |
| 5 | Removed 2nd workspace folder (single root) | Same problem — still double-activates |

## What VS Code Reinstall Clears (That We Didn't)
- `~/Library/Application Support/Code/` — workspace state, extension host state, cached sessions, window state
- `~/Library/Application Support/Code/User/workspaceStorage/` — per-workspace extension data
- `~/Library/Application Support/Code/CachedData/` — compiled extension cache
- VS Code's internal extension registration and activation state
- Possibly Keychain entries for VS Code (OAuth tokens in secure storage)

## Hypothesis
Something in VS Code's persisted state (likely `~/Library/Application Support/Code/`) is causing the extension host to activate the Claude Code extension twice. The extension doesn't guard against double activation, and each activation creates its own MCP server + lock file with a unique auth token. The CLI then has multiple lock files to choose from and either picks the wrong one or gets confused.

The `MCP error -32601: Method not found` error on every startup may also be related — it could indicate the first MCP server is connecting to an endpoint that isn't ready yet, causing a retry that triggers the second activation.

---

## AFTER REINSTALL: Compare These
After reinstalling VS Code and confirming the fix, run these commands and paste results below:

1. `ls -la ~/.claude/ide/` — Should show only 1 lock file
2. Check extension log for single "Claude code extension is now active?" message
3. Check if `MCP error -32601` still appears
4. Check if two Claude CLI processes are spawned or just one

---

## AFTER REINSTALL RESULTS

**Result: VS Code reinstall did NOT fix the issue this time.**

### Fresh Install Findings
- Fresh VS Code install + fresh extension install = SAME double activation
- The double activation is built into extension v2.1.42 (and v2.1.41)
- Not caused by corrupted VS Code state

### Auth Issue Confirmed
- After logout + re-login via CLI (`claude auth login`), the earlier auth error resolved:
  `Error: Could not resolve authentication method. Expected either apiKey or authToken to be set.`
- However, fixing auth did NOT fix the spinning/no-response issue

### Root Cause: Extension Double Activation + Dead Processes
1. Extension activates twice every startup (via `onStartupFinished` + `onWebviewPanel:claudeVSCodePanel`)
2. Each activation creates its own MCP server on a different port
3. Two Claude CLI processes are spawned simultaneously — they race on `.claude.json` locks
4. The config cache process exits immediately, leaving a stale lock file
5. The second activation replaces the webview provider
6. The webview ends up connected to the second MCP server, which has NO Claude process
7. User messages go nowhere — nothing appears in Output panel
8. All spawned Claude processes eventually exit (confirmed: 6 stale lock files, 0 running processes)

### Additional Error (Every Startup)
```
MCP server "claude-vscode" Failed to fetch tools: MCP error -32601: Method not found
```

### Possible Contributing Factor
- Terminal CLI session holds a PID lock on version 2.1.42
- Extension Claude processes log: `Cannot acquire lock for 2.1.42 - held by PID XXXXX`
- Error is marked "NON-FATAL" but may still cause issues

### Resolution
- Switched to using Claude Code CLI in VS Code terminal instead of the extension panel
- CLI works perfectly in all terminals (standalone + VS Code integrated)
- Filed as known issue for future reference

### What Would Need to Be Fixed in the Extension
1. Guard against double activation (deduplicate MCP server creation)
2. Clean up stale lock files on startup and shutdown
3. Ensure webview always connects to the MCP server that has an active Claude process
4. Handle the `.claude.json` lock race between config cache + session processes

