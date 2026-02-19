**IMPORTANT: Read this entire file carefully — do not skim. Every section contains instructions you must follow.**

# CLAUDE CODE REFERENCE DOCUMENT
**Version:** 13.039
**Last Updated:** 2026-02-19
**Purpose:** Critical information that must NEVER be lost during conversation compaction

---

## 🔔 AUDREY — LOCAL SETUP (One-Time)
**Your dad Derek said to do this first!** These are local-only settings that don't transfer through git. Run these steps once on your machine to get the full project tooling:

### 1. Set up permissions (stops Claude from asking to approve every little step)
Create the file `.claude/settings.local.json` in the project folder with this content:
```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(grep *)",
      "Bash(TZ=*)",
      "Bash(gh *)",
      "Bash(python3 *)",
      "Bash(curl *)",
      "Bash(lsof *)",
      "Bash(xargs *)",
      "Bash(ls *)",
      "Bash(wc *)",
      "Bash(kill *)",
      "Bash(chmod *)",
      "Bash(brew *)",
      "Bash(npx *)",
      "Bash(done)",
      "Edit(**)",
      "Write(**)",
      "Read(**)",
      "WebFetch(domain:worldtimeapi.org)",
      "WebFetch(domain:timeapi.io)"
    ]
  }
}
```
Or just ask Claude: "Set up my project permissions so you don't have to ask me to approve routine operations."

### 2. Set up MCP servers (lets Claude talk to GitHub, Supabase, and Netlify directly)
MCP servers are already configured in `.mcp.json` (project-scoped). They activate automatically when Claude Code opens this project. No keys needed — Supabase and Netlify use browser login on first use.

If you need to re-add them manually:
```bash
claude mcp add --scope project supabase -- npx -y @supabase/mcp-server-supabase@latest --project-ref=rdrtsebhninqgfbrleft
claude mcp add --scope project netlify -- npx -y @netlify/mcp@latest
claude mcp add --scope project github -- npx -y @anthropic/github-mcp-server --repo drichardson1976/roosevelt-camp
```

### 3. Set up pre-commit hook (warns about version mismatches)
Ask Claude: "Set up the git pre-commit hook for version checking" and it will create it for you.

**Once you've completed these steps, delete this section from CLAUDE.md so it doesn't clutter things up.**

---

## 📌 PROJECT OVERVIEW

This is primarily an HTML/Markdown project with multiple standalone HTML app pages. When checking tables, files, or content, always check ALL instances — not a subset. If asked to verify something across the codebase, be exhaustive.

---

## 🚨 CRITICAL INSTRUCTIONS - READ FIRST

### General Principles
- When asked to do something (e.g., 'push all files'), just do it with sensible defaults. Don't pause to ask clarifying questions about minor details like .DS_Store files — use a .gitignore or make a reasonable choice and move on.

### Pre-Work Checklist (EVERY task)
Before starting ANY work, complete this checklist:
1. **Read CLAUDE.md** — Re-read this file to ensure you follow all rules (especially after conversation compaction)
2. **`git pull` (both branches)** — **MANDATORY** - Pull latest changes on BOTH `main` and `dev` branches FIRST to avoid conflicts. Run: `git fetch --all && git pull origin main && git pull origin dev` (or switch to each branch and pull). Do this EVERY time
3. **Check current versions** — Run: `grep 'const VERSION' *.html` to know the starting state
4. **Plan your changes** — Identify which files will be modified so you know where to bump versions and add release notes

### Post-Work Checklist (EVERY task)
After completing ANY work:
1. **`git add`** — Stage all changed files
2. **`git commit`** — Commit with descriptive message including author attribution
3. **`git push`** — **MANDATORY** - Push changes to remote so others have access immediately
4. **Say "Start testing" with links** — Always end your final message with "Start testing" plus clickable hyperlinks. **Choose ONE based on where you pushed:**
   - **If you pushed to `dev` only (development change):** Show localhost links ONLY. Do NOT include the production URL.
     `Start testing: [Main Site](http://localhost:8000) | [Tests](http://localhost:8000/tests.html)`
   - **If you pushed to `main` (production release):** Show the live site link ONLY. Do NOT include localhost. (tests.html only works against the dev database, not production)
     `Start testing: [Live Site](https://rhsbasketballdaycamp.com)`

