# Session Summary — February 15, 2026
**Author:** Derek Richardson
**Assistant:** Claude Opus 4.6

---

## What We Did

We reviewed the Claude Code `/insights` report and implemented all of its recommendations for the roosevelt-camp project.

### 1. CLAUDE.md — Added 6 Insight-Driven Rules
Added new sections based on friction patterns identified in the insights report:
- **Project Overview** — Always check ALL instances across the codebase, be exhaustive
- **General Principles** — Act with sensible defaults, don't ask unnecessary clarifying questions
- **Multi-File Consistency** — Always update ALL 4 HTML files (index, admin, parent, counselor), verify with grep before committing
- **Bug Fixes** — Verify fixes work before committing, dig into root causes instead of surface patches
- **Post-push protocol** — Always verify push succeeded and report deployment status
- **Database Verification** — Check that all referenced tables/columns exist in live DB before writing dependent code

### 2. Project Permissions (`.claude/settings.local.json`)
Replaced the overly specific permission rules (each git command listed individually) with broad wildcard patterns:
- `Bash(git *)`, `Bash(grep *)`, `Bash(TZ=*)`, etc.
- Added `Edit(**)`, `Write(**)`, `Read(**)`  for the project directory
- Result: Claude no longer prompts for approval on routine operations

### 3. Custom `/release` Skill (`.claude/skills/release/SKILL.md`)
Created a reusable slash command for the deploy workflow:
1. Ask for version number and change summary
2. Update version references in ALL HTML files
3. Update release notes in ALL HTML files
4. Git add, commit, push
5. Verify push and report deployment status

### 4. Git Pre-Commit Hook (`.git/hooks/pre-commit`)
Created a hook that runs on every commit and shows which HTML file is at which version. Warning only (doesn't block commits) since files intentionally have different versions. Confirms the hook is working — we saw it fire during our commits.

### 5. GitHub MCP Server
```
claude mcp add github -- npx -y @anthropic/github-mcp-server --repo drichardson1976/roosevelt-camp
```
Stored in `~/.claude.json`. Lets Claude interact with the GitHub repo directly.

### 6. Supabase MCP Server
```
claude mcp add supabase -- npx -y @supabase/mcp-server --supabase-url https://rdrtsebhninqgfbrleft.supabase.co --supabase-key [KEY FROM NETLIFY]
```
Stored in `~/.claude.json`. Lets Claude query the live database schema directly.

**Note:** GitHub push protection blocked us from committing the Supabase key to the repo. We amended the commit to use a placeholder instead.

### 7. Audrey's Setup Instructions
Added a one-time setup section at the top of CLAUDE.md telling Audrey to:
1. Create `.claude/settings.local.json` with project permissions
2. Run the two `claude mcp add` commands in a separate terminal
3. Ask Claude to set up the pre-commit hook
4. Delete the section when done

---

## What's Local-Only (not in git)
These must be set up per-machine:
- `.claude/settings.local.json` — permission rules
- `.git/hooks/pre-commit` — version mismatch warning
- `~/.claude.json` MCP servers — GitHub and Supabase

## What's In Git (shared automatically)
- `CLAUDE.md` — all 6 new rules + Audrey's setup instructions
- `.claude/skills/release/SKILL.md` — the `/release` custom skill

---

## Key Insight Friction Points These Address
| Friction | Fix |
|----------|-----|
| Claude only updates some files, not all 4 | Multi-File Consistency rule + `/release` skill |
| Claude asks too many clarifying questions | General Principles rule + broader permissions |
| Incomplete fixes that need second attempts | Bug Fixes rule (verify + root cause) |
| Wrong assumptions about DB schema | Database Verification rule + Supabase MCP |
| Forgot post-push verification | Post-push protocol rule |
| Version mismatches across files | Pre-commit hook warning |
