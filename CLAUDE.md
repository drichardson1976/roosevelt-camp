# CLAUDE CODE REFERENCE DOCUMENT
**Last Updated:** 2026-02-08
**Purpose:** Critical information that must NEVER be lost during conversation compaction

---

## 🚨 CRITICAL INSTRUCTIONS - READ FIRST

### Version & Timestamp Updates
- **ONLY** bump the version in files that actually changed — do NOT touch files that had no modifications
- When bumping, use the **next global version number**: `max(VERSION across all files) + 1`
- This means files may be at different versions — that is expected and correct
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
- **ALWAYS** add release notes to `admin.html` RELEASE_NOTES array
- Include version, date, time (PST), author, and detailed changes array
- Be specific about what was fixed/added/changed

### Git Commit Protocol
- **ALWAYS** commit and push all file changes after every completed request — multiple people work on this project simultaneously (Derek Richardson, Audrey Richardson), so changes must be pushed promptly to avoid conflicts
- **ALWAYS** pull before starting work to get the latest changes
- **NEVER** update git config
- **NEVER** run destructive git commands without explicit user permission
- **NEVER** skip hooks (--no-verify) unless user explicitly requests
- **ALWAYS** use heredoc for commit messages to preserve formatting
- **ALWAYS** include `Co-Authored-By:` with your actual model name (e.g. `Claude Opus 4.6`, `Claude Sonnet 4.5`) followed by `<noreply@anthropic.com>`

### Change Summary Table
- **ALWAYS** provide a change summary table after every completed request
- **ALWAYS** list ALL project files in the table, even if they were NOT changed
- **ALWAYS** show version numbers: `vX.XXX → vY.YYY` for changed files, or `vX.XXX` (current) for unchanged
- Mark unchanged files with "No changes" so it's clear they were reviewed
- Format as a markdown table with File, Version, and Changes columns
- Keep change descriptions brief but specific (what was added/changed/fixed)
- Example format:

| File | Version | Changes |
|------|---------|---------|
| `admin.html` | v12.190 → v12.195 | Added new Dashboard feature, release notes |
| `index.html` | v12.193 → v12.195 | Fixed registration bug |
| `parent.html` | v12.190 | No changes |
| `counselor.html` | v12.190 | No changes |
| `CLAUDE.md` | — | Added new instruction for change summaries |
| `index-backup-v12.142.html` | — | No changes |
| `migrations/*` | — | No changes |

---

## 📊 DATABASE SCHEMA

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

## 📋 ACTIVE TABLES (23 tables)

These tables are actively used in the application code:

### Core User Tables
1. **camp_admins** - Admin user accounts (JSONB array of admin objects)
2. **camp_parents** - Parent login accounts (JSONB array) - Split from deleted camp_registered_users
3. **camp_counselor_users** - Counselor login accounts (JSONB array) - Split from deleted camp_registered_users

### People & Relationships
4. **camp_counselors** - Counselor profiles (separate from login accounts)
5. **camp_campers** - Camper profiles
6. **camp_camper_parent_links** - Junction table linking campers to parents
7. **camp_camper_emergency_contact_links** - Junction table (PUBLIC schema only)
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

### Migration Scripts (/migrations folder)
- **00_diagnose_structure.sql** - Check table structure
- **01_create_new_tables_CORRECT.sql** - Create camp_parents and camp_counselor_users
- **02_migrate_data_CORRECT.sql** - Split registered_users into new tables
- **03_verify_both_schemas.sql** - Verify migration success
- **04_list_all_tables.sql** - List all tables in both schemas

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

1. ✅ Only bump version in files that changed (use max version + 1)
2. ✅ Use external time source for timestamps
3. ✅ Add release notes to admin.html
4. ✅ Check if table is object or array before rendering
5. ✅ Add null safety: `(data || [])` or `(data || {})`
6. ✅ Test in incognito window if browser cache issues
7. ✅ Update Danger Zone when adding new tables
8. ✅ Use heredoc for git commit messages
9. ✅ Never skip git hooks without permission
10. ✅ Consult this document after conversation compaction
11. ✅ Provide a change summary table with version numbers after every completed request

---

**End of Reference Document**