### PRD & Tests Maintenance (MANDATORY — update EVERY time changes are made)
- **RULE: Any change to the project MUST include corresponding updates to `prd.html` and `tests.html`** — these files are how Derek and Audrey understand and verify the system. Skipping updates makes the documentation and tests stale.
- **prd.html** — When adding new features, database tables, user flows, or changing the file structure:
  - Update the relevant data structure at the top of `prd.html` (e.g., `ROLES`, `LIFECYCLE`, `DATA_STORED`, `FEATURES`, `TECH_SIMPLE`)
  - If adding a new feature, add it to the `FEATURES` array with `done: true` or `done: false`
  - If completing a planned feature, change `done: false` to `done: true`
  - If adding a new database table, add it to `DATA_STORED` with a plain-English description
  - If adding a new tool/service, add it to `TECH_SIMPLE`
  - Keep descriptions simple — a 16-year-old should understand them
- **tests.html** — When building new features:
  - Add tests for any new business logic functions (discount calculations, validation, etc.)
  - Add data integrity tests for any new database tables
  - Add API endpoint tests for any new Netlify functions
  - Run `tests.html` on localhost before committing to verify nothing is broken
  - The "Copy Results" button lets users share test output with Claude for debugging
- **Sync rule** — The following data in `prd.html` must stay in sync with actual code:
  - `FEATURES` statuses must reflect the current implementation state
  - `DATA_STORED` must cover all active database tables
  - `TECH_SIMPLE` must list all external services used

### Version & Timestamp Updates
- **Each file has its own `VERSION`** — this is the version shown in the red/green ribbon at the top of each page
- **Do NOT use a unified/shared version** — there is no `PROJECT_VERSION`. Each file's ribbon displays its own `const VERSION` so you can tell when that specific file was last modified
- **ONLY** bump the version in files that actually changed — do NOT touch files that had no modifications
- When bumping, use the **next global version number**: `max(VERSION across all files) + 1`
- This means files may be at different versions — that is expected and correct
- The version in the ribbon tells you when that specific file was last changed, which is useful for debugging (e.g., "is this page up to date?")
- **ALWAYS** use external time source for BUILD_DATE in Pacific timezone (only in changed files)
- **Command:** `TZ='America/Los_Angeles' date '+%m-%d-%Y %I:%M %p'`
- **Format:** `const BUILD_DATE = new Date("2026-02-08T07:22:00");`

#### Versioning Example
```
Starting state:    admin=v1, index=v1, parent=v1, counselor=v1
Change admin.html: admin=v2, index=v1, parent=v1, counselor=v1
Change parent.html: admin=v2, index=v1, parent=v3, counselor=v1
Change admin.html: admin=v4, index=v1, parent=v3, counselor=v1
Change index.html: admin=v4, index=v5, parent=v3, counselor=v1
```
Each changed file jumps to `max + 1`. Unchanged files stay where they are.

### Release Notes
- **ALWAYS** add release notes to the `RELEASE_NOTES` array in **ALL 4 files**: `admin.html`, `index.html`, `parent.html`, `counselor.html`
- All 4 files have their own `RELEASE_NOTES` array (line ~52) and their own "Notes" button in the ribbon
- The same release note entries must be kept in sync across all 4 files
- Include version, date, time (PST), author, and detailed changes array
- Be specific about what was fixed/added/changed

### Multi-File Consistency
- When updating release notes, process documentation, or any repeated content, ALWAYS apply changes to ALL HTML files (index.html, admin.html, parent.html, counselor.html), not just one.
- Verify by grepping for the section across all files before committing.
- This applies to version bumps, release notes, shared constants, and any content that must stay synchronized.

### Bug Fixes
- When making code fixes, verify the fix actually works before committing.
- If a fix involves visual/UI behavior (zoom, crop, positioning), describe what you changed and why it should work.
- If a first fix doesn't fully resolve the issue, dig deeper into root cause rather than applying surface patches.

### SQL for Supabase
- When providing SQL to run in the Supabase SQL Editor, **ALWAYS** present it in a single fenced code block (```sql ... ```) so the user can click the copy icon directly from the chat
- Do NOT split SQL across multiple code blocks — keep it all in one copyable block
- Include comments in the SQL explaining what each section does

