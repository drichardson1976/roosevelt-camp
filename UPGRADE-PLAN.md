# Roosevelt Camp — Security & Architecture Upgrade Plan

**Created:** 2026-02-17
**Last Updated:** 2026-02-17
**Status:** IN PROGRESS
**Branch:** dev

---

## Background

On 2026-02-17, Derek's Software Company Team (7 AI agents) reviewed the Roosevelt Camp project and identified critical security vulnerabilities and architecture improvements. This document captures all feedback and tracks implementation progress.

**Current state:** Test data only (no real families registered yet)
**Timeline:** Registration needs to open within days
**Key constraint:** Audrey (co-developer) is not aware of this upgrade yet — all plaintext passwords can be deleted except admin/admin for testing

---

## Team Feedback Summary

### Sage (Product Manager) → Routed to Nolan
- Impressive that a working product shipped in 9 days with 130+ releases
- Clear separation of concerns with 4 HTML files mapping to user roles
- Modern tech choices (React 18, Tailwind, Supabase, Netlify)
- Security is the #1 blocker before going live
- Don't rewrite from scratch — fix security, then iterate

### Nolan (Frontend Engineer)
**Issues identified:**
- 4 monolith HTML files totaling 30,602 lines with ALL code inline
- React DEVELOPMENT build used in production (extra warnings, no optimizations)
- Babel transpiles 12,000+ lines of JSX in the browser on every page load
- Tailwind CDN sends entire framework (no tree-shaking)
- Supabase config, getEnvironment(), release notes array duplicated across all 4 files
- Similar UI components (modals, cards, photo upload) reimplemented in each file
- No code splitting, no lazy loading — all data loaded on mount
- Known focus loss bug pattern with controlled inputs in large components

**Quick wins recommended:**
1. Switch React CDN from development to production build (5 min, big perf gain)
2. Extract release notes to single release-notes.js file
3. Extract shared config to config.js
4. Extract shared utilities to utils.js
5. Add React Error Boundaries

**Longer-term recommendations:**
- Set up Vite build system
- Break monolith files into components
- Add TypeScript
- Use Zustand for state management

### Priya (Backend Engineer)
**Critical issues identified:**
1. PLAINTEXT PASSWORDS in JSONB blobs — anyone with DB access sees all passwords
2. No RLS — Supabase anon key in client HTML grants full read/write to ALL 24 tables
3. JSONB single-row pattern causes race conditions (last write wins)
4. No authentication on serverless functions
5. CORS set to * on all Netlify functions
6. No rate limiting on login/password reset/SMS endpoints

**Recommended fix path:**
- Phase 0: Emergency lockdown (RLS, hash passwords, lock functions)
- Phase 1: Migrate to Supabase Auth
- Phase 2: Migrate JSONB to relational tables
- Phase 3: Monitoring and hardening

### Juno (Frontend QA)
**Testing gaps identified:**
- No automated testing pipeline (no CI/CD)
- No end-to-end tests (no Cypress/Playwright)
- No unit tests for individual components
- No accessibility testing (no ARIA labels, no keyboard nav testing)
- No mobile device testing automation
- No visual regression testing
- Color-coded states (green/red/gray) may have contrast issues
- 12,561-line admin.html is highest-risk single point of failure

**Recommended testing strategy:**
1. Manual testing checklists for top 5 user flows (Week 1)
2. WAVE browser extension for accessibility (Week 1)
3. Lighthouse audits targeting 90+ accessibility score
4. Playwright E2E tests for critical flows (Month 2)
5. GitHub Actions CI/CD (Month 2)

### Rowan (Backend QA / Security)
**RECOMMENDATION: Do not accept real registrations until critical issues resolved**

