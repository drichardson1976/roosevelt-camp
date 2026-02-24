// ES module version of release-notes.js — used by Vite-built pages
// The root release-notes.js is kept for prd.html and tests.html (CDN Babel)

// Shared release notes — loaded by all HTML files
export const RELEASE_NOTES = [
  { version: "13.180", date: "2026-02-23", time: "9:17 PM", author: "Derek Richardson", changes: ["PRD: Added code restructuring to Performance features list", "PRD: Updated Vite Build description to mention modular file organization", "Tests: Version bump for consistency after restructuring"] },
  { version: "13.179", date: "2026-02-23", time: "9:05 PM", author: "Derek Richardson", changes: ["All: Major code restructuring — extracted shared UI components (StableInput, VersionBanner, Toast, Modal, ImageCropper, PhotoUploadModal, ScrollableTabs) into src/shared/components/", "All: Extracted shared utilities (campDates, defaults, pricing) into src/shared/", "All: Extracted shared Netlify function boilerplate (CORS, schema, Supabase) into netlify/functions/utils/", "All: Total codebase reduced from 26,405 to 16,398 lines (38% reduction) by eliminating duplicated code and dead code", "Admin: Broke up 11,651-line admin/App.jsx into tab files (src/admin/tabs/) and component files (src/admin/components/) — admin shell now ~5,284 lines", "Counselor: Fixed references to deleted camp_registered_users table — now correctly uses camp_counselor_users", "Counselor: Removed dead code (CounselorOnboarding, FoodPhotosManager, SitePhotosManager, unused save functions and state) — reduced from 2,807 to 1,109 lines", "Parent: Removed dead code (FoodPhotosManager, SitePhotosManager, 12 unused save functions, 5 unused state variables) — reduced from 7,205 to 5,958 lines"] },
  { version: "13.178", date: "2026-02-21", time: "12:02 PM", author: "Derek Richardson", changes: ["Tests: Seed users now get randomuser.me headshot photos — parents, campers, and emergency contacts all have realistic profile photos when added to the database", "Tests: ~20% of people intentionally left without photos to test the 'add photo' UI flow", "Tests: Photo thumbnails now shown next to parent names in seed UI (matching counselor panel style)", "Tests: Deterministic photo assignment based on name — same person always gets the same photo"] },
  { version: "13.177", date: "2026-02-21", time: "11:50 AM", author: "Derek Richardson", changes: ["Tests: Password shown in plain text below email for all seed users (parents and counselors) for easier debugging"] },
  { version: "13.176", date: "2026-02-21", time: "10:03 AM", author: "Derek Richardson", changes: ["Tests: First 4 seed counselors (Audrey, Emma, Julia, Molly) are now approved and visible on the public site when added"] },
  { version: "13.175", date: "2026-02-20", time: "5:34 PM", author: "Derek Richardson", changes: ["Admin: Fixed scroll-to-top bug — page no longer jumps to top when background data finishes loading", "Admin: Extracted InvoicesSubTab into standalone component to fix React hooks lifecycle issue", "Admin: Lifted Admin component state to parent scope to prevent component remounting on re-renders"] },
  { version: "13.174", date: "2026-02-20", time: "4:55 PM", author: "Derek Richardson", changes: ["Tests: Removed Derek Richardson from seed parent profiles (49 parents now instead of 50)"] },
  { version: "13.173", date: "2026-02-20", time: "4:47 PM", author: "Derek Richardson", changes: ["Tests: Seed users now displayed in side-by-side layout — parents on left, counselors on right, both visible without scrolling", "Tests: Each panel has independent scroll and its own Add All / Remove All buttons", "Tests: Added registration status variety to seed parent profiles — mix of pending/unpaid, approved/unpaid, approved/sent, approved/paid, and cancelled", "Tests: seedAddParent now uses per-profile registration status instead of hardcoded pending/unpaid", "Tests: Registration status shown in parent rows with color coding (green=paid, blue=sent, amber=approved, red=cancelled)", "Tests: Page widened from max-w-4xl to max-w-7xl to accommodate side-by-side layout"] },
  { version: "13.172", date: "2026-02-20", time: "8:27 AM", author: "Derek Richardson", changes: ["All: Migrated from CDN-loaded React/Babel/Tailwind to Vite build system — JSX now pre-compiled at build time instead of in-browser (~2.7s faster page loads)", "All: React, ReactDOM, Supabase JS, and Tailwind CSS now bundled from npm instead of loaded from CDN script tags", "All: Original HTML files backed up as *-prebuild.html, new slim HTML shells point to Vite entry points", "All: App code extracted into src/{page}/App.jsx with proper ES module imports", "All: Shared code (config, utils, release-notes) duplicated as ES modules in src/shared/ (originals kept for prd.html/tests.html)", "Security: CSP tightened — removed unsafe-eval and CDN domains (unpkg.com, cdn.jsdelivr.net, cdn.tailwindcss.com)", "Build: Netlify now builds from dist/ directory using 'vite build' command", "Build: Netlify functions renamed from .js to .cjs to coexist with package.json type:module", "Dev: netlify dev now runs Vite dev server (hot reload) proxied through Netlify for function support"] },
  { version: "13.168-171", date: "2026-02-19", time: "11:12 PM", author: "Derek Richardson", changes: ["All: Added 5-second safety timeout — pages now render with default content if database takes too long (no more infinite basketball spinner)", "Admin: Split 20-table database loading into 2 phases — 7 core tables load first (Dashboard visible faster), 13 background tables load after", "Admin: Added performance timing instrumentation (visible in browser console)", "Login: Added login API timing measurement (visible in browser console)"] },
  { version: "13.167", date: "2026-02-19", time: "9:28 PM", author: "Derek Richardson", changes: ["Public: Fixed counselors not displaying — data loading expected multiple rows but table stores all counselors in a single JSONB array row", "Public: Fixed Google Maps embed not loading — switched from deprecated output=embed URL to Maps Embed API", "Database: Seeded camp_counselors table with 4 default counselors (both schemas)", "Database: Added location fields to camp_content (Roosevelt High School address, both schemas)"] },
  { version: "13.166", date: "2026-02-18", time: "11:30 PM", author: "Derek Richardson", changes: ["All: Photos now upload to Supabase Storage CDN instead of storing giant base64 strings in the database — dramatically faster page loads", "All: ImageCropper updated with crossOrigin support for re-editing CDN-hosted photos", "Login: Welcome emails now use CDN URLs for hero image instead of base64 attachment (backward compatible with old data)", "Admin: New 'Migrate Photos to Storage CDN' tool in Danger Zone — one-click migration of all existing base64 photos to CDN", "Admin: Site photos, food photos, counselor/camper/parent/EC photos all auto-upload to CDN on save", "Utils: New photoStorage helper (upload, uploadPhoto, isUrl) in utils.js for CDN photo management", "Database: New migration script (07_create_storage_bucket.sql) to create camp-photos storage bucket"] },
  { version: "13.165", date: "2026-02-18", time: "8:31 PM", author: "Derek Richardson", changes: ["Login/Public: Page load speed optimization — split 20 database calls into 2 phases: 4 tables for public site (instant render), 16 tables load in background", "Login/Public: Added instant loading spinner — basketball emoji appears immediately before JavaScript loads (no more blank white screen)", "Login: Google login safety guard — shows friendly message if background data hasn't finished loading yet", "Login: Onboarding safety guard — shows brief spinner if account creation started before background data ready"] },
  { version: "13.164", date: "2026-02-16", time: "10:00 AM", author: "Audrey Richardson", changes: ["Admin: Pod page — added remove buttons (✕) on assigned counselors and campers to move them back to unassigned", "Admin: Added Counselor Applications subtab — approve or reject pending counselor registrations", "Admin: Counselors tab now only shows approved counselors — pending applications stay in Applications tab until approved"] },
  { version: "13.163", date: "2026-02-16", time: "10:00 AM", author: "Audrey Richardson", changes: ["Login: Fixed security bug — removed legacy email-only login that let counselors in without correct password", "Login: Error popup redesigned — smaller, cleaner, fades out after 4 seconds, reappears on retry"] },
  { version: "13.162", date: "2026-02-16", time: "12:56 AM", author: "Derek Richardson", changes: ["Tests: Expanded test parent profiles from 6 to 50 — diverse families with 1-3 campers, varied week/session registrations"] },
  { version: "13.161", date: "2026-02-16", time: "12:56 AM", author: "Derek Richardson", changes: ["Parent: Venmo payment screenshot is now optional — parents can confirm payment without uploading a screenshot", "Parent: Upload button still available with '(optional)' label, but Confirm Payment Sent button is always active"] },
  { version: "13.160", date: "2026-02-16", time: "12:56 AM", author: "Derek Richardson", changes: ["Admin: Calendar filters now allow empty selection — clearing all weeks/dates no longer auto-resets to everything selected", "Admin: Null vs empty array distinction: first load auto-selects all, but user can manually clear to empty", "Admin: Applied to Work Availability, Work Schedule, and Pod Setup filter controls"] },
  { version: "13.159", date: "2026-02-16", time: "12:41 AM", author: "Derek Richardson", changes: ["Admin: Changed 'Days' filter from day-of-week (Mon/Tue/Wed/Thu/Fri) to individual date pills (Mon 7/7, Tue 7/8, etc.)", "Admin: Dates filter shows every camp date — click to select/deselect specific days you want to see", "Admin: Selecting/deselecting a week automatically adds/removes its dates from the date filter", "Admin: Applied consistently to Work Availability, Work Schedule, and Pod Setup tabs"] },
  { version: "13.158", date: "2026-02-16", time: "12:29 AM", author: "Derek Richardson", changes: ["Admin: Removed double confirmation dialog when marking Venmo payment as received — now a single informative confirmation", "Admin: Added Week, Day, and Session filters to Work Availability and Work Schedule tabs — filter calendar by specific weeks, days of week (Mon-Fri), and AM/PM session", "Admin: Added Week and Day filters to Pod Setup date grid — reduce visible calendar to specific weeks or days", "Admin: Added Camper View mode to Pod Setup — select a camper to see all their paid sessions and assign them to counselors individually or bulk-assign all unassigned sessions at once", "Admin: Camper View shows assignment status table with per-session counselor dropdown and 'Assign All Unassigned' bulk action"] },
  { version: "13.157", date: "2026-02-16", time: "12:06 AM", author: "Derek Richardson", changes: ["Admin: AM/PM sessions now visually separated in multi-counselor card view with labeled headers and divider line", "Admin: AM section labeled with ☀️ AM (amber), PM section labeled with 🌙 PM (indigo) — clear distinction when ovals wrap to multiple rows", "Admin: Applied to both Work Availability and Work Schedule tabs", "Admin: Edit Availability modal now supports multi-month selection (both July and August at once, both selected by default)", "Admin: Edit Availability modal displays dates grouped into Mon-Fri weeks side by side with week labels", "Admin: Edit Availability modal widened to max-w-4xl for better week layout"] },
  { version: "13.156", date: "2026-02-15", time: "11:58 PM", author: "Derek Richardson", changes: ["Admin: Multi-counselor ovals now use CSS grid (max 5 per row) — scales to 20 counselors by wrapping to multiple rows", "Admin: Ovals only expand vertically when needed (>5 counselors), never horizontally", "Admin: Font size increased from 9px to 10px for better readability at scale", "Admin: Applied to both Work Availability and Work Schedule tabs"] },
  { version: "13.155", date: "2026-02-15", time: "11:55 PM", author: "Derek Richardson", changes: ["Admin: Renamed 'Edit Schedule' to 'Edit Availability' on Counselor cards — button now green-themed", "Admin: Edit Availability modal redesigned with card grid calendar matching Work Availability tab style", "Admin: Modal uses draft state — changes only saved when clicking Save, Cancel discards changes", "Admin: Save syncs availability to both camp_counselor_availability and camp_counselor_schedule tables"] },
  { version: "13.154", date: "2026-02-15", time: "11:48 PM", author: "Derek Richardson", changes: ["Tests: Added 16 test counselor profiles (c5-c20) with varied availability data for testing multi-counselor views", "Tests: Counselors can be individually added/removed or bulk added/removed via seed buttons", "Admin: Added 'Delete All Counselor Data' button to Danger Zone — wipes all counselor profiles, logins, availability, and schedules in one action", "Database: Inserted 16 test counselors into dev schema with profiles, user accounts, availability, and schedules"] },
  { version: "13.153", date: "2026-02-15", time: "11:34 PM", author: "Derek Richardson", changes: ["Admin: Both July and August can now be selected simultaneously on Work Availability and Work Schedule tabs", "Admin: Multi-counselor view now shows full first names (Audrey, Emma) in compact ovals instead of single initials", "Admin: Removed AM/PM labels and emojis from multi-counselor card view — ovals are green (available/assigned), red (unavailable), or gray (not set)", "Admin: Ovals auto-size with flex layout to fit 5-6 counselors per card row"] },
  { version: "13.152", date: "2026-02-15", time: "11:18 PM", author: "Derek Richardson", changes: ["Admin: Work Availability tab redesigned — responsive card grid calendar matching parent registration style (1/2/3/5 columns)", "Admin: Single counselor view shows full-width green/red/gray AM/PM buttons; multi-counselor view shows colored initial pills per session", "Admin: Counselor filter chips with All/None quick toggles, green month tab pills", "Admin: New 'Work Schedule' tab — same card grid showing assigned sessions with camper counts per counselor", "Admin: Work Schedule single-counselor view shows green buttons with camper count; multi-counselor shows initial pills with counts"] },
  { version: "13.151", date: "2026-02-15", time: "11:03 PM", author: "Derek Richardson", changes: ["Counselor: Availability tab redesigned — responsive card grid (1/2/3/5 columns), emoji AM/PM buttons with ✓/✗ icons, yellow border for partial availability, removed green instructions banner", "Counselor: 'My Schedule' tab renamed to 'Scheduled to Work' with card grid layout — green buttons show camper count per session, gray for unassigned", "Counselor: New Pod Detail Modal — click any assigned session to see camper photos, names, grades, ages plus other counselors working same session", "Counselor: Fixed myCounselor scoping — moved to top of CounselorDash, removed 4 redundant re-declarations"] },
  { version: "13.150", date: "2026-02-15", time: "10:27 PM", author: "Derek Richardson", changes: ["Admin: Camper card stats redesigned — now shows Parents, Sessions, Paid, In Pods (matching Parents page style)", "Admin: Removed redundant summary stat cards from bottom of Campers tab", "Parent: Fixed crash on login — removed leftover getUnreadCount() reference from deleted messaging code"] },
  { version: "13.148", date: "2026-02-15", time: "10:18 PM", author: "Derek Richardson", changes: ["Admin: Cleared Dashboard tab — replaced task tracking UI with placeholder (will be rebuilt later)", "Admin: Counselors tab now shows ALL counselors with toggle switch for website visibility and approval", "Admin: Unapproved counselors displayed with amber left border and 'Not visible on website' badge", "Admin: Work Availability tab replaced with multi-counselor calendar view — month selector, counselor filter chips, per-date availability grid", "Admin: Tab badges now show total counselor count instead of pending approval count", "Counselor: Profile editing locked — counselors can view but not edit their profile (admin-only control)", "Counselor: Availability changes now warn about pod conflicts when campers are assigned to affected sessions", "Tests: Added availability conflict checking tests"] },
  { version: "13.142", date: "2026-02-15", time: "9:52 PM", author: "Derek Richardson", changes: ["Admin: Removed all messaging UI — Message All Parents button, individual Message buttons, Unread badge, Messages section in expanded parent, MessageComposer/ThreadViewer modals, Messages tab, Dashboard unread messages todo", "Admin: Parent row stats now show order-based counts (New/Pending/Paid) instead of individual session rows", "Admin: Expanded parent registrations now grouped by order instead of listing individual day rows", "Parent/Counselor: Removed dead messaging code — state variables, DB fetch, helper functions for camp_messages"] },
  { version: "13.139", date: "2026-02-15", time: "7:06 PM", author: "Derek Richardson", changes: ["Admin: Removed Messages section from Danger Zone"] },
  { version: "13.138", date: "2026-02-15", time: "6:45 PM", author: "Derek Richardson", changes: ["Parent: Added Edit button to Payments tab registration cards for unpaid registrations", "Tests: Fixed Audrey Richardson seed data — removed from campers list (she is a counselor, not a camper), replaced with Dylan Richardson", "Tests: Seed users table rows are now expandable — click to see auto-setup details (campers, emergency contacts, registration for parents; position, bio, availability for counselors)"] },
  { version: "13.136", date: "2026-02-15", time: "6:30 PM", author: "Derek Richardson", changes: ["Parent: Registration edit button now shows 'Edit' text instead of pencil icon for UX consistency"] },
  { version: "13.135", date: "2026-02-15", time: "6:22 PM", author: "Derek Richardson", changes: ["Admin: Registration subtab badges now show order count instead of individual session count (1 registration with 2 kids x 3 sessions = 1, not 6)"] },
  { version: "13.134", date: "2026-02-15", time: "6:09 PM", author: "Derek Richardson", changes: ["Admin: Registration cards now match parent dashboard style — grouped by camper with date ranges instead of individual day rows", "Admin: Cards show condensed camper summary (days, date range, session type, amount) matching parent portal exactly"] },
  { version: "13.132", date: "2026-02-15", time: "5:30 PM", author: "Derek Richardson", changes: ["Netlify: All system emails now BCC rhsdaycamp@gmail.com so camp admin sees every email sent", "Netlify: Email delivery failures now trigger an alert email to rhsdaycamp@gmail.com with recipient, subject, error details, and timestamp", "Netlify: Updated send-email.js and request-password-reset.js with BCC + failure alerts"] },
  { version: "13.131", date: "2026-02-15", time: "5:20 PM", author: "Derek Richardson", changes: ["Tests: Seed functions now use actual signup flow — counselor add sends welcome email, logs change history, and creates profile with pending approval (visible:false) matching real onboarding", "Tests: Parent seed add already updated in prior commit with same improvements"] },
  { version: "13.130", date: "2026-02-15", time: "5:10 PM", author: "Derek Richardson", changes: ["Parent: Session Registration cards now show Venmo reference, payment screenshot, and invoice ID for paid/sent registrations — matching the Payments tab"] },
  { version: "13.129", date: "2026-02-15", time: "4:59 PM", author: "Derek Richardson", changes: ["Parent: Contact Us — changed email to rhsdaycamp@gmail.com, removed phone number"] },
  { version: "13.127", date: "2026-02-15", time: "1:30 PM", author: "Audrey Richardson", changes: ["Admin: Fixed pod click-to-assign — pods now initialize with stable IDs so first click works reliably", "Admin: Counselor schedule cycling now includes 'not set' option (available → unavailable → not set)", "Admin: Day toggle also cycles through three states"] },
  { version: "13.126", date: "2026-02-15", time: "1:15 PM", author: "Audrey Richardson", changes: ["Login: Added prominent error popup when incorrect email or password is entered"] },
  { version: "13.125", date: "2026-02-15", time: "12:30 PM", author: "Audrey Richardson", changes: ["Admin: Fixed pod assignments — lifted date/session/pod state to parent so assignments persist across re-renders", "Admin: Fixed availability sync — admin edits now properly write to counselor availability table with correct data format, preserving counselor-set sessions"] },
  { version: "13.124", date: "2026-02-15", time: "12:00 PM", author: "Audrey Richardson", changes: ["Admin: Pod page — click selected date again to deselect, plus Deselect button in session header", "Admin: Counselor availability edits now sync to counselor portal (both tables updated together)", "Admin: Updated pod instructions to mention tap-to-assign"] },
  { version: "13.123", date: "2026-02-14", time: "3:45 PM", author: "Audrey Richardson", changes: ["Counselor: Dashboard Next Steps now shows completed items in green 'Completed' section instead of hiding them", "Counselor: Incomplete next steps styled blue to match parent portal", "Counselor: Edit Profile popup now closes immediately on save"] },
  { version: "13.122", date: "2026-02-14", time: "3:15 PM", author: "Audrey Richardson", changes: ["Admin: Fixed pod assignments — added click-to-select for touch devices (tap counselor/camper, then tap pod slot)", "Admin: Removed Quick Actions (Auto-Assign All / Clear All) from pod assignments page"] },
  { version: "13.121", date: "2026-02-14", time: "3:00 PM", author: "Audrey Richardson", changes: ["Counselor: Added Edit Profile popup (photo, bio, position, year) with button on Dashboard Next Steps", "Counselor: Removed stats boxes from Dashboard tab — kept on Availability tab only"] },
  { version: "13.120", date: "2026-02-14", time: "2:30 PM", author: "Audrey Richardson", changes: ["Counselor: Added new Dashboard tab with Next Steps (application status, photo, bio, availability, schedule hints)", "Counselor: Renamed old Dashboard to 'Availability' — clarified this is NOT signing up for sessions", "Counselor: Removed 'Quick Actions by Week' section from availability page", "Counselor: Calendar now shows day names (Mon-Fri) and clickable day headers to toggle both AM/PM", "Counselor: Calendar cards have colored borders matching availability state (green/red/gray)"] },
  { version: "13.119", date: "2026-02-12", time: "10:27 PM", author: "Derek Richardson", changes: ["Tests: Fixed schema comparison failures — Babel's var hoisting was overwriting window.supabase library with the client instance, saved library reference before client creation"] },
  { version: "13.118", date: "2026-02-12", time: "10:22 PM", author: "Derek Richardson", changes: ["Tests: Added 'Copy Results' button and plain text results panel for sharing test output with Claude for debugging", "CLAUDE.md: Made PRD and tests updates MANDATORY for every project change"] },
  { version: "13.117", date: "2026-02-12", time: "10:15 PM", author: "Derek Richardson", changes: ["Tests: Fixed Supabase CDN race condition — moved Supabase script before Babel to prevent createClient error", "Tests: Public schema client now lazy-created to avoid double initialization", "PRD: Removed code-like emoji escape sequences from nav links for cleaner display"] },
  { version: "13.113", date: "2026-02-11", time: "3:50 PM", author: "Derek Richardson", changes: ["All pages: Reverted PROJECT_VERSION — ribbon now shows each file's own VERSION again per versioning rules"] },
  { version: "13.112", date: "2026-02-11", time: "9:45 AM", author: "Audrey Richardson", changes: ["Admin: Counselors tab now only shows approved counselors — pending applications must be approved in 'Work Availability' tab first before they appear in the main counselor list"] },
  { version: "13.111", date: "2026-02-11", time: "9:35 AM", author: "Audrey Richardson", changes: ["Counselor onboarding: Fixed blank screen after availability step — added missing COUNSELOR_RESPONSIBILITIES and PAY_DISCLOSURE constants that were undefined, causing Step 4 to crash"] },
  { version: "13.110", date: "2026-02-11", time: "9:23 AM", author: "Audrey Richardson", changes: ["Counselor onboarding (index.html): Fixed blank screen after availability step — was calling undefined saveAvail instead of saveAvailability prop"] },
  { version: "13.109", date: "2026-02-11", time: "9:13 AM", author: "Audrey Richardson", changes: ["Counselor onboarding (counselor.html): Fixed blank screen — same bug as 13.110 but in wrong file"] },

  { version: "13.107", date: "2026-02-10", time: "11:29 PM", author: "Derek Richardson", changes: ["Parent: Messages tab replaced with 'Contact Us' tab (Camp Director email + emergency phone)", "Parent: Next Steps shows completion message when all steps done, Share button moved below", "Parent: Emergency contacts auto-linked to ALL campers when added", "Parent: EC 'Remove' button removed from Edit Child modal — manage on EC tab only"] },
  { version: "13.106", date: "2026-02-10", time: "11:29 PM", author: "Derek Richardson", changes: ["Admin: Removed Session Registrations sub-tab from Family Setup (use Registrations tab instead)", "Admin: Badge colors changed from red to dark green site-wide, added camper count badge", "Admin: Customer Invoices — Revenue Summary dashboard (New/Pending/Paid totals)", "Admin: Invoice numbers are clickable with detail modal + email invoice to parent feature", "Admin: Removed Messages tab (replaced with email communication via Resend)"] },
  { version: "13.105", date: "2026-02-10", time: "11:15 PM", author: "Derek Richardson", changes: ["Parent: Venmo modal auto-scrolls to bottom after image upload so 'Confirm Payment Sent' button is visible", "Parent: Button renamed from 'Confirm Venmo Payment Has Been Sent' to 'Confirm Payment Sent'", "Parent: EC modal green button renamed from 'Add Contact' to 'Add Emergency Contact'", "Parent: Session Registrations tab now keeps creation order (first at top, new below)", "Parent: Payments tab split into 'Registrations with Payments Due' and 'Registrations that have been Paid' sections", "Parent: Registration confirmation email sent on submission with camper details and 5-step payment instructions"] },
  { version: "13.104", date: "2026-02-10", time: "11:15 PM", author: "Derek Richardson", changes: ["Google login merge: persistent googleLinked flag so parents with email/password + Google show both methods in admin badge"] },
  { version: "13.103", date: "2026-02-10", time: "11:15 PM", author: "Derek Richardson", changes: ["Invoice generation on 'Mark as Paid': creates unique invoice ID (INV-xxx) stored on all registrations in the order", "Payment confirmation email sent to parent with invoice table (camper, date, session, amount) and next steps", "New 'Customer Invoices' sub-tab on Registrations: searchable, filterable, sortable table with totals", "Invoice ID displayed on Paid registration cards in both Family Setup and Registrations tabs", "Login badge uses persistent googleLinked flag for accurate Google detection across login sessions"] },
  { version: "13.102", date: "2026-02-10", time: "10:59 PM", author: "Derek Richardson", changes: ["Login page now tracks login method (Google or Email/Password) in database so admin can see how parents log in"] },
  { version: "13.101", date: "2026-02-10", time: "10:59 PM", author: "Derek Richardson", changes: ["Fixed login type badge: Google users no longer show 'No Login' — badge now shows Google, Email/Password, or Google + Email/Password", "Send Login Reminder email now customized per login method (Google users get 'Sign in with Google' instructions)", "Admin Campers tab redesigned: table layout replaced with card-based layout matching Parents tab (avatars, stats, expand/collapse)", "Registrations page reorganized into 3 sub-tabs: New, Pending Approval, and Paid for better handling of 50-200+ registrations"] },
  { version: "13.100", date: "2026-02-10", time: "10:38 PM", author: "Derek Richardson", changes: ["Fixed input focus loss in Add Emergency Contact modal — extracted into standalone ECAddModal component with internal state", "Dashboard 'Pay Now' button (was 'View Payment Info') now opens Venmo payment modal directly instead of scrolling", "Venmo payment modal moved to top level so it renders from any tab including Dashboard", "Added CLAUDE.md rule: never put controlled input state in large parent components — always extract forms into standalone components"] },
  { version: "13.099", date: "2026-02-10", time: "10:02 PM", author: "Derek Richardson", changes: ["Registration calendar: clicking on a day header (Mon, Jul 13, etc.) toggles both AM and PM sessions", "If neither session selected → selects both; if both selected → deselects both; if one selected → selects both", "Day header shows hover/active states to indicate clickability"] },
  { version: "13.098", date: "2026-02-10", time: "9:56 PM", author: "Derek Richardson", changes: ["All Dashboard Next Steps buttons now open modals directly instead of navigating to tabs", "Add Campers button opens AddChildForm modal at top level from Dashboard", "Add Photo for EC button opens PhotoUploadModal at top level from Dashboard", "Campers tab 'Add Emergency Contact' button also uses top-level EC modal (consistent pattern)"] },
  { version: "13.097", date: "2026-02-10", time: "9:51 PM", author: "Derek Richardson", changes: ["EC Add Modal moved to top level (same pattern as Registration modal) — renders from any tab including Dashboard", "Both Dashboard button and EC tab button open the same top-level modal with full features (photo, all fields)", "EC tab's green 'Add Emergency Contact' button now opens the top-level modal via onRequestAddForm prop", "Campers tab 'Add Emergency Contact' also routes through the same top-level modal"] },
  { version: "13.096", date: "2026-02-10", time: "9:39 PM", author: "Derek Richardson", changes: ["Dashboard 'Add Emergency Contact' now uses the SAME modal as the Emergency Contacts tab — no duplicate code", "Removed inline dashboard EC modal; dashboard button now switches to EC tab with autoOpenAddEC=true so the full-screen modal opens instantly", "On cancel or save, returns to Dashboard automatically via returnTabAfterEC", "Removed unused modalOnly code path and dashboardECForm state"] },
  { version: "13.095", date: "2026-02-10", time: "9:34 PM", author: "Derek Richardson", changes: ["Fixed Dashboard 'Add Emergency Contact' button — replaced ParentEmergencyContactsManager component approach with direct inline modal rendering, eliminating all component lifecycle/timing issues", "EC add form now renders as a simple fixed overlay directly in the parent component, same pattern as the working Registration modal"] },
  { version: "13.094", date: "2026-02-10", time: "9:30 PM", author: "Derek Richardson", changes: ["Fixed Dashboard 'Add Emergency Contact' modal not appearing — initialized showAddForm state to true when autoOpenAddEC is true, so modal renders immediately on first render instead of waiting for useEffect"] },
  { version: "13.093", date: "2026-02-10", time: "9:21 PM", author: "Derek Richardson", changes: ["Fixed Dashboard 'Add Emergency Contact' button not opening the modal — replaced hidden wrapper div approach with modalOnly prop on ParentEmergencyContactsManager", "EC component now supports modalOnly mode: renders only the add form modal overlay without the full contact list, eliminating CSS clipping issues"] },
  { version: "13.092", date: "2026-02-10", time: "9:01 PM", author: "Derek Richardson", changes: ["Dashboard Next Steps: 'Add Emergency Contact' and 'Register Now' buttons now open modals directly as overlays without leaving the Dashboard", "Renamed 'Add Contact' button to 'Add Emergency Contact' for clarity", "All Next Steps action buttons now have equal width (200px min) for consistent layout", "Registration modal moved to top-level rendering so it can be opened from any tab", "EC add form modal can now be triggered from Dashboard via a hidden component wrapper"] },
  { version: "13.091", date: "2026-02-10", time: "8:41 PM", author: "Derek Richardson", changes: ["Fixed registration modal showing wrong camper count — stale draft camper IDs are now filtered against current campers when opening the modal", "Added safety reset: selectedChildren cleared to empty when no draft and multiple campers, preventing phantom selections"] },
  { version: "13.090", date: "2026-02-10", time: "8:34 PM", author: "Derek Richardson", changes: ["Dashboard Next Steps: 'Add Contact' button now opens the Add Emergency Contact modal directly and returns to Dashboard after saving", "Dashboard Next Steps: 'Register Now' button now opens the New Registration modal directly and returns to Dashboard after submitting or closing"] },
  { version: "13.089", date: "2026-02-10", time: "8:15 PM", author: "Derek Richardson", changes: ["Google Sign-In now creates new accounts — clicking Google when no account exists starts the onboarding flow with name and email pre-filled from Google", "Password field hidden for Google sign-up (not needed), email field read-only", "Blue 'Signing up with Google' banner shown during onboarding for both parent and counselor flows", "Accounts created via Google are stored with loginType: 'Google' and no password field"] },
  { version: "13.088", date: "2026-02-10", time: "8:08 PM", author: "Derek Richardson", changes: ["Google Sign-In button now styled to match the email/password input fields for a consistent look", "Removed 'Continue with Apple' placeholder button from login page", "Switched Google Sign-In from rendered iframe button to custom-styled button using OAuth2 token client"] },
  { version: "13.087", date: "2026-02-10", time: "8:03 PM", author: "Audrey Richardson", changes: ["Google Sign-In now works on the login page — parents, counselors, and admins can sign in with their Google account if their Google email matches an existing account", "Login type tracking added — sessionStorage now includes loginType ('Google' or 'Email/Password') for all logins", "Replaced placeholder 'Continue with Google' button with real Google Identity Services button"] },
  { version: "13.086", date: "2026-02-10", time: "2:55 PM", author: "Audrey Richardson", changes: ["Added temporary notice on 'Can't remember your login?' screen — SMS verification is being set up, users directed to email rhsdaycamp@gmail.com for login help", "Added detailed Twilio response logging for SMS delivery diagnostics (SID, status, error codes)", "Switched from local 10DLC number to toll-free number for SMS (pending Twilio verification)"] },
  { version: "13.085", date: "2026-02-10", time: "1:16 PM", author: "Audrey Richardson", changes: ["All emails now include unique X-Entity-Ref-ID header to prevent Gmail from threading/collapsing duplicate content", "Password reset minimum aligned to 4 characters (was 6) to match account creation requirements", "SMS verification now checks Twilio response and shows actual error message if sending fails (was silently ignored)", "Forgot login phone input now auto-formats to (555) 555-1234 as you type, matching all other phone fields"] },
  { version: "13.084", date: "2026-02-10", time: "12:55 PM", author: "Audrey Richardson", changes: ["Fixed Gmail clipping issue — all email templates now use compact HTML to prevent content from being hidden behind 'show trimmed content' dots", "Applies to: password reset, parent welcome, counselor welcome, and admin login reminder emails"] },
  { version: "13.083", date: "2026-02-10", time: "12:48 PM", author: "Audrey Richardson", changes: ["Welcome emails now include the camp hero image at the top for brand consistency", "Parent welcome email tips are now dynamic — skips steps already completed during onboarding (campers, photos, emergency contacts)", "Fixed duplicate variable bug in reset-password function that could cause errors"] },
  { version: "13.082", date: "2026-02-10", time: "12:13 PM", author: "Audrey Richardson", changes: ["New parent accounts receive a welcome email with getting started tips (add campers, photos, emergency contacts, register)", "New counselor accounts receive a welcome email explaining next steps (pending approval, availability, photo, schedule)", "Welcome emails are non-blocking — account creation completes even if email fails"] },
  { version: "13.078", date: "2026-02-10", time: "12:01 PM", author: "Audrey Richardson", changes: ["Login: 'Can't remember your login?' now uses SMS verification instead of emailing camp director", "SMS flow: Enter phone → receive 6-digit code via text → verify code → see your login email and account type", "From results screen: can reset password or go straight to login with pre-filled email", "New Netlify functions: send-verification-code, verify-code"] },
  { version: "13.074", date: "2026-02-10", time: "11:03 AM", author: "Audrey Richardson", changes: ["Login page: Added 'Forgot Password?' link — sends automated email with secure reset link (1-hour expiry, single-use)", "Login page: Added 'Can't remember your login?' link — sends help request to camp director with name and phone", "Login page: Password reset form auto-opens when clicking reset link from email", "Admin Parents tab: Added login type badge (Email/Password or No Login) next to each parent name", "Admin Parents tab: Added 'Send Login Reminder' button — emails parent their login method and a link to the login page", "New Netlify functions: request-password-reset, reset-password, send-sms (Twilio)", "New Supabase table: camp_password_reset_tokens for secure token storage"] },
  { version: "13.070", date: "2026-02-10", time: "8:20 AM", author: "Audrey Richardson", changes: ["Parent Campers tab: Added 'Add Emergency Contact' button next to red EC warning — opens EC form directly, returns to Campers tab when done", "Parent Dashboard: Action buttons now open photo modals directly instead of navigating to tabs", "Parent Dashboard: Individual rows per person needing a photo (campers and parents listed separately)"] },
  { version: "13.069", date: "2026-02-10", time: "8:11 AM", author: "Audrey Richardson", changes: ["ScrollableTabs: Added scroll position persistence — tab bar no longer resets when switching tabs (all dashboards)", "Admin Danger Zone: Added 'Delete All Messages' bulk delete button"] },
  { version: "13.068", date: "2026-02-09", time: "9:05 PM", author: "Audrey Richardson", changes: ["Version sync: Bumped all 4 HTML files to unified version 13.068"] },
  { version: "13.066", date: "2026-02-09", time: "8:50 PM", author: "Claude", changes: ["Admin tabs: Removed scrollIntoView on tab click — scroll position now preserved when switching tabs", "Parent dashboard: 'Pay for X pending sessions' hint now disappears after payment is sent"] },
  { version: "13.065", date: "2026-02-09", time: "8:44 PM", author: "Claude", changes: ["Venmo screenshot: Crop tool now opens in popup modal overlay instead of inline", "Draft messages: Fixed bug where draft closed immediately on first open (setTimeout fix)", "Draft messages: Fixed bug where draft not removed from Drafts after sending (stale closure fix)", "Messages: saveMessage/deleteMessage/updateMessage now use functional setState for correctness"] },
  { version: "13.064", date: "2026-02-09", time: "8:24 PM", author: "Claude", changes: ["BUG FIX: EC tab onSave was linking ALL emergency contacts from ALL families to current camper", "Fix: Now only links ECs belonging to the current parent (filtered by userEmail)", "Cleanup: On load, removes any bogus EC-camper links where EC doesn't belong to camper's parent"] },
  { version: "13.063", date: "2026-02-09", time: "1:33 PM", author: "Audrey Richardson", changes: ["Onboarding: Removed auto-save for campers — must click 'Add Camper' button before continuing", "Onboarding: Removed auto-save for emergency contacts — must click 'Add Contact' button before continuing", "Admin: Fixed Mark as Paid glitch — all sessions now update instantly instead of one-by-one"] },
  { version: "13.062", date: "2026-02-09", time: "10:41 AM", author: "Audrey Richardson", changes: ["Onboarding EC: Clarified that parent counts as 1 EC — 'Please add at least 1 more contact'", "Session Registration: Pay Now button now navigates to Payments tab instead of opening modal", "Payments: Fixed confirmation glitch — modal closes immediately, saves in background"] },
  { version: "13.061", date: "2026-02-09", time: "9:02 AM", author: "Claude", changes: ["Admin EC popup: Removed Priority field from display", "Admin EC popup: Added large camper headshot photo at top in green box", "Admin EC popup: Added headshot photos for each emergency contact", "Admin EC popup: Photos clickable to view full-size in overlay", "Admin EC popup: Photos editable via PhotoUploadModal (add/change photo link)", "Admin EC popup: Placeholder shown for missing photos with add-photo prompt"] },
  { version: "13.059-13.060", date: "2026-02-09", time: "8:06 AM", author: "Claude", changes: ["Onboarding: Parent logins shown in green boxes, Remove button removed, edit via EC instead", "Onboarding: Edit buttons now blue text in top-right corner matching dashboard style", "Onboarding: Fixed login screen flash after wizard — now shows bouncing basketball transition", "Campers tab: Parent email shown next to phone number (hidden for nologin accounts)", "EC modal: Email now mandatory with asterisk, Add button disabled until email provided", "Registration cards: Blue border/bg for unpaid, red 'Payment Due' badge, blue Pay Now button", "Payments tab: Card style matches register tab — same blue colors, red badge, green title", "Venmo modal: Registration details box at top with camper names, dates, session types, total", "Messages: Drafts now visible in amber Drafts section, click to edit/send/delete", "Messages: Edit Draft modal with Send, Update Draft, and Delete (double confirmation) buttons"] },
  { version: "13.055-13.058", date: "2026-02-09", time: "12:09 AM", author: "Claude", changes: ["Parent: Venmo wizard step ovals now uniform size (w-14 h-7) and top-aligned", "Admin: Registrations restructured — 3 sections: New (awaiting payment), Awaiting Confirmation, Paid", "Admin: Removed approval concept — registrations just need payment confirmation", "Admin: All 3 registration sections use same card format with Venmo screenshot always shown", "Admin: Screenshot placeholder shown when no payment screenshot exists", "Admin: Dashboard tasks updated to match new payment-focused workflow", "Admin: Registrations tab badge now shows count awaiting admin payment confirmation"] },
  { version: "13.051-13.054", date: "2026-02-09", time: "12:00 AM", author: "Claude", changes: ["Admin: Added Messages tab with unread badge from parents", "Admin: Messages tab with compose (broadcast/individual), reply, read/unread tracking", "Admin: Dashboard shows unread parent messages as urgent todo", "All files: Scroll to top on page load and tab navigation so red ribbon is visible"] },
  { version: "13.047-13.050", date: "2026-02-08", time: "11:47 PM PST", author: "Claude", changes: [
    "Parents tab: 'No login account' changed to 'No email provided'",
    "Payments tab: Button text changed to '+ New Registration'",
    "Registration modal: Single camper auto-selected; edit button on unpaid registrations",
    "Registrations now start as 'pending' status until admin confirms payment",
    "Admin Session Registrations: Restructured into 3 sections with Mark as Paid (double confirm)",
    "History logging: All actions now logged with changedBy field",
  ]},
  { version: "13.043-13.046", date: "2026-02-08", time: "11:14 PM PST", author: "Claude", changes: [
    "Onboarding & Campers tab: Grade field clarified to 'Grade starting Sept 2026'",
    "EC tab: Hidden synthetic nologin_ email from contact display",
    "EC form: Now requires both a valid phone number AND valid email address",
    "Registration modal: 'Select Children' replaced with 'Select Camper(s)', removed helper text",
    "Registration modal: Removed 'Add Week' button and all 'Both' session buttons",
    "Registration modal: Both months selected (green) by default, toggle independently, dates grouped by month with headers",
  ]},
  { version: "13.039-13.042", date: "2026-02-08", time: "10:45 PM PST", author: "Claude", changes: [
    "All dashboards: Title bar center-justified; public website links added to dark green nav bar",
    "Counselor dashboard: Added title bar with welcome message",
    "Public site: 'My Dashboard' button when logged in; hash-based page routing for dashboard links",
    "Onboarding: All actions logged to History on completion (account, campers, ECs, policies)",
    "Onboarding: Parents who skip login creation still stored in camp_parents as no-login parents",
    "Onboarding: 'Skip' button renamed to 'Skip Login' for clarity",
    "Camper cards: Parent-type ECs now shown in EC section (dual listing)",
  ]},
  { version: "13.038", date: "2026-02-08", time: "10:34 PM PST", author: "Audrey Richardson", changes: [
    "Onboarding: Emergency contacts yellow warning now hides when 2+ contacts added (was always visible)",
    "Parent Dashboard: Camper photo alert now includes 'camper photos are required before camp sessions start'",
    "Parent Dashboard: Fixed logout/login flash after onboarding — nav bar now visible during data loading",
  ]},
  { version: "13.037", date: "2026-02-08", time: "9:58 PM PST", author: "Derek Richardson", changes: [
    "Version sync: All files aligned to v13.037",
    "CLAUDE.md: Added version number to document header"
  ]},
  { version: "13.036", date: "2026-02-08", time: "9:56 PM PST", author: "Claude", changes: [
    "Dashboard: Added parent photo alert in Next Steps — warns when family parents are missing photos",
    "Payments tab: Removed filter inputs, cleaner Venmo modal with 'Step' labels and less helper text",
    "Payments: Screenshot upload now uses rectangular crop modal (phone screen 9:16 aspect ratio)",
    "Payments: Payment cards show screenshot thumbnail and sent date/time; activity logged to History",
  ]},
  { version: "13.035", date: "2026-02-08", time: "9:46 PM PST", author: "Claude", changes: [
    "Campers tab: Cards blue when <2 ECs, green when complete; red warning for missing ECs",
    "Registration tab: Session Calendar hidden until first registration; changed empty state text",
    "Payments tab: New empty state with +Add Registration button",
    "Messages tab: New compose modal — Send a Message to Camp Director with To, Cc, Subject, Body, photo upload",
  ]},
  { version: "13.034", date: "2026-02-08", time: "9:16 PM PST", author: "Claude", changes: [
    "EC/Parents: Fixed photo sync — adding photo to EC that is also a parent now updates parent record too",
    "Parents tab: Grey add-photo circle is now clickable — opens photo upload directly from the card",
    "Campers tab: Renamed all 'Child' references to 'Camper' (Add Camper, Camper's Name, Camper's Phone)",
    "Payments: Venmo codes are now unique per registration order",
    "Payments: Venmo modal overhauled — 5-step instructions with screenshot upload requirement",
  ]},
  { version: "13.033", date: "2026-02-08", time: "7:35 PM PST", author: "Claude", changes: [
    "Registration: Current Registrations refactored to show each order as a separate color-coded card",
  ]},
  { version: "13.032", date: "2026-02-08", time: "7:30 PM PST", author: "Claude", changes: [
    "Registration: Already-registered sessions shown as green '✓ AM/PM Registered' (non-clickable)",
    "Registration: 'Add Week' quick-select skips already-registered sessions",
  ]},
  { version: "13.031", date: "2026-02-08", time: "7:26 PM PST", author: "Claude", changes: [
    "EC tab: Add Contact button disabled until all required fields (name, relationship, phone) are filled in",
  ]},
  { version: "13.029-13.030", date: "2026-02-08", time: "7:12 PM PST", author: "Claude", changes: [
    "EC tab: Fixed bug where added emergency contacts didn't appear (now auto-saves immediately to DB)",
    "EC tab: Removed Save Changes/Cancel buttons — all changes auto-save on Add/Edit/Delete",
    "EC tab: Blue placeholder boxes shown for missing emergency contacts (clickable to add)",
    "Payments tab: Confirmed/paid registrations now shown in green box with green border",
    "Payments tab: Payment-sent registrations shown in blue box with blue border",
    "Payments tab: Added filter by camper name when many payments exist",
    "Admin: Add Parent button changed from purple to green",
  ]},
  { version: "13.027-13.028", date: "2026-02-08", time: "6:51 PM PST", author: "Claude", changes: [
    "Onboarding: Edit button moved outside green box for camper cards (matching Parent Account pattern)",
    "Dashboard: Edit buttons moved to top-right inside green boxes as plain blue text (no background)",
    "Dashboard: Action buttons on Dashboard tab now uniform size and aligned (min-w-[140px])",
    "Dashboard: Changed 'Register your campers for camp sessions' to 'Register your camper(s) for sessions'",
    "Sessions: RegistrationCalendarView campers default deselected if no registrations (was auto-selecting first child)",
    "Sessions: Removed 'Add Photo' text from camper selector buttons in calendar view",
    "Sessions: Calendar 'add photo' circle next to child name now functional (opens PhotoUploadModal)",
    "Sessions: Fixed displayRegs undefined reference bug in RegistrationCalendarView",
    "Color convention: 'Both' session button now green when selected (was blue), matching AM/PM buttons",
  ]},
  { version: "13.026", date: "2026-02-08", time: "6:24 PM PST", author: "Claude", changes: [
    "Dashboard: All parent/camper/EC cards now green box with dark green border (bg-green-50 border-2 border-green-500)",
    "Dashboard: Edit buttons moved to light blue outside the green box (matching onboarding pattern)",
    "EC tab: All EC photos now clickable to add/edit photo via photo upload modal",
    "Sessions tab: Camper photo placeholder hidden when no photo uploaded",
    "Sessions tab: Campers default deselected if no registrations, auto-selected if they have existing registrations",
    "Sessions tab: Legend 'Available' renamed to 'Available for Registration'",
  ]},
  { version: "13.024-13.025", date: "2026-02-08", time: "6:07 PM PST", author: "Claude", changes: [
    "Onboarding Step 2: Camper cards now green with thick border (matching ECs and summary)",
    "Onboarding Step 2: Removed red X delete button, added Delete inside edit form instead",
    "Onboarding Step 2: Camper photos now clickable to add/change photo",
    "Dashboard: Standardized photo sizes to w-16 h-16 across Campers, EC, and Parents tabs",
    "Dashboard: Parents tab cards now white with border (was gray bg, matching other tabs)",
    "Dashboard: Parents tab photos now have green border (matching other tabs)",
    "Dashboard: Removed emojis from all Edit/Delete buttons and headings",
    "Dashboard: Add Emergency Contact converted to popup modal (was inline form)",
    "Dashboard: EC edit form Save/Delete buttons now side-by-side (matching Campers tab)",
  ]},
  { version: "13.021-13.023", date: "2026-02-08", time: "5:39 PM PST", author: "Claude", changes: [
    "Removed pickup policy advance notification text from all files",
    "Add Parent form: converted to popup modal with photo at top center",
    "Add Parent form: phone placeholder now shows (555) 555-1234",
    "Add Child form: converted to popup modal (was inline form)",
    "Add Child form: birthdate uses Year/Month/Day dropdowns (matching onboarding wizard)",
    "Add Child button always visible (modal overlays instead of replacing button)",
  ]},
  { version: "13.020", date: "2026-02-08", time: "5:24 PM PST", author: "Claude", changes: [
    "EC Step 3: Create Login prompt only shown when relationship is 'Parent'",
    "EC Step 3: Red X replaced with Edit button (same as Campers step)",
    "EC Step 3: Edit form supports editing existing contacts with Save/Cancel/Delete",
    "Removed 'Please read and sign our camp policies.' text from Step 4",
  ]},
  { version: "13.019", date: "2026-02-08", time: "5:17 PM PST", author: "Claude", changes: [
    "Onboarding summary: all photos/add-photo circles clickable to upload/change photo",
    "Onboarding summary: all green boxes same height (p-3 padding, w-8 h-8 photos, consistent text sizes)",
    "EC Step 3: parent auto-contact now has green bg + dark green border-2 border-green-500",
    "EC Step 3: added contacts now green bg + dark green border (was grey bg + grey border)",
    "EC Step 3: all photos clickable to add/change photo directly",
  ]},
  { version: "13.016-13.018", date: "2026-02-08", time: "5:08 PM PST", author: "Claude", changes: [
    "Onboarding summary: info boxes now have thick green border matching policy cards",
    "Birthdate format: 'May 8, 2014' instead of '2014-05-08' across entire website",
    "EC tab: Relationship field now uses dropdown matching onboarding wizard options",
    "EC tab: Phone placeholder shows (555) 555-1234",
    "EC tab: Only offers parent login invite when relationship is 'Parent'",
    "Removed helper text from Campers, Parents, and Session Registration tabs",
    "Payments tab: Pay Now button opens Venmo modal with QR code and unique identifier",
    "Venmo code stored with each registration for Camp Director matching",
    "Payment flow: Pay Now → Venmo modal → confirm sends → 'Payment Sent' status",
  ]},
  { version: "13.014-13.015", date: "2026-02-08", time: "4:38 PM PST", author: "Claude", changes: [
    "Onboarding summary: Parent shows name, phone + Parent label, then email",
    "Onboarding summary: Camper cards now show photo/silhouette with green background",
    "Onboarding summary: All sections use light green background + green border",
    "Pick-up Policy: Green styling instead of blue when signed (card, modal, sign button)",
    "Removed 'Both policies signed' prompt text",
    "Non-editable placeholders use person silhouette instead of 'add photo'",
    "EC tab: Button renamed to '+ Add Emergency Contact'",
    "Registration: No longer requires admin approval — immediate registration",
    "Payments: Parent marks as paid directly (no 'submitted' intermediary)",
    "Session calendar: Simplified to Registered (green), Available (blue), No Day Camp (grey)",
    "Venmo modal: Simplified next steps, removed admin review mention",
  ]},
  { version: "13.011-13.013", date: "2026-02-08", time: "3:30 PM PST", author: "Claude", changes: [
    "Onboarding: Edit button shows 'Edit' text instead of pencil icon",
    "Onboarding: Photo upload added for campers in add/edit form",
    "Onboarding: Photo upload available for emergency contacts",
    "PhotoUploadModal: Add-photo placeholder circle is now clickable to upload directly",
    "Parent Dashboard: EC list shows role, phone, email on single line",
    "Parent Dashboard: Camper tab ECs now display photos and single-line format",
    "Fix: Invited ECs now properly linked as parent-reference contacts in database",
    "Fix: EC-to-parent conversion when inviting from parent dashboard EC tab",
  ]},
  { version: "13.010", date: "2026-02-08", time: "1:59 PM PST", author: "Claude", changes: [
    "Fix: Moved getDisplayPhoto helper to top-level scope in admin.html (was causing ReferenceError crash)",
  ]},
  { version: "13.009", date: "2026-02-08", time: "11:58 AM PST", author: "Claude", changes: [
    "Payments Tab: Per-camper breakdown and readable date ranges in parent.html",
    "Messages Tab: Redesigned as expandable list with read/unread indicators in parent.html",
    "Pod Setup: Drag-and-drop visual feedback and camper photos/age/grade in admin.html",
  ]},
  { version: "13.008", date: "2026-02-08", time: "11:44 AM PST", author: "Claude", changes: [
    "Photo Preservation: Photos saved as {cropped, original, transform} objects — re-editing loads full original",
    "Add Photo Placeholder: Standardized grey circle with plus icon and 'add photo' text everywhere",
    "Onboarding: Camper edit button added to Step 2 — edit name, birthdate, grade without deleting",
  ]},
  { version: "13.007", date: "2026-02-08", time: "10:50 AM PST", author: "Claude", changes: [
    "ImageCropper: Updated silhouette overlay with almond-shaped eyes, no nose, natural mouth",
    "Pickup Policy: Onboarding modal conditionally shows uploaded images with SVG fallback",
    "Onboarding Edit: Clicking edit from review step now returns you to review after editing (not next step)",
    "Payment Status: Updated getUnpaid for 3-state compatibility (unpaid/submitted/confirmed)",
  ]},
  { version: "13.006", date: "2026-02-08", time: "10:22 AM PST", author: "Derek Richardson", changes: [
    "Photo Upload: New popup modal for all photo uploads across the app (replaces direct file picker)",
    "Photo Upload Modal: Preview current photo, upload new, adjust existing, or remove — all in one modal",
    "Silhouette Placeholder: Updated to oval head with red eyes and red mouth for better visibility",
  ]},
  { version: "13.004", date: "2026-02-08", time: "9:52 AM PST", author: "Derek Richardson", changes: [
    "Onboarding: Pickup policy modal text size increased for readability",
    "Onboarding: Pickup policy modal now shows visual illustration (face photo OR photo ID)",
    "Onboarding: Edit buttons added to 'Your Information' summary to jump back to any section",
    "Onboarding: Removed redundant 'Everything looks good' review section from Step 4"
  ]},
  { version: "13.003", date: "2026-02-08", time: "9:48 AM PST", author: "Derek Richardson", changes: [
    "Onboarding: Eliminated Step 5 intermediate screen to prevent flash to login page after completing setup",
    "Onboarding: Reduced from 5 steps to 4 — after policies, 'Complete Setup' goes directly to submission",
    "Onboarding: Uses location.replace instead of location.href to prevent back-button returning to onboarding",
    "Admin Dashboard: Emergency contact warning now camper-based instead of parent-based",
    "Admin Dashboard: Counts emergency contacts from all parents linked to each camper via camperParentLinks",
    "Admin Dashboard: Warning navigates to Campers tab instead of Parents tab"
  ]},
  { version: "13.002", date: "2026-02-08", time: "9:39 AM PST", author: "Derek Richardson", changes: [
    "Onboarding: EC photo guidance now matches parent photo guidance (photo on site or photo ID at pickup required)",
    "Onboarding: Policies now display as popup modals instead of inline checkboxes",
    "Onboarding: Final review summary shown after both policies signed, before completing setup",
    "Onboarding: Parent EC now stored as reference-only record (no duplicated name/phone/photo)",
    "Parent Dashboard: Renamed 'My Campers' tab to 'Campers'",
    "Parent Dashboard: Add Child button moved to prominent green button at top of Campers tab",
    "Parent Dashboard: Emergency Contacts tab redesigned with photos, edit button, delete moved inside edit form",
    "Parent Dashboard: Parents tab redesigned with edit modal, remove moved inside modal",
    "Parent Dashboard: Camper photos shown above names in session registration child selectors and calendar headers",
    "Parent Dashboard: Registration dates now sourced from Gym Booked Dates (camp_gym_rentals) instead of camp_dates",
    "Parent Dashboard: Session-level availability from gym rentals (AM/PM disabled if not booked)"
  ]},
  { version: "13.001", date: "2026-02-08", time: "9:14 AM PST", author: "Derek Richardson", changes: [
    "Emergency Contacts: After adding a contact, prompt to create a parent login for them",
    "Emergency Contacts: Invited parents get full access to view camp details and manage registrations",
    "Emergency Contacts: Same invitation flow works during onboarding (index.html) and from dashboard (parent.html)",
    "Parent Dashboard: Added Activity History tab showing all actions related to the logged-in parent",
    "History: Admin actions (approve/reject registration, send messages, edit parent info) now tagged with parent email",
    "History: All parent-side actions auto-tagged with logged-in parent email for filtering",
    "History: Increased entry cap from 100 to 500 across all pages",
    "Admin: Added storage.deleteRow() method and 12 addToHistory calls now include relatedEmails"
  ]},
  { version: "13.000", date: "2026-02-08", time: "8:31 AM PST", author: "Derek Richardson", changes: [
    "MAJOR: Version bump to 13.x — significant admin interface and database restructuring milestone",
    "CRITICAL FIX: Parent registration Continue button was completely broken due to prop name mismatch (users→parents)",
    "CRITICAL FIX: Counselor registration had same broken prop issue (users→counselorUsers)",
    "Root cause: ParentOnboarding expected 'users'/'saveUsers' props but received 'parents'/'saveParents' — caused silent TypeError in async handler",
    "Added null safety to duplicate-email checks with (parents || []) and (counselorUsers || []) fallbacks",
    "Improved counselor registration with same field-by-field validation as parent registration",
    "Photo message updated: now explains photo on site or photo ID required at pickup"
  ]},
  { version: "12.195", date: "2026-02-08", time: "8:25 AM PST", author: "Derek Richardson", changes: [
    "FIX: Message delete in Danger Zone now actually deletes the row from Supabase",
    "Added storage.deleteRow() method for per-row table deletions",
    "Previously delete only updated React state but left the row in the database"
  ]},
  { version: "12.194", date: "2026-02-08", time: "8:17 AM PST", author: "Derek Richardson", changes: [
    "Parent Registration: Fixed Step 1 Continue button by adding specific field-by-field validation error messages",
    "Parent Registration: Added email format validation (checks for valid email structure)",
    "Parent Registration: Added minimum password length check (4 characters)",
    "Parent Registration: Made duplicate email check case-insensitive",
    "Parent Registration: Updated photo message to clarify photo on site or photo ID required at pickup"
  ]},
  { version: "12.193", date: "2026-02-08", time: "8:16 AM PST", author: "Derek Richardson", changes: [
    "Dashboard: Added Camp Director Task Summary with prioritized task categories (Urgent, Important, Setup)",
    "Dashboard: Urgent tasks detect pending registrations, unpaid registrations, and pending counselor requests",
    "Dashboard: Important tasks detect missing emergency contacts, camper photos, unassigned registrations, and sessions without counselors",
    "Dashboard: Setup tasks detect unbooked gym days, missing counselors, and uncustomized website content",
    "Dashboard: Quick stats bar shows parent, camper, counselor, and approved registration counts",
    "Dashboard: Each task includes a quick link button to navigate directly to the relevant admin section"
  ]},
  { version: "12.192", date: "2026-02-08", time: "8:01 AM PST", author: "Derek Richardson", changes: [
    "Gym Rentals: Removed 'Book Whole Week' feature, organized days in Mon-Fri rows",
    "Gym Rentals: Color-coded days — green (fully booked), yellow (partial), red (not booked)",
    "Content: Added editable fields for location details, pricing/discounts, policies, and scholarship info",
    "Content: Added 'Data From Other Tables' info panel showing counselor profiles and camp dates come from separate tables",
    "Pod Setup: Calendar now shows camper counts (assigned/registered), counselor counts (assigned/eligible), and pod count per session"
  ]},
  { version: "12.191", date: "2026-02-08", time: "7:55 AM PST", author: "Derek Richardson", changes: [
    "Reorganized Danger Zone into two clear sections: tables CLEARED vs PRESERVED by Delete All button",
    "Red-bordered section shows 9 tables that will be wiped (parents, campers, registrations, assignments, emergency contacts, links, onboarding, change requests)",
    "Green-bordered section shows 14 tables that are preserved (admins, counselors, availability, schedules, content, photos, etc.)",
    "Each section has color-coded borders and hover states for visual clarity"
  ]},
  { version: "12.190", date: "2026-02-08", time: "7:49 AM PST", author: "Derek Richardson", changes: [
    "Removed Registration Requests stats and Quick Navigation sections from Dashboard",
    "Moved History and Danger Zone under Camp Setup as sub-tabs",
    "Simplified Dashboard to clean welcome message"
  ]},
  { version: "12.189", date: "2026-02-08", time: "7:44 AM PST", author: "Derek Richardson", changes: [
    "FIX: Resolved getFoodPhoto ReferenceError that caused blank page when navigating to Content tab",
    "Moved getFoodPhoto helper from SitePhotosManager scope to Admin component scope where foodPhotos state is accessible",
    "Updated date format in red ribbon from '02-08-2026 7:44 AM' to 'Sun Feb 8 7:44 AM PST' across all 4 pages"
  ]},
  { version: "12.179", date: "2026-02-08", time: "11:45 PM PT", author: "Derek Richardson", changes: [
    "Danger Zone: Added 13 missing data tables to Database Records viewer",
    "All tables now visible: Camper-Parent Links, Blocked Sessions, Counselor Schedule, Gym Rentals",
    "Added: Website Content, Messages, Food Photos, Site Photos, Onboarding Progress",
    "Added: Availability Change Requests, Profile Change Requests, Change History",
    "Complete data transparency: Every table that stores data can now be viewed and deleted"
  ]},
  { version: "12.178", date: "2026-02-08", time: "11:30 PM PT", author: "Derek Richardson", changes: [
    "Fixed CampersTab component after users table split",
    "Updated component to use 'parents' prop instead of 'users' prop",
    "Resolved blank screen issue when viewing Campers tab in Family Setup"
  ]},
  { version: "12.177", date: "2026-02-08", time: "11:15 PM PT", author: "Derek Richardson", changes: [
    "Danger Zone: Merged 'Delete Individual Records' and 'Supabase Table Viewer' into one section",
    "Database Records: View and delete all records in organized, readable format",
    "Added icons to all sections for better visual organization",
    "Added missing sections: Counselor Users (login accounts) and Admins",
    "Admin deletion safety: Requires at least 1 admin to remain"
  ]},
  { version: "12.176", date: "2026-02-08", time: "10:45 PM PT", author: "Derek Richardson", changes: [
    "Database migration: Created corrected SQL matching actual Supabase structure",
    "Tables use: id (TEXT), data (JSONB), updated_at (TIMESTAMP WITH TIME ZONE)",
    "Migration scripts ready for camp_parents and camp_counselor_users tables"
  ]},
  { version: "12.175", date: "2026-02-08", time: "10:30 PM PT", author: "Derek Richardson", changes: [
    "Added diagnostic SQL to determine correct Supabase table structure",
    "Created 00_diagnose_structure.sql for schema inspection",
    "Updated migration instructions with diagnostic step"
  ]},
  { version: "12.174", date: "2026-02-08", time: "10:15 PM PT", author: "Derek Richardson", changes: [
    "Fixed Dashboard quick access buttons to use new hierarchical navigation",
    "Updated all setAdminTab calls to navigateToTab for new tab structure",
    "Resolved 'setAdminTab is not defined' error"
  ]},
  { version: "12.173", date: "2026-02-08", time: "10:00 PM PT", author: "Derek Richardson", changes: [
    "Created database migration scripts for users table split",
    "Added 01_create_new_tables.sql and 02_migrate_data.sql",
    "Comprehensive migration instructions with backup and rollback procedures"
  ]},
  { version: "12.172", date: "2026-02-08", time: "9:45 PM PT", author: "Derek Richardson", changes: [
    "Added backward compatibility layer for users table refactoring",
    "Created combined users array (parents + counselorUsers) for gradual migration",
    "Intelligent saveUsers function routes to correct table based on role",
    "Fixed Dashboard parent count and Danger Zone table viewer"
  ]},
  { version: "12.171", date: "2026-02-08", time: "9:00 PM PT", author: "Derek Richardson", changes: [
    "DATABASE RESTRUCTURING: Split camp_registered_users into camp_parents, camp_counselor_users, camp_admins",
    "Authentication updated to check all three separate tables for login",
    "Danger Zone: DELETE ALL DATA now preserves counselors and admins (only deletes parents)",
    "Data Safety: Counselor and admin accounts cannot be accidentally deleted"
  ]},
  { version: "12.170", date: "2026-02-08", time: "3:30 AM PT", author: "Derek Richardson", changes: [
    "Version sync only - no functional changes to index.html",
    "Changes in parent.html: New Parents tab with Family Access and prominent '+ Add Parent' button"
  ]},
  { version: "12.169", date: "2026-02-08", time: "3:00 AM PT", author: "Derek Richardson", changes: [
    "Version sync only - no functional changes to index.html",
    "Changes in parent.html: Prominent '+ New Emergency Contact' button styled like '+ New Registration'"
  ]},
  { version: "12.168", date: "2026-02-08", time: "2:30 AM PT", author: "Derek Richardson", changes: [
    "Version sync only - no functional changes to index.html",
    "Changes in parent.html: Consolidated registration summary view with date ranges and session counts"
  ]},
  { version: "12.167", date: "2026-02-08", time: "2:00 AM PT", author: "Derek Richardson", changes: [
    "Version sync only - no functional changes to index.html",
    "Changes in parent.html: Emergency Contacts modal overhaul and new Sessions tab with pod information"
  ]},
  { version: "12.166", date: "2026-02-08", time: "1:00 AM PT", author: "Derek Richardson", changes: [
    "Version sync only - no functional changes to index.html",
    "Changes in parent.html: Session Registration color scheme updates"
  ]},
  { version: "12.165", date: "2026-02-08", time: "12:00 AM PT", author: "Derek Richardson", changes: [
    "Version sync only - no functional changes to index.html",
    "Changes in parent.html: Next Steps improvements, photo silhouette update, Family Access enhancements"
  ]},
  { version: "12.164", date: "2026-02-07", time: "11:00 PM PT", author: "Derek Richardson", changes: [
    "Emergency Contact Improvements: Auto-focus cursor on name field when adding contact",
    "Phone Number Placeholders: All phone fields now show (555) 555-1234 format as placeholder",
    "Relationship Options: Updated to Parent, Legal Guardian, Relative, Caretaker, Family Friend, Other",
    "Custom Relationship: 'Other' option now allows specifying custom relationship with text input",
    "Policy Updates: Reorganized drop-off/pick-up policies with clearer messaging about photo ID",
    "Policy Updates: Added messaging through website option for pickup authorization changes",
    "UX Improvement: Contact relationship displays custom text when 'Other' is selected"
  ]},
  { version: "12.163", date: "2026-02-07", time: "10:00 PM PT", author: "Derek Richardson", changes: [
    "Parent Onboarding: Auto-save camper when clicking Continue without explicitly adding",
    "Progressive Summary: Shows accumulated parent info (name, email, phone) as you progress",
    "Progressive Summary: Shows campers added with full details (name, birthdate, grade, age)",
    "Progressive Summary: Shows emergency contacts with details after step 3",
    "Improved onboarding UX: No need to click 'Add Camper' before continuing to next step"
  ]},
  { version: "12.160", date: "2026-02-07", time: "9:00 PM PT", author: "Derek Richardson", changes: [
    "Multi-Parent Family Access: Parents can now add other parents/guardians to share camper access",
    "Admin Dashboard Reorganization: Hierarchical parent/child tab structure for better organization",
    "Family Setup tab (Parents, Campers, Session Registrations)",
    "Counselor Setup tab (Counselors, Work Availability)",
    "Pod Setup and Camp Setup tabs with organized children"
  ]},
  { version: "12.159", date: "2026-02-07", time: "8:45 PM PT", author: "Derek Richardson", changes: [
    "Sessions Tab Restructuring: Moved registration calendar from My Campers to Sessions tab",
    "Added prominent 'New Registration' button on Sessions tab to launch modal workflow",
    "Created registration modal containing all Step 1 and Step 2 content for better UX",
    "Implemented draft registration persistence - partial work saved when closing modal with X",
    "Added Submit Registration button to modal (submits and closes)",
    "Added Cancel button to modal (discards draft and closes)",
    "Auto-restores draft when reopening modal to continue incomplete registrations",
    "Improved registration flow: calendar overview → button → modal → submit"
  ]},
  { version: "12.157", date: "2026-02-07", time: "8:34 PM PT", author: "Derek Richardson", changes: [
    "Emergency Contacts: Complete infrastructure overhaul for camper-based linking",
    "Emergency contacts now linked to specific campers instead of parents",
    "Smart contact reuse: Same-named contacts automatically shared across campers",
    "Added camperEmergencyContactLinks data structure with storage",
    "Emergency contacts display beside each camper in My Campers tab",
    "Can remove emergency contacts from individual campers in edit mode",
    "Helper functions: getEmergencyContactsForCamper, addEmergencyContactToCamper, removeEmergencyContactFromCamper",
    "Automatic deduplication by contact name for efficient storage"
  ]},
  { version: "12.156", date: "2026-02-07", time: "8:20 PM PT", author: "Derek Richardson", changes: [
    "Updated Session Calendar status indicators to show payment status",
    "Green: Approved & Paid | Yellow: Approved - Payment Pending | Blue: Pending Approval",
    "Updated legend with clearer status descriptions including payment info",
    "Improved instructions: clarified selection process and status meanings",
    "Added note about Camp Director payment confirmation process",
    "Removed redundant 'View registration status' text"
  ]},
  { version: "12.155", date: "2026-02-07", time: "8:14 PM PT", author: "Derek Richardson", changes: [
    "Moved legend below each camper's calendar for better context",
    "Legend now appears directly under each child's session calendar grid"
  ]},
  { version: "12.154", date: "2026-02-07", time: "8:12 PM PT", author: "Derek Richardson", changes: [
    "Added legend item showing red X means 'No Day Camp' on Session Calendar",
    "Improved calendar readability with clear explanation of all symbols"
  ]},
  { version: "12.153", date: "2026-02-07", time: "8:09 PM PT", author: "Derek Richardson", changes: [
    "Fixed critical bug: RegistrationCalendarView now receives activeCampDates prop",
    "Resolved ReferenceError that was breaking the Campers tab"
  ]},
  { version: "12.152", date: "2026-02-07", time: "8:02 PM PT", author: "Derek Richardson", changes: [
    "Added red face silhouette guide in photo cropper to show proper face framing",
    "Made rotate button much larger (2xl size) for easier use",
    "Removed instructional text above photo cropper for cleaner interface",
    "Fixed save child button - now correctly updates campers in database",
    "Reorganized edit child form: removed Cancel button, Save and Delete now side-by-side",
    "Added camp_dates database table for centralized day camp date management",
    "Updated calendars to show X marks on non-camp dates (only valid dates selectable)",
    "Parent Sessions tab calendar now respects official camp dates from database"
  ]},
  { version: "12.151", date: "2026-02-07", time: "7:41 PM PT", author: "Derek Richardson", changes: [
    "Removed green 'Registered' tag from campers in Campers tab",
    "Moved delete button to edit modal with secondary confirmation",
    "Renamed 'Registrations' tab to 'Sessions'",
    "Renamed 'Registration Calendar' to 'Session Calendar'",
    "Removed 'All Campers' option from selector",
    "Added multi-select functionality - show separate calendar for each selected camper",
    "Updated legend: 'Not registered' changed to 'Available'"
  ]},
  { version: "12.150", date: "2026-02-07", time: "3:18 PM PT", author: "Derek Richardson", changes: [
    "Removed camp schedule by day section from parent dashboard Campers tab",
    "Moved 'Registered Camper' tag to inline position beside camper name",
    "Simplified Campers tab layout for cleaner user experience"
  ]},
  { version: "12.149", date: "2026-02-07", time: "3:12 PM PT", author: "Derek Richardson", changes: [
    "Added contextual hints/advice system to parent dashboard with smart next-step recommendations",
    "Added current registrations list on registration tab showing all registrations grouped by camper",
    "Registration submissions now stay on page and update list in real-time without reload",
    "Added 'Select Both Sessions' button for each date on registration calendar",
    "Added 'Add Whole Week' buttons for quick bulk registration of entire weeks",
    "Fixed share button functionality with Web Share API and clipboard fallback"
  ]},
  { version: "12.148", date: "2026-02-07", time: "2:53 PM PT", author: "Derek Richardson", changes: [
    "Fixed critical bug: Added missing CamperScheduleTab component to parent.html",
    "Fixed missing AddChildForm and ChildCard components in admin.html",
    "Parent dashboard Campers tab now loads correctly without errors",
    "All dashboard components now properly defined and accessible"
  ]},
  { version: "12.147", date: "2026-02-07", time: "2:38 PM PT", author: "Derek Richardson", changes: [
    "Removed credit card payment step from parent onboarding process",
    "Simplified registration flow from 6 steps to 5 steps",
    "Parent onboarding now: Account Setup → Add Campers → Emergency Contacts → Policies → Complete",
    "Removed all credit card input fields and formatting functions"
  ]},
  { version: "12.146", date: "2026-02-07", time: "2:33 PM PT", author: "Derek Richardson", changes: [
    "Reduced emergency contact requirement from 3 to 2 contacts",
    "Removed requirement for non-parent contact (any relationship now accepted)",
    "Removed requirements status box from emergency contacts form",
    "Removed explanatory and warning text from emergency contacts section"
  ]},
  { version: "12.145", date: "2026-02-07", time: "2:24 PM PT", author: "Derek Richardson", changes: [
    "Fixed remaining duplicate components in admin.html (ParentEmergencyContactsManager, RegistrationCalendarView)",
    "Admin dashboard now fully functional with all components properly declared once"
  ]},
  { version: "12.144", date: "2026-02-07", time: "2:17 PM PT", author: "Derek Richardson", changes: [
    "Fixed critical bug: Removed duplicate ChildrenManager component declaration in admin.html",
    "Admin dashboard now loads correctly without syntax errors"
  ]},
  { version: "12.143", date: "2026-02-07", time: "1:29 PM PT", author: "Derek Richardson", changes: [
    "Split monolithic index.html into 4 separate files for parallel development",
    "Created index.html (public pages + login), admin.html, parent.html, counselor.html",
    "Implemented sessionStorage authentication for cross-page navigation",
    "Each dashboard file now self-contained and can be edited independently",
    "Enabled multiple Claude Code instances to work on different roles simultaneously"
  ]},
  { version: "12.142", date: "2026-02-07", time: "1:08 PM PT", author: "Derek Richardson", changes: [
    "Fixed timestamp inconsistency — BUILD_DATE and release notes now use same Pacific Time source",
    "Converted all release note timestamps from Eastern Time to Pacific Time (Seattle timezone)",
    "BUILD_DATE now properly updates with each release"
  ]},
  { version: "12.141", date: "2026-02-07", time: "1:06 PM PT", author: "Derek Richardson", changes: [
    "Fixed admin tab bar scroll position — now retains scroll position when clicking into tabs (especially Danger Zone)",
    "Removed individual bulk delete buttons from Danger Zone (Delete All Parents, Campers, Counselors, Registrations, Assignments, Nuclear Option)",
    "Simplified Danger Zone to single 'DELETE ALL DATA (EXCEPT COUNSELORS)' button that preserves counselors and admin",
    "Updated DELETE ALL DATA to preserve counselor roster, availability, and schedules while wiping parent/camper data"
  ]},
  { version: "12.140", date: "2026-02-06", time: "12:40 PM PT", author: "Derek Richardson", changes: [
    "Danger Zone: Deletions no longer log out or reload page — stays in Danger Zone for continued operations",
    "Fixed DELETE ALL USER DATA to also delete emergency contacts and onboarding progress",
    "Fixed DELETE ALL USER DATA to only preserve counselor accounts (not stale admin entries in users table)",
    "Added new DELETE ALL DATA button — total system wipe that removes everything except the admin account",
    "Release notes now include timestamps"
  ]},
  { version: "12.139", date: "2026-02-06", author: "Audrey Richardson", changes: [
    "Fixed birthdate picker not registering selections — separated year/month/day into independent state fields",
    "Updated birthdate year dropdown to show 2000-2026 range for proper camper age selection",
    "Added validation requiring at least one camper before continuing from step 2 in parent registration",
    "Added parent-level transitioning state to prevent login flash after parent/counselor registration"
  ]},
  { version: "12.138", date: "2026-02-06", author: "Audrey Richardson", changes: [
    "Fixed login glitch — added loading screen during registration submission to prevent flash back to login page",
    "Fixed counselor dashboard not showing unavailable (red) sessions from onboarding — now saves both available AND unavailable to availability table",
    "Replaced camper birthdate picker with year/month/day dropdowns for easier year selection",
    "Parent registration also now shows loading screen during submission"
  ]},
  { version: "12.137", date: "2026-02-06", author: "Audrey Richardson", changes: [
    "Fixed login glitch after counselor/parent registration — removed redundant role checks that caused brief flash to login",
    "Fixed counselor availability sync — both available (green) AND unavailable (red) sessions now transfer to admin dashboard",
    "Admin schedule view now shows three states: ✓ Available (green), ✗ Unavailable (red), ○ Not set (gray)",
    "Added 'Birthdate' label to camper registration date field for clarity",
    "Added weekdays clarity to counselor onboarding, counselor dashboard, and parent registration pages"
  ]},
  { version: "12.136", date: "2026-02-06", author: "Audrey Richardson", changes: [
    "Updated home page camp dates to clarify weekdays only: 'Weekdays from July 13-17 & August 10-28, 2026'"
  ]},
  { version: "12.135", date: "2026-02-06", author: "Audrey Richardson", changes: [
    "Updated camp dates: now July 13-17 and August 10-28, 2026 (4 weeks total instead of full summer)",
    "Removed June from all month selectors (counselor onboarding, counselor dashboard, admin calendars)",
    "Changed default month views from June to July",
    "Updated home page camp dates display to reflect new schedule"
  ]},
  { version: "12.134", date: "2026-02-03", author: "Audrey Richardson", changes: [
    "Fixed Parents tab badge count — was showing total users (including counselors), now shows only parent count"
  ]},
  { version: "12.133", date: "2026-02-03", author: "Audrey Richardson", changes: [
    "Fixed admin Parents tab showing counselors as parents — now filters by role so only actual parents appear",
    "Fixed parent count display to show only parent users, not all users",
    "Fixed Message All Parents to only include parent users, not counselors"
  ]},
  { version: "12.132", date: "2026-02-03", author: "Audrey Richardson", changes: [
    "Removed emojis from password show/hide toggles — now plain text 'Show'/'Hide'",
    "Counselor onboarding availability now uses month tabs (June/July/Aug) instead of scrolling through all weeks",
    "Removed checkmark and prohibited emojis from availability session buttons — color only (green/red/grey)",
    "Fixed counselor dashboard availability sync: changes now save to both availability and counselorSchedule so admin dashboard reflects updates immediately"
  ]},
  { version: "12.131", date: "2026-02-03", author: "Audrey Richardson", changes: [
    "Added missing release notes for versions 12.122 through 12.130 (all by Derek Richardson)",
    "Verified version numbering and release notes are complete and up to date"
  ]},
  { version: "12.130", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Created missing saveRegistrations function for proper Supabase deletion",
    "Updated Nuclear Option to preserve counselors — only deletes parents, campers, registrations, assignments",
    "Fixed both bulk and individual registration deletion in Danger Zone"
  ]},
  { version: "12.129", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Improved registration confirmation modal with executive summary, payment instructions, and next steps",
    "Added visual registration calendar in My Campers tab (3-month view, color-coded status, AM/PM indicators)",
    "Fixed CamperScheduleTab crash — updated getCounselorForSession and getPodMates for object-based assignments"
  ]},
  { version: "12.128", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Added emergency contacts deletion to Danger Zone",
    "Fixed critical registration bug: multiple campers/sessions now register correctly (race condition fix)",
    "Added parent emergency contacts manager in My Campers tab with validation (3+ contacts, 1+ non-parent)"
  ]},
  { version: "12.127", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Admin Campers tab: removed parent email, added Emergency Contacts column with clickable count",
    "Created modal to view emergency contact details (name, relationship, phone, email, priority)",
    "Added emergency contacts display in Edit Camper modal"
  ]},
  { version: "12.126", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Added min/max constraints to birthdate inputs for faster date selection",
    "Camper birthdate picker starts near expected birth year (ages 8-14) instead of current year",
    "Counselor birthdate picker constrained to appropriate age range (14-25 years old)"
  ]},
  { version: "12.125", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Fixed critical bug: Danger Zone was calling non-existent saveAvailability instead of saveAvail",
    "All availability deletions (bulk, nuclear, individual) now work correctly"
  ]},
  { version: "12.124", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Fixed orphaned counselor availability deletion when counselor record already removed",
    "Cleans up ALL orphaned counselorSchedule entries without matching counselors"
  ]},
  { version: "12.123", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Fixed individual counselor availability delete to remove from both availability and counselorSchedule tables",
    "Now matches bulk delete behavior for complete data removal"
  ]},
  { version: "12.122", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Added page refresh after all bulk and individual delete operations in Danger Zone",
    "Added counselor availability deletion section showing counselor name, email, and date count"
  ]},
  { version: "12.121", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Added individual record deletion in Danger Zone - delete specific parents, counselors, campers, registrations, or assignments",
    "Provided complete Supabase schema SQL for easy copy-paste setup",
    "Individual deletes organized in expandable sections for easy browsing"
  ]},
  { version: "12.120", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Added Danger Zone tab to admin dashboard for data management",
    "Implemented bulk delete functionality for parents, counselors, campers, registrations, and assignments",
    "Added nuclear option to delete all user data while preserving site content",
    "Created read-only Supabase table viewer to inspect all database tables",
    "Counselor onboarding verified to correctly create counselor-only accounts"
  ]},
  { version: "12.119", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Fixed critical Assignments tab bug: drag-and-drop now works correctly without resetting session view",
    "Fixed pod ID consistency - pods maintain stable IDs across counselor assignments",
    "Fixed Add Pod button - now properly displays new empty pods without closing session view",
    "Enhanced delete pod functionality - can now delete any pod (counselors/campers return to unassigned)",
    "Improved state management to prevent session view from closing after changes"
  ]},
  { version: "12.118", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Fixed Assignments tab bug: counselor-only pods now properly save to assignments",
    "Fixed new pod creation - pods with counselors but no campers are now persisted",
    "Sessions tab now displays pod assignments with camper counts (e.g., '3/5, 2/5')",
    "Added warning indicator when registered campers exceed available pod capacity",
    "Updated Sessions tab legend to explain pod capacity display"
  ]},
  { version: "12.117", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Updated parent registration UI to match admin Sessions tab pattern",
    "Replaced collapsible accordion with month selector buttons and responsive grid layout",
    "Date selection UI now consistent across admin and parent dashboards"
  ]},
  { version: "12.116", date: "2026-02-03", author: "Derek Richardson", changes: [
    "Fixed My Schedule tab - resolved 'podAssignments is not defined' error",
    "Moved logged-in user's name to appear before Logout button in header",
    "My Schedule tab now correctly displays counselor assignments and campers"
  ]},
  { version: "12.115", date: "2026-02-02", author: "Derek Richardson", changes: [
    "Added 'My Schedule' tab to counselor dashboard showing assigned sessions and pod campers (read-only)",
    "Header now shows logged-in user's name for all roles",
    "Added role-specific dashboard buttons in header (Admin/Parent/Counselor Dashboard) for easy navigation from public pages",
    "Login button changes to Logout when user is logged in"
  ]},
  { version: "12.114", date: "2026-02-02", author: "Derek Richardson", changes: [
    "Added tab navigation to counselor dashboard with '📊 Dashboard' tab",
    "Counselor dashboard now consistent with admin and parent navigation patterns"
  ]},
  { version: "12.113", date: "2026-02-02", author: "Derek Richardson", changes: [
    "Fixed counselor availability calendar month jumping - stays on current month when toggling sessions",
    "Counselor dashboard month selection now persists across updates"
  ]},
  { version: "12.112", date: "2026-02-02", author: "Audrey Richardson", changes: [
    "Added show/hide password toggle on all password fields (login, parent onboarding, counselor onboarding)",
    "Counselor onboarding availability now starts grey (unselected) instead of pre-selected",
    "Availability cycles: grey (unset) → green (available) → red (unavailable) → grey",
    "Counselor availability UI updated to card-based layout matching admin sessions tab style with color-coded legend",
    "Updated counselor pay to $80/session ($26.66/hr for 3-hour sessions)",
    "Fixed counselor availability data flow: now saves to both availability and counselorSchedule so admin dashboard reflects it immediately",
    "Fixed afternoon session display from 1:00 PM - 4:00 PM to 12:00 PM - 3:00 PM in admin view"
  ]},
  { version: "12.111", date: "2026-02-02", author: "Audrey Richardson", changes: [
    "Policies step (Step 5) is now required during parent onboarding — cannot be skipped",
    "Skip button on steps 2-4 now jumps to Policies instead of completing setup",
    "Auto-select camper if parent has only one child in registration flow",
    "Added prominent warning when no camper selected but dates are chosen",
    "Camper selection shows checkmark and count when selected",
    "Reorganized parent tabs: Dashboard, My Campers, Registrations, Messages",
    "Camp Schedule now appears within My Campers tab (below camper profiles)",
    "Renamed Register tab to Registrations"
  ]},
  { version: "12.110", date: "2026-02-02", author: "Derek Richardson", changes: [
    "Added author tracking to release notes",
    "Release notes now display who made each change"
  ]},
  { version: "12.109", date: "2026-02-02", author: "Derek Richardson", changes: [
    "Fixed afternoon session drop-off time (11:45 AM - 12:00 PM)",
    "Added basketball training focus section to schedule with drill descriptions",
    "Removed lunch restaurant options from public page",
    "Removed payment section from pricing page"
  ]},
  { version: "12.108", date: "2026-02-01", author: "Derek Richardson", changes: [
    "Admin: Removed Children tab from admin dashboard",
    "Admin: Simplified Parents tab header to just 'Parents'",
    "Admin: Reordered tabs — Campers now follows Parents",
    "Admin: Redesigned Assignments tab with pod-based layout",
    "Admin: Counselors split into Eligible/Not Eligible groups",
    "Admin: Added ability to permanently delete registrations"
  ]},
  { version: "12.107", date: "2026-02-01", author: "Derek Richardson", changes: [
    "Registrations tab: Added ability to permanently delete registrations",
    "Delete confirmation modal prevents accidental deletions"
  ]},
  { version: "12.106", date: "2026-02-01", changes: [
    "Assignments tab: Counselors split into Eligible and Not Eligible groups",
    "Assignments tab: Registered campers shown as draggable list for pod assignment"
  ]},
  { version: "12.105", date: "2026-02-01", changes: [
    "Removed Children tab from admin dashboard",
    "Simplified Parents tab header to just 'Parents'",
    "Reordered admin tabs: Campers now follows Parents",
    "Redesigned Assignments tab with pod-based layout",
    "Pods can be added/removed, with counselor slot at top and 5 camper slots below",
    "Drag and drop support for both counselors and campers in pods"
  ]},
  { version: "12.104", date: "2026-02-01", changes: [
    "Simplified data model - removed children/campers distinction",
    "Parents now register campers directly during onboarding",
    "Updated parent onboarding to 'Add Campers' step",
    "Campers tab now shows all campers (not just those with approved registrations)",
    "All terminology updated from 'children' to 'campers' throughout",
    "Registrations now use camperId/camperName (backward compatible with childId/childName)"
  ]},
  { version: "12.103", date: "2026-02-01", changes: [
    "Updated counselor photos on public site - removed green background, 50% larger",
    "Made registration detail fields read-only (camper name, parent info, session date)",
    "Added rejected/cancelled registrations section to admin dashboard",
    "Updated campers tab to show approved and pending registration counts",
    "Removed manage parents option from camper summary"
  ]},
  { version: "12.102", date: "2026-02-01", changes: [
    "Fixed bulk registration creating only one registration",
    "Added registration details view with edit capability",
    "Added payment status visibility and mark-as-paid in pending registrations",
    "Made registration rows clickable to view/edit details"
  ]},
  { version: "12.101", date: "2026-01-31", changes: [
    "Moved policy info from Schedule to Pricing page",
    "Added bulk registration creation in Registrations tab",
    "Admin can create registrations for multiple children across multiple days/sessions/weeks",
    "Unified session selection UI with week headers and ☀️ AM / 🌙 PM buttons",
  ]},
  { version: "12.100", date: "2026-01-31", changes: [
    "Phone validation now requires exactly 10 digits",
    "Parent onboarding steps 2-6 are now skippable (only account info required)",
    "Parent tab summary shows: Children, Campers, Approved/Pending Registrations, Unread Messages",
    "Admin can create registrations for parent's children",
    "Registration approval with payment verification in Approvals tab",
    "Renamed profile changes section to 'Counselor Profile Change Requests'",
    "Campers tab only shows children with approved registrations",
  ]},
  { version: "12.099", date: "2026-01-31", changes: [
    "Fixed Add Parent button showing blank screen (moved ParentOnboarding to correct scope)",
  ]},
  { version: "12.098", date: "2026-01-31", changes: [
    "Fixed counselor schedule modal staying open when toggling sessions",
    "Unified day/session UI: ☀️ AM and 🌙 PM icons across all screens",
    "Counselor schedule modal now matches Sessions tab layout",
    "Parent registration date selector uses consistent styling",
    "Counselor availability calendar uses same icons"
  ]},
  { version: "12.097", date: "2026-01-31", changes: [
    "Counselors: renamed to Edit Profile/Edit Schedule, Delete moved inside profile",
    "Admin Add Parent now uses full parent onboarding wizard"
  ]},
  { version: "12.096", date: "2026-01-31", changes: [
    "Login page auto-focuses email input for faster typing",
    "Schedule eligibility modal now requires Done button to close",
    "All schedule changes logged to history"
  ]},
  { version: "12.095", date: "2026-01-31", changes: [
    "Dashboard stats now labeled as 'Registration Requests'",
    "Counselors tab: Schedule button to set work eligibility by week/day/session",
    "Counselors show eligible sessions count and scheduled (working) status",
    "Sessions marked with camper icon when counselor has assignments"
  ]},
  { version: "12.094", date: "2026-01-31", changes: [
    "Fixed popup/modal windows closing unexpectedly when clicking",
    "Added large navigation buttons to admin dashboard for quick access"
  ]},
  { version: "12.092", date: "2026-01-31", changes: [
    "Build timestamp now uses actual current time",
    "Sessions tab: toggle individual AM/PM sessions or whole day",
    "Sessions tab: stays in current month after changes",
    "Sessions tab: shows counselor availability and camper counts per session",
    "Parent registration: shows blocked AM/PM sessions individually"
  ]},
  { version: "12.091", date: "2026-01-31", changes: [
    "Larger navigation buttons for easier mobile use",
    "Registration deletion now cascades to remove camper from assignments",
    "New Sessions admin tab to block/unblock camp dates",
    "Blocked dates shown as unavailable in parent registration",
    "Reordered admin tabs: Counselors, Parents, Children, Registrations, Campers, Assignments, Sessions, Approval, Content, History"
  ]},
  { version: "12.090", date: "2026-01-31", changes: [
    "Moved counselors section up on homepage with larger circular headshots",
    "Removed green rectangle frames from counselor photos",
    "Changed to 'Easy Pick-up & Drop-off' text"
  ]},
  { version: "12.089", date: "2026-01-31", changes: [
    "Hero image now edge-to-edge",
    "New Pricing tab with pricing, discounts, and scholarship info",
    "Removed pre-order lunch options - campers bring their own lunch",
    "Updated snacks section with clearer messaging",
    "Simplified cancellation and late pickup policies"
  ]},
  { version: "12.088", date: "2026-01-31", changes: [
    "Mobile responsive improvements across entire site",
    "Navigation wraps and scales properly on small screens",
    "Hero section text sizes adjust for mobile devices",
    "Info cards and counselor grids use responsive breakpoints",
    "Admin/Parent dashboard tabs and headers scale for mobile",
    "Tables have horizontal scroll on small screens",
    "Footer contact info breaks properly on mobile",
    "Role selector and forms use appropriate mobile sizing"
  ]},
  { version: "12.087", date: "2026-01-31", changes: [
    "Version banner time now uses 12-hour format with AM/PM",
    "Photo re-editing preserves previous zoom, position, and rotation settings",
    "Original images stored for lossless re-editing",
    "Public site photos now use consistent 4:3 aspect ratios matching cropper"
  ]},
  { version: "12.086", date: "2026-01-31", changes: [
    "Version banner now shows build time in MM-DD-YYYY HH:MM format",
    "Version banner shows both build time and time since upload",
    "Release notes modal is now scrollable for long release histories"
  ]},
  { version: "12.085", date: "2026-01-31", changes: [
    "Scrollable tabs with drag-to-scroll in Admin and Parent dashboards",
    "Visual indicators (fade + arrows) when more tabs are available to scroll",
    "Admin content photos now display at correct aspect ratios matching website",
    "Increased image export resolution from 300px to 1200px for sharper photos",
    "Improved JPEG quality from 90% to 95% for uploaded images"
  ]},
  { version: "12.084", date: "2026-01-30", changes: ["Version bump for dev build"] },
  { version: "12.083", date: "2026-01-30", author: "Derek Richardson", changes: [
    "Admin: Moved Content tab to second position (after Dashboard) for easier access"
  ]},
  { version: "12.082", date: "2026-01-30", author: "Derek Richardson", changes: [
    "Parent: Added optional credit card step (step 4) with visual card preview",
    "Parent: Payment step is skippable (future Stripe integration)",
    "Parent: Added photo upload with cropping in account setup",
    "Parent: Added photo upload for emergency contacts",
    "Parent: Display contact photos in emergency contacts list",
    "Parent: Updated onboarding from 5 to 6 steps"
  ]},
  { version: "12.081", date: "2026-01-30", changes: [
    "Fixed input focus issue in onboarding flows - text fields now maintain focus",
    "Refactored ParentOnboarding to use inline JSX instead of inner components",
    "Refactored CounselorOnboarding to use inline JSX instead of inner components",
    "All form inputs throughout the site now work correctly without losing focus"
  ]},
  { version: "12.080", date: "2026-01-30", changes: [
    "Parent dashboard: 'Add Another Child' button replaces always-visible form",
    "New 'Camp Schedule' tab shows visual schedule with counselor & pod info",
    "Schedule tab displays pod mates and other campers at each session",
    "Counselor headshots shown in pod assignments",
    "Children remain as children even when registered as campers",
    "Admin Children tab now shows ALL children from both data sources",
    "Clear distinction: children are profiles, campers are registered children"
  ]},
  { version: "12.079", date: "2026-01-30", changes: [
    "Added Children tab in admin dashboard to view all child profiles",
    "Children tab separates registered (campers) from unregistered children",
    "Hidden 'Coming Soon' badges on Google/Apple login buttons",
    "Content tab has text editing and photo management (scroll down)",
    "Site Photos section in Content tab for hero image and activity photos"
  ]},
  { version: "12.078", date: "2026-01-30", changes: [
    "Removed admin credentials display from login page",
    "Added Google and Apple login buttons (Coming Soon)",
    "Login page visually shows social login options will be available",
    "Updated 'Create account' button text for clarity"
  ]},
  { version: "12.077", date: "2026-01-30", changes: [
    "Hero image: Admin can upload a large background photo for the hero section",
    "Activity photos: Drop-off, layups practice, and lunch photos throughout site",
    "Photo editor with zoom/crop shows exact preview of final result",
    "All site photos manageable from Admin Content tab",
    "Photos stored in database and persist across builds"
  ]},
  { version: "12.076", date: "2026-01-30", changes: [
    "Terminology update: Parents have 'children', registered children become 'campers'",
    "Parent dashboard: 'My Children' tab with clear profile management",
    "Registration confirmation now says 'Your children are now campers!'",
    "Clear messaging throughout: profiles vs registrations",
    "Admin tabs updated with clearer camper/children terminology"
  ]},
  { version: "12.075", date: "2026-01-29", changes: [
    "Food/snack/drink images are now perfectly square (aspect-square)",
    "Image cropper preview exactly matches how photos appear on website",
    "Square photos have rounded corners (rounded-xl) in both editor and site",
    "Admin thumbnails now square to match public display",
    "Edit modal preview labeled 'Preview (exactly as shown on website)'"
  ]},
  { version: "12.074", date: "2026-01-29", changes: [
    "Image cropper now supports shapes: circle (counselors), square (food photos)",
    "Added rotation slider and 90° rotate button to image editor",
    "Click any food photo to see 'Edit' overlay - opens edit modal",
    "Edit modal has: Upload New Photo, Adjust Position/Zoom/Rotate, Reset to Default",
    "Food/snack photos on Schedule page are now 2x larger",
    "Green dot indicator shows which photos have custom uploads"
  ]},
  { version: "12.073", date: "2026-01-29", changes: [
    "Food photo uploads now include zoom, crop, and pan controls",
    "Hover over any food photo to see upload and adjust buttons",
    "Adjust button opens the image cropper for existing photos",
    "Same image editor used for counselor photos"
  ]},
  { version: "12.072", date: "2026-01-29", changes: [
    "Fixed parent editing bug - changes now save properly",
    "Fixed child editing bug - changes now save properly",
    "Fixed registration editing bug - changes now save properly",
    "Admin can upload custom photos for snacks and drinks (Content tab)",
    "Food photos persist to database",
    "Reset button to restore default photos"
  ]},
  { version: "12.071", date: "2026-01-29", changes: [
    "All changes persist to database immediately",
    "Proper delete functions remove records from database",
    "Delete counselor: Removes from DB, cleans up assignments and availability",
    "Delete camper: Removes from DB, cleans up parent links and assignments",
    "Delete parent: Removes from DB, cleans up camper links",
    "DELETE confirmation modal for counselors (replaces browser confirm)",
    "UI updates instantly on all add/edit/delete operations",
    "All dynamic data stored in Supabase for persistence across builds"
  ]},
  { version: "12.070", date: "2026-01-29", changes: [
    "Standalone campers: Campers are now separate entities from parents",
    "Many-to-many relationships: A camper can have multiple parents, and a parent can have multiple campers",
    "Admin can add/edit/delete campers from Campers tab",
    "Admin can add/edit/delete parents from Parents tab",
    "Manage camper-parent associations from either tab",
    "Backward compatible with legacy children data",
    "Counselors tab has full CRUD (add/edit/delete/reorder)",
    "Camper can only be assigned to ONE counselor per session (enforced)"
  ]},
  { version: "12.069", date: "2026-01-29", changes: [
    "Admin management: Create, edit, delete admin accounts",
    "At least one admin always required",
    "Campers tab: View all registered campers with details",
    "Camper search, sort by name/age/grade/registrations",
    "Assignments tab: Drag-and-drop camper-counselor assignments",
    "View assignments by date and session (AM/PM)",
    "Capacity tracking: 5 campers max per counselor",
    "Auto-assign feature distributes campers evenly",
    "Empty spots summary to see available capacity"
  ]},
  { version: "12.068", date: "2026-01-29", changes: [
    "Enhanced counselor availability signup with bulk actions",
    "Camp dates auto-generated: Monday after school ends → Friday before school starts",
    "Flexible registration with bulk discounts:",
    "  - 10% off for booking full week (all 5 days, AM & PM)",
    "  - 15% off for booking 2+ full weeks",
    "Quick 'Full Week' selection buttons for easy booking",
    "Order summary shows discount breakdown and savings",
    "Registrations store discount info for accounting"
  ]},
  { version: "12.067", date: "2026-01-29", changes: [
    "Admin can edit/delete parents, children, and registrations",
    "Type 'DELETE' confirmation for all deletions",
    "Location page with Roosevelt HS map, address, GPS links",
    "Schedule page shows pricing tiers and bulk discounts",
    "Cancellation policy (2 weeks advance notice)",
    "Late pickup policy (Starbucks gift card suggestion)",
    "Added Apple Maps and Google Maps direct links"
  ]},
  { version: "12.066", date: "2026-01-29", changes: [
    "Parents can now edit child details (name, birthdate, grade, phone, photo)",
    "Parents can delete children from their account (e.g., duplicates)",
    "Edit mode with inline form for child details",
    "Delete confirmation dialog to prevent accidents"
  ]},
  { version: "12.065", date: "2026-01-29", changes: [
    "Added Parents tab in admin to view all registered parents and campers",
    "Two-way in-app messaging system between admin and parents",
    "Message individual, multiple, or all parents",
    "Parents see messages in dashboard with unread indicators",
    "Conversation threads with reply functionality"
  ]},
  { version: "12.064", date: "2026-01-29", changes: [
    "Fixed modal closing when selecting text in edit forms",
    "Enhanced photo editing: adjust zoom/position, delete, or upload new",
    "Added counselor reordering with up/down arrows",
    "Counselor order persists and displays on public website"
  ]},
  { version: "12.063", date: "2026-01-29", changes: [
    "Fixed 1Password popup with data-1p-ignore attributes",
    "Admin shows as 'Admin' - click to go to admin portal",
    "Fixed input fields losing focus when typing",
    "Enhanced child form: photo upload, birthdate, calculated age, optional phone",
    "Auto-save for all content changes",
    "Added change history with timestamps"
  ]},
  { version: "12.062", date: "2026-01-29", changes: [
    "Admin: Full content editing for all camp sections (schedule, activities, policies, etc.)",
    "Admin: Image management — upload, crop, and delete section images",
    "Admin: Auto-save on all content changes with visual confirmation",
    "Admin: Change history log with timestamps for audit trail"
  ]},
  { version: "12.061", date: "2026-01-29", changes: ["Fresh rebuild with all features", "Merged v12.042 features with Supabase schema separation", "Payment tracking, cancellation/refund system", "Collapsible calendar, scholarship requests"] },
  { version: "12.060", date: "2026-01-29", changes: ["Merged v12.042 feature set with Supabase schema separation architecture", "Reconciled feature branches after schema isolation refactor"] },
  { version: "12.056", date: "2026-01-29", changes: ["Fixed counselor editing, photo cropper, phone formatting"] },
  { version: "12.055", date: "2026-01-29", changes: ["Restored all features after schema separation rebuild"] },
  { version: "12.054", date: "2026-01-29", changes: ["Fixed Supabase schema connection"] },
  { version: "12.053", date: "2026-01-29", changes: ["Separated dev and public Supabase schemas for data isolation — dev changes no longer affect production data"] },
  { version: "12.052", date: "2026-01-29", changes: ["Added dev/production environment banners to distinguish environments", "Added release notes system for tracking changes"] },
  { version: "12.051", date: "2026-01-29", changes: ["Fixed input focus bug — text fields no longer lose focus while typing"] }
];