### Git Commit Protocol
- **ALWAYS** run `git pull` on BOTH `main` and `dev` branches FIRST before starting ANY work to get the latest changes
- **ALWAYS** commit and push all file changes after every completed request — multiple people work on this project simultaneously (Derek Richardson, Audrey Richardson), so changes must be pushed promptly to avoid conflicts
- **ALWAYS** run `git push` at the END of every task to ensure changes are shared
- **NEVER** update git config
- **NEVER** run destructive git commands without explicit user permission
- **NEVER** skip hooks (--no-verify) unless user explicitly requests
- **ALWAYS** use heredoc for commit messages to preserve formatting
- **ALWAYS** include `Co-Authored-By:` with your actual model name (e.g. `Claude Opus 4.6`, `Claude Sonnet 4.5`) followed by `<noreply@anthropic.com>`
- **ALWAYS** after pushing to GitHub or deploying, follow the full post-push protocol: verify the push succeeded, check deployment status, and report back. Do not skip these steps unless explicitly told to.

### Author Attribution
- When **Audrey Richardson** makes changes (current user), note in release notes: `Author: Audrey Richardson`
- When **Derek Richardson** makes changes, note in release notes: `Author: Derek Richardson`
- Always include the author name in commit messages and release notes so it's clear who requested the changes

### Change Summary Table
- **ALWAYS** provide a change summary table after every completed request
- **ALWAYS** list ALL project files in the table, even if they were NOT changed
- **ALWAYS** make file names clickable hyperlinks using markdown link syntax: `[filename](filename)` — this lets the user click to open the file directly
- **ALWAYS** show version numbers: `vX.XXX → vY.YYY` for changed files, or `vX.XXX` (current) for unchanged
- Mark unchanged files with "No changes" so it's clear they were reviewed
- Format as a markdown table with File, Version, and Changes columns
- Keep change descriptions brief but specific (what was added/changed/fixed)
- Example format:

| File | Version | Changes |
|------|---------|---------|
| [admin.html](admin.html) | v12.190 → v12.195 | Added new Dashboard feature, release notes |
| [index.html](index.html) | v12.193 → v12.195 | Fixed registration bug |
| [parent.html](parent.html) | v12.190 | No changes |
| [counselor.html](counselor.html) | v12.190 | No changes |
| [CLAUDE.md](CLAUDE.md) | — | Added new instruction for change summaries |
| [prd.html](prd.html) | v1.000 | No changes |
| [tests.html](tests.html) | v1.000 | No changes |
| [index-backup-v12.142.html](index-backup-v12.142.html) | — | No changes |
| [migrations/*](migrations/) | — | No changes |

---

## 📊 DATABASE SCHEMA

### Database Verification Rule
When working with Supabase or any database, always verify that ALL referenced columns and tables actually exist in the live database before writing code that depends on them. Run a schema check first.

### Environment & Schema
```javascript
const ENV = getEnvironment(); // 'development' or 'production'
const SCHEMA = ENV === 'development' ? 'dev' : 'public';

// localhost, 127.0.0.1, github.io → DEV schema
// Netlify production → PUBLIC schema
```

### Supabase Connection
```javascript
const SUPABASE_URL = 'https://rdrtsebhninqgfbrleft.supabase.co';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: SCHEMA },
  global: { headers: { 'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA } }
});
```

### Supabase Storage (CDN)
Photos are stored in Supabase Storage instead of the database for faster page loads.

- **Bucket:** `camp-photos` (public, 5MB limit, JPEG/PNG/WebP/GIF)
- **Folder structure:** `{schema}/site/`, `{schema}/food/`, `{schema}/counselors/`, `{schema}/parents/`, `{schema}/campers/`, `{schema}/emergency-contacts/`
- **Public URL pattern:** `https://rdrtsebhninqgfbrleft.supabase.co/storage/v1/object/public/camp-photos/{schema}/{folder}/{filename}`
- **Policies:** Public read, anon insert/update/delete (app uses anon key)
- **Created by:** Migration `07_create_storage_bucket.sql` (applied 2026-02-19)

### Table Structure (STANDARD)
ALL Supabase tables follow this structure:
```sql
CREATE TABLE table_name (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Single row per table with id='main'
-- Data stored as JSONB array or object
```

### Storage Access Pattern
```javascript
// Read
const data = await storage.get('table_name', 'main');

// Write
await storage.set('table_name', 'main', dataArray);
```

---

## 📋 ACTIVE TABLES (25 tables)

These tables are actively used in the application code:

### Core User Tables
1. **camp_admins** - Admin user accounts (JSONB array of admin objects)
2. **camp_parents** - Parent login accounts (JSONB array) - Split from deleted camp_registered_users
3. **camp_counselor_users** - Counselor login accounts (JSONB array) - Split from deleted camp_registered_users

### People & Relationships
4. **camp_counselors** - Counselor profiles (separate from login accounts)
5. **camp_campers** - Camper profiles
6. **camp_camper_parent_links** - Junction table linking campers to parents
7. **camp_camper_emergency_contact_links** - Junction table linking campers to emergency contacts
8. **camp_emergency_contacts** - Emergency contact records

### Camp Operations
9. **camp_registrations** - Session registration requests
10. **camp_assignments** - Pod/counselor assignments per session
11. **camp_sessions** - Camp session definitions (NOT a table - stored in camp_dates)
12. **camp_dates** - Camp calendar and session dates
13. **camp_blocked_sessions** - Dates when registration is blocked

### Counselor Management
14. **camp_counselor_availability** - Counselor day-by-day availability
15. **camp_counselor_schedule** - Assigned working schedule per counselor
16. **camp_availability_change_requests** - Pending availability modification requests
17. **camp_profile_change_requests** - Pending profile update requests

### Content & Media
18. **camp_content** - Website content (single JSONB object, not array)
19. **camp_food_photos** - Food gallery images (JSONB object with keys)
20. **camp_site_photos** - Site gallery images (JSONB object with keys)
21. **camp_gym_rentals** - Gym rental dates (JSONB object: {date: {morning: bool, afternoon: bool}})

### System Tables
22. **camp_messages** - Admin messages to parents/counselors
23. **camp_onboarding_progress** - User onboarding completion tracking (JSONB object: {email: progress})
24. **camp_change_history** - Audit log of all changes (JSONB array)
25. **camp_password_reset_tokens** - Password reset tokens (each row = one token, id=token string)
26. **camp_rate_limits** - Rate limiting for password resets and other actions (JSONB object: {identifier: timestamps})

---

## 🗑️ DELETED TABLES (As of v12.188 - 2026-02-08)

These tables were deleted from the database on 2026-02-08 using migration script 05_delete_unused_tables.sql:

### Legacy Tables (Deleted - Were Replaced)
- **camp_registered_users** ❌ DELETED - Was split into `camp_parents` + `camp_counselor_users`
- **camp_child_parent_links** ❌ DELETED - Was replaced by `camp_camper_parent_links`
- **camp_children** ❌ DELETED - Was replaced by `camp_campers`

### Unused System Tables (Deleted - Never Used)
- **guest_requests** ❌ DELETED - Not referenced in any code (DEV only)
- **players** ❌ DELETED - Not referenced in any code (DEV only)
- **runs** ❌ DELETED - Not referenced in any code (DEV only)
- **status_history** ❌ DELETED - Not referenced in any code (DEV only)
- **camp_referrals** ❌ DELETED - Not referenced in any code (both schemas)

### Result
- **Before:** 32 tables (DEV), 31 tables (PUBLIC)
- **After:** 23 tables (DEV), 24 tables (PUBLIC) - includes camp_camper_emergency_contact_links in PUBLIC only
- **Reduction:** 25% fewer tables
- **Status:** All remaining tables are actively used

---

## 🔧 CRITICAL CODE PATTERNS

### Object vs Array Tables
Some tables store JSONB objects (not arrays):

```javascript
// OBJECT-based tables (use Object.entries, Object.keys)
const content = await storage.get('camp_content', 'main'); // Single object
const gymRentals = await storage.get('camp_gym_rentals', 'main'); // {date: data}
const foodPhotos = await storage.get('camp_food_photos', 'main'); // {key: photo}
const sitePhotos = await storage.get('camp_site_photos', 'main'); // {key: photo}
const onboardingProgress = await storage.get('camp_onboarding_progress', 'main'); // {email: progress}
const counselorSchedule = await storage.get('camp_counselor_schedule', 'main'); // {counselorId: schedule}
const availability = await storage.get('camp_counselor_availability', 'main'); // {counselorId: dates}
const blockedSessions = await storage.get('camp_blocked_sessions', 'main'); // {date: reason}
const assignments = await storage.get('camp_assignments', 'main'); // {sessionKey: data}

// ARRAY-based tables (use .map, .filter, .find)
const parents = await storage.get('camp_parents', 'main'); // Array of parent objects
const counselors = await storage.get('camp_counselors', 'main'); // Array
const campers = await storage.get('camp_campers', 'main'); // Array
// ... most other tables
```

### Input Focus Loss Prevention (CRITICAL)
**Problem:** When form inputs are rendered inside a large parent component, typing causes the parent to re-render, which can cause inputs to lose focus (the cursor disappears and the user has to tap/click the input again after every keystroke).

**Rules — NEVER violate these:**
1. **NEVER** put controlled input state (`value` + `onChange` → `setState`) directly in a large parent component (like `RooseveltCamp`) if the inputs are in a modal or form. The parent re-render on every keystroke causes focus loss.
2. **ALWAYS** extract modals/forms with text inputs into their own standalone component (defined outside the parent) that manages its own internal form state. The component calls back to the parent only on submit (not on every keystroke).
3. **Pattern to follow:** See `ECAddModal`, `AddChildForm` — they manage their own `useState` for each field and only call `onSave(data)` when the user clicks the submit button.
4. **Anti-pattern to avoid:** `<input value={parentState.name} onChange={e => setParentState({...parentState, name: e.target.value})} />` inside the main component's return JSX.
5. For inline editing (not in modals), use the `StableInput` / `StableTextarea` components which use local state + `onBlur` sync.

### Danger Zone Rendering
When adding tables to Danger Zone in admin.html:
- **Arrays:** Use `.map()`, `.length`
- **Objects:** Use `Object.entries()`, `Object.keys().length`
- **Always:** Add null safety: `(array || [])` or `(object || {})`

### Helper Functions (admin.html ~line 6317)
```javascript
// Get cropped image from photo objects
const getCroppedImage = (photo) => {
  if (!photo) return null;
  return typeof photo === 'string' ? photo : photo.cropped;
};

// Get food photo (added v12.186)
const getFoodPhoto = (key) => {
  const data = foodPhotos?.[key];
  if (!data) return null;
  return typeof data === 'string' ? data : data.cropped;
};
```

---

## 📁 FILE STRUCTURE

### HTML Files (4 main + 1 backup)
- **index.html** - Login page, user role detection
- **parent.html** - Parent dashboard (campers, registrations, emergency contacts)
- **counselor.html** - Counselor dashboard (availability, profile, schedule)
- **admin.html** - Admin dashboard (all management functions)
- **index-backup-v12.142.html** - Backup snapshot

### Netlify Functions (/netlify/functions/)
- **send-email.js** - Send emails via Resend API
- **request-password-reset.js** - Generate token, store in Supabase, send reset email
- **reset-password.js** - Validate token, update password in Supabase
- **send-sms.js** - Send SMS via Twilio API
- **send-verification-code.js** - Look up user by phone, generate 6-digit code, store in Supabase, send via Twilio
- **verify-code.js** - Validate SMS verification code, return user's login info

### Migration Scripts (/migrations folder)
- **00_diagnose_structure.sql** - Check table structure
- **01_create_new_tables_CORRECT.sql** - Create camp_parents and camp_counselor_users
- **02_migrate_data_CORRECT.sql** - Split registered_users into new tables
- **03_verify_both_schemas.sql** - Verify migration success
- **04_list_all_tables.sql** - List all tables in both schemas
- **05_delete_unused_tables.sql** - Delete legacy/unused tables (2026-02-08)
- **06_create_ec_links_dev.sql** - Create camp_camper_emergency_contact_links in dev schema
- **07_create_storage_bucket.sql** - Create camp-photos storage bucket + policies (2026-02-19)

---

## 🔗 MCP SERVERS & PROJECT IDS (Do NOT Mix Up)

MCP servers are configured per-project in `.mcp.json` so Claude only talks to the right service. This table is the single source of truth — if you add a new project, add a row here.

| Project | Supabase Project Ref | Supabase URL | Netlify Site ID | Netlify Domain |
|---------|---------------------|--------------|-----------------|----------------|
| **Roosevelt Camp** | `rdrtsebhninqgfbrleft` | `https://rdrtsebhninqgfbrleft.supabase.co` | `94ce673f-907a-4b03-bb13-9544dc98a132` | rhsbasketballdaycamp.com |

**How this prevents mix-ups:**
- MCP servers are in `.mcp.json` at the project root (not global) — they only activate when Claude opens that specific project folder
- Supabase MCP is locked to `--project-ref=rdrtsebhninqgfbrleft` so it can only see this one database
- Netlify CLI auto-detects the site from the project folder (linked via `netlify link`)
- If you create a new project, set up a separate `.mcp.json` in that project's folder with its own IDs

**MCP Verification Status (2026-02-19):**
- **Supabase MCP** — Verified working. Can list tables, run SQL, apply migrations.
- **Netlify MCP** — Verified working. Can read project details, deploy sites, manage env vars.

---

## 🌐 EXTERNAL SERVICES & INFRASTRUCTURE

### Netlify (Hosting & Serverless Functions)
- **Site:** Deployed from GitHub, auto-deploys on push to `main`
- **Domain:** rhsbasketballdaycamp.com (DNS managed in Netlify)
- **Team members:** Derek Richardson (owner), Audrey Richardson (invited 2026-02-19)
- **Functions directory:** `netlify/functions/`
- **Environment Variables (Site configuration → Environment variables):**
  - `RESEND_API_KEY` — API key for Resend email service
  - `SUPABASE_URL` — `https://rdrtsebhninqgfbrleft.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase secret key (server-side only, bypasses RLS)
  - `SITE_URL` — `https://rhsbasketballdaycamp.com`
  - `TWILIO_ACCOUNT_SID` — Twilio account SID (not yet configured)
  - `TWILIO_AUTH_TOKEN` — Twilio auth token (not yet configured)
  - `TWILIO_PHONE_NUMBER` — Twilio phone number (not yet configured)

### Netlify Functions
| Function | Purpose | Uses |
|----------|---------|------|
| `send-email.js` | General email sending | Resend API |
| `request-password-reset.js` | Generate reset token, store in Supabase, send reset email | Supabase + Resend |
| `reset-password.js` | Validate token, update password in Supabase | Supabase |
| `send-sms.js` | Send SMS messages | Twilio API |
| `send-verification-code.js` | Look up user by phone, send 6-digit SMS code | Supabase + Twilio |
| `verify-code.js` | Validate SMS code, return user login info | Supabase |

### Resend (Email Service)
- **Account:** derek.richardson@gmail.com
- **Verified domain:** rhsbasketballdaycamp.com
- **From address:** `Roosevelt Basketball Day Camp <campdirector@rhsbasketballdaycamp.com>`
- **Reply-To:** `rhsdaycamp@gmail.com` (Gmail inbox for managing responses)
- **DNS records added to Netlify:** DKIM (3 TXT records), SPF (TXT), MX, DMARC (TXT)

### Supabase (Database & Storage)
- **Project:** Roosevelt Camp
- **URL:** `https://rdrtsebhninqgfbrleft.supabase.co`
- **Schemas:** `dev` (localhost/dev) and `public` (production)
- **Storage:** `camp-photos` bucket for all photo uploads (CDN-backed)
- **Anon key:** Used in client-side code (safe for browsers)
- **Service role key:** Used in Netlify functions only (never exposed to client)
- **Team members:** Derek Richardson (owner), Audrey Richardson (invited 2026-02-19)

### Twilio (SMS)
- **Account:** derek.richardson@gmail.com
- **Phone number:** +12062034111 (206) 203-4111
- **Env vars configured in Netlify:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- **Account type:** Paid (no trial limitations)
- **A2P 10DLC registration:** Required for production US SMS at scale — not yet completed

### Google Login (Planned)
- **Status:** Not yet implemented — buttons show "coming soon"
- **Requires:** Google Cloud Console project, OAuth 2.0 credentials (free)

### Apple Login (Not Planned Yet)
- **Status:** Not yet implemented — buttons show "coming soon"
- **Requires:** Apple Developer Program ($99/year) — use personal account, NOT work account
- **Note:** User's work Apple developer account (dxr@deako.com) should NOT be used for camp

---

## 🐛 COMMON ERRORS & FIXES

### TypeError: X.map is not a function
**Cause:** Trying to use `.map()` on an object-based table
**Fix:** Use `Object.entries(data).map(([key, value]) => ...)`

### ReferenceError: getFoodPhoto is not defined
**Cause:** Missing helper function (added in v12.186)
**Fix:** Already fixed in current version

### Browser cache issues
**Cause:** Babel transpiles in-browser, cache persists
**Fix:** Empty Cache and Hard Reload (DevTools → Right-click refresh)

### history.slice is not a function
**Cause:** Used wrong variable name (`history` instead of `changeHistory`)
**Fix:** Always use `changeHistory` for change history, with null safety: `(changeHistory || [])`

---

## 📝 ADMIN DASHBOARD STRUCTURE

### Current Tab Structure (Flat - as of v13.000)
1. Dashboard
2. Counselors
3. Parents
4. Campers
5. Registrations
6. Assignments
7. Sessions (gymrentals)
8. Approval
9. Content
10. History
11. Danger Zone

### Planned Hierarchical Structure (From Plan)
**Top-Level:**
- Dashboard
- Family Setup → Parents, Campers, Session Registrations
- Counselor Setup → Counselors, Work Availability
- Registrations (Approval workflow)
- Pod Setup → Counselor and Camper Assignments
- Camp Setup → Gym Rental Days, Public Website Content
- History
- Danger Zone

**Implementation Status:** NOT YET IMPLEMENTED - Still using flat structure

---

## 🎯 MULTI-PARENT FEATURE (Planned - Not Implemented)

### Current System
- Single parent per camper supported
- Parents stored in `camp_parents` table
- Links in `camp_camper_parent_links`: `[{camperId, parentEmail}]`
- Emergency contacts separate

### Planned Enhancement
- Allow first parent to add 2nd, 3rd, 4th+ parents
- Each parent gets own email/password login
- All parents auto-become emergency contacts
- Immediate access (no invitation flow)
- All parents have equal permissions

**Implementation Status:** NOT YET IMPLEMENTED

---

## 🚀 DEPLOYMENT

### Development (localhost)
```bash
cd /Users/derek/Documents/roosevelt-camp
python3 -m http.server
# Opens on http://localhost:8000
# Uses DEV schema
```

### Production
- Netlify deployment
- Uses PUBLIC schema
- Auto-deploys from git push

---

## 📞 SUPPORT

### User Help Commands
- `/help` - Get help with Claude Code
- Feedback: https://github.com/anthropics/claude-code/issues

### Version Info Location
- Red ribbon in top-right corner
- Format: `DEVELOPMENT • v13.000 • ✓ DB (dev) • Built: 02-08-2026 8:31 AM (-Xs ago) • Notes`
- Clicking "Notes" shows release notes modal

---

## ⚠️ NEVER FORGET

1. ✅ **`git pull` BOTH branches FIRST** — Always pull latest changes on BOTH `main` and `dev` before starting ANY work
2. ✅ Run the Pre-Work Checklist before every task (read CLAUDE.md, git pull, check versions)
3. ✅ Only bump version in files that changed (use max version + 1)
4. ✅ Use external time source for timestamps
5. ✅ Add release notes to ALL 4 files (admin.html, index.html, parent.html, counselor.html)
6. ✅ Check if table is object or array before rendering
7. ✅ Add null safety: `(data || [])` or `(data || {})`
8. ✅ Test in incognito window if browser cache issues
9. ✅ Update Danger Zone when adding new tables
10. ✅ Use heredoc for git commit messages
11. ✅ Never skip git hooks without permission
12. ✅ Consult this document after conversation compaction
13. ✅ Provide a change summary table with version numbers after every completed request
14. ✅ **`git push` LAST** — Always push changes at the END of every task
15. ✅ **Author attribution** — Note that Audrey Richardson made the changes in release notes/commits
16. ✅ **ALWAYS update `prd.html`** when ANY project changes are made (features, tables, services, statuses)
17. ✅ **ALWAYS update `tests.html`** when building new features or business logic — add corresponding tests
18. ✅ Skipping PRD/tests updates is NOT allowed — these are how the team understands and verifies the system

---

**End of Reference Document**