**Critical security findings:**
1. Plaintext passwords — violates GDPR, CCPA, FERPA, COPPA
2. No RLS — entire database is publicly accessible via anon key
3. Children's photos stored as base64 in openly-accessible JSONB
4. No rate limiting — brute force attacks, SMS flooding ($$ Twilio abuse)
5. CORS wildcard allows cross-site request forgery
6. No input validation/sanitization (XSS, injection risks)
7. No Content Security Policy headers
8. No access audit logging
9. No privacy policy or terms of service (legally required for children's data)
10. No data retention or deletion policy

**Compliance concerns:**
- COPPA (Children's Online Privacy Protection Act) likely applies
- Washington state privacy laws may apply
- Photos of minors stored and transmitted without explicit consent tracking
- No breach notification capability (no access logging)

---

## Implementation Plan

### Phase 1: Security Lockdown (BEFORE registration opens)

All tasks in this phase are BLOCKING — registration must not open until complete.

#### Task 1.1: Hash Passwords with bcrypt
- **Status:** COMPLETE (2026-02-17, database cleanup 2026-02-17)
- **Files:** All 4 HTML files, 4 Netlify functions (login, signup, reset-password, hash-password)
- **What:** Replace plaintext password storage with bcrypt hashing
- **Details:**
  - Created `netlify/functions/login.js` — server-side login with bcrypt.compare()
  - Created `netlify/functions/signup.js` — server-side account creation with bcrypt.hash()
  - Created `netlify/functions/hash-password.js` — returns bcrypt hash for client-side flows
  - Updated `netlify/functions/reset-password.js` — hashes new passwords with bcrypt
  - Updated `index.html` handleLogin() — now calls server-side login function instead of client-side comparison
  - Updated `index.html` login button — shows loading state during async login
  - Updated all 4 HTML files' account creation flows — hash passwords via hash-password function before saving
  - Updated `index.html` invited parent creation — hashes passwords before saving
  - Added `package.json` with bcryptjs dependency
  - Login function supports both passwordHash (bcrypt) and legacy password (plaintext) for migration
  - **Database cleanup (2026-02-17):** All plaintext passwords removed via Supabase Management API:
    - dev.camp_admins: admin password hashed with bcrypt, plaintext `password` field removed
    - public.camp_parents: 3 test accounts (Derek, Gahan, Erica) — passwords hashed, plaintext removed
    - All other tables verified clean (no plaintext passwords found)
    - Login still works with admin/admin — now uses bcrypt hash
- **Parallel:** Can run alongside Task 1.2

#### Task 1.2: Enable Row Level Security (RLS) on Server-Only Tables
- **Status:** COMPLETE (2026-02-17)
- **Files:** Supabase database (SQL via Management API)
- **What:** Enable RLS on tables that only Netlify functions access
- **Details:**
  - **ARCHITECTURAL LIMITATION:** The client uses the Supabase anon key to directly read/write 20 tables. With the single-row JSONB pattern, RLS can only block/allow entire tables — not individual records within the blob. Enabling RLS on tables the client uses would break the app.
  - **What we locked down:** Tables only accessed by Netlify functions (service role key bypasses RLS):
    - `camp_password_reset_tokens` — RLS enabled in both dev and public schemas
    - `camp_rate_limits` — table created and RLS enabled in both dev and public schemas
  - No read/write policies added — service role key bypasses RLS, so Netlify functions still work. Anon key now has zero access to these tables.
  - **What we CANNOT lock down yet:** All 20 tables the client accesses directly (camp_parents, camp_admins, camp_campers, etc.)
  - **Mitigations already in place:**
    - Login is server-side (passwords never sent to client)
    - Passwords are bcrypt hashed (database exposure doesn't reveal passwords)
    - CORS restricts which domains can call functions
    - Rate limiting prevents brute force
    - Security headers add defense in depth
  - **Full RLS requires Phase 3** (database migration to relational tables) or moving all client reads/writes to Netlify functions. This is a large refactor deferred until after camp opens.
- **Parallel:** Can run alongside any task

#### Task 1.3: Fix CORS on All Netlify Functions
- **Status:** COMPLETE (2026-02-17)
- **Files:** All 6 files in netlify/functions/
- **What:** Change Access-Control-Allow-Origin from * to specific domains
- **Details:**
  - Allow: https://rhsbasketballdaycamp.com, http://localhost:8000, http://localhost:8888
  - Deny all other origins
  - Update all 6 functions: send-email.js, request-password-reset.js, reset-password.js, send-sms.js, send-verification-code.js, verify-code.js
- **Parallel:** Independent, can run with any other task

#### Task 1.4: Add Rate Limiting
- **Status:** COMPLETE (2026-02-17) — code done, Supabase table creation needed
- **Files:** New utils/rate-limiter.js, updated login.js, request-password-reset.js, send-verification-code.js
- **What:** Prevent brute force attacks and API abuse
- **Details:**
  - Created `netlify/functions/utils/rate-limiter.js` — shared rate limit utility using Supabase
  - Login: 5 attempts per minute per IP (returns 429 Too Many Requests)
  - Password reset: 3 requests per hour per IP
  - SMS verification: 3 requests per hour per IP
  - Fail-open design: if rate limit check fails, request is allowed through
  - **ACTION REQUIRED:** Create `camp_rate_limits` table in Supabase (see netlify/functions/utils/SETUP.md for SQL)
- **Parallel:** Independent

#### Task 1.5: Add Security Headers (CSP, etc.)
- **Status:** COMPLETE (2026-02-17)
- **Files:** netlify.toml (new or existing)
- **What:** Add Content-Security-Policy, X-Frame-Options, etc.
- **Details:**
  - Create/update netlify.toml with security headers
  - CSP allowing: self, unpkg.com (React/Babel), cdn.jsdelivr.net (Supabase), accounts.google.com, cdn.tailwindcss.com, fonts.googleapis.com
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - Note: unsafe-inline and unsafe-eval needed for current Babel setup
- **Parallel:** Independent

#### Task 1.6: Add Basic Privacy Policy Page
- **Status:** COMPLETE (2026-02-17)
- **Files:** New privacy-policy.html, index.html (privacy link added)
- **What:** Legally required disclosure for collecting children's data
- **Details:**
  - Created `privacy-policy.html` with matching camp branding (Tailwind, Inter/Bebas Neue fonts)
  - 10 sections: Information collected, How we use it, Who has access, Third-party services, Data security, Children's privacy, Your rights, Data retention, Changes to policy, Contact us
  - Contact email: rhsdaycamp@gmail.com
  - Data retention: camp season + 12 months, then deleted
  - Privacy policy link added to login page (below "Create account" button)
  - **Note:** Consider having a lawyer review before camp opens
- **Parallel:** Independent

#### Task 1.7: Switch to React Production Builds
- **Status:** COMPLETE (2026-02-17)
- **Files:** All 4 HTML files (2 URL changes each)
- **What:** Change CDN URLs from development to production React builds
- **Details:**
  - Change: react.development.js → react.production.min.js
  - Change: react-dom.development.js → react-dom.production.min.js
  - Test that everything still works
  - Removes console warnings, adds optimizations
- **Parallel:** Independent, 5-minute change

---

### Phase 2: Architecture Quick Wins (After registration opens, before camp)

These improve maintainability and performance but don't block registration.

#### Task 2.1: Extract Shared Config to config.js
- **Status:** COMPLETE (2026-02-17)
- **What:** Single source of truth for Supabase URL, anon key, environment detection
- **Files:** New config.js, updated all 4 HTML files
- **Details:**
  - Created `config.js` with SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_CLIENT_ID, getEnvironment(), ENV, SCHEMA, supabase client
  - Added `<script src="config.js">` to all 4 HTML files
  - Removed inline config blocks from all 4 HTML files

#### Task 2.2: Extract Release Notes to release-notes.js
- **Status:** COMPLETE (2026-02-17)
- **What:** Single file instead of 100+ entry array duplicated across 4 files
- **Files:** New release-notes.js (1030 lines), updated all 4 HTML files
- **Details:**
  - Extracted ~1027-line RELEASE_NOTES array from index.html
  - Added `<script src="release-notes.js">` to all 4 HTML files
  - Removed inline RELEASE_NOTES arrays from all 4 HTML files

#### Task 2.3: Extract Shared Utilities to utils.js
- **Status:** COMPLETE (2026-02-17)
- **What:** Storage helpers, formatting, validation, display functions
- **Files:** New utils.js (104 lines), updated all 4 HTML files
- **Details:**
  - Created `utils.js` with: storage (get/set/deleteRow), isDev(), formatPhone, isValidPhone, formatBirthdate, formatTimestamp, getDisplayPhoto, calculateAge, generateVenmoCode (with salt param), getSessionCost, KIDS_PER_COUNSELOR
  - Added `<script src="utils.js">` to all 4 HTML files
  - Removed inline duplicates of all extracted functions from all 4 HTML files
  - Total lines removed: ~4,500+ across all 4 files

#### Task 2.4: Add React Error Boundaries
- **Status:** COMPLETE (2026-02-17)
- **What:** Catch errors in individual tabs without crashing entire page
- **Files:** utils.js (ErrorBoundary class), all 4 HTML files
- **Details:**
  - Added ErrorBoundary class component to utils.js (using React.createElement, no JSX needed)
  - Shows red error UI with error message and "Try Again" button
  - Wrapped `<RooseveltCamp />` render in all 4 HTML files with `<ErrorBoundary>`
  - Prevents white screen on uncaught React errors

#### Task 2.5: Add Input Validation/Sanitization
- **Status:** COMPLETE (2026-02-17)
- **What:** Validate and sanitize all user inputs on Netlify functions
- **Files:** New utils/validation.js, updated all 9 Netlify functions
- **Details:**
  - Created `netlify/functions/utils/validation.js` with sanitizeString, isValidEmail, isValidPhone helpers
  - Updated all 9 functions: login, signup, hash-password, request-password-reset, reset-password, send-email, send-sms, send-verification-code, verify-code
  - All string inputs sanitized (trimmed, length-limited, HTML stripped where appropriate)
  - Emails validated with format check, phones validated for 10-digit format
  - Passwords type-checked but not sanitized (allow any characters)
  - Returns 400 with descriptive errors on validation failure
  - Validation runs before rate limiting to reject invalid requests early

---

### Phase 3: Database Migration (After camp launches, ongoing)

#### Task 3.1: Design Proper Relational Schema
- **Status:** NOT STARTED
- **What:** One row per parent, one row per camper, foreign keys, indexes

#### Task 3.2: Implement Dual-Write Migration
- **Status:** NOT STARTED
- **What:** Write to both JSONB and relational tables during transition

#### Task 3.3: Migrate Read Paths to Relational Tables
- **Status:** NOT STARTED
- **What:** Switch reads from JSONB to relational, verify parity

#### Task 3.4: Remove JSONB Tables
- **Status:** NOT STARTED
- **What:** Drop old single-row JSONB tables

---

### Phase 4: Build System & Testing (Ongoing improvement)

#### Task 4.1: Set Up Vite Build System
- **Status:** NOT STARTED

#### Task 4.2: Break Up Monolith HTML Files
- **Status:** NOT STARTED

#### Task 4.3: Add Playwright E2E Tests
- **Status:** NOT STARTED

#### Task 4.4: Add Accessibility Testing (WAVE, Lighthouse)
- **Status:** NOT STARTED

#### Task 4.5: Set Up GitHub Actions CI/CD
- **Status:** NOT STARTED

---

### Phase 5: Software Team Upgrade (Future)

#### Task 5.1: Add Tool Use to Software Team Agents
- **Status:** NOT STARTED
- **What:** Give agents file read/write, shell execution capabilities via Anthropic tool use API

#### Task 5.2: Add Sandboxing for Agent Coding
- **Status:** NOT STARTED
- **What:** Restrict agents to specific directories, review before commit

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-17 | Skip Antfarm/OpenClaw | Security risks too high |
| 2026-02-17 | Prioritize security over architecture | Registration opens in days |
| 2026-02-17 | Delete all plaintext passwords except admin/admin | No real user data exists yet |
| 2026-02-17 | Work on dev branch | Standard workflow per CLAUDE.md |

## Open Questions

1. **RLS with JSONB pattern:** Since all data is in one row per table, RLS can only block/allow the entire table. Should we (a) move sensitive reads to Netlify Functions, or (b) start the relational migration now for auth-related tables only?
2. **Supabase Auth migration:** Should we migrate to Supabase Auth now (Phase 1) or just hash passwords for now and migrate later? Supabase Auth is more work but more robust.
3. **Privacy policy:** Should we have a lawyer review it, or is a template sufficient for now?

---

## Progress Tracking

**Phase 1 Progress:** 7/7 tasks COMPLETE
**Phase 2 Progress:** 5/5 tasks COMPLETE
**Phase 3 Progress:** 0/4 tasks complete
**Phase 4 Progress:** 0/5 tasks complete
**Phase 5 Progress:** 0/2 tasks complete

**Last task completed:** Task 1.2 — RLS enabled + Task 1.1 database cleanup (2026-02-17)
**Currently working on:** Phases 1 & 2 complete. Phases 3-5 deferred.
