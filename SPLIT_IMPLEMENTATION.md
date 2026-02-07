# Roosevelt Camp - File Split Implementation

## Overview
The monolithic `index.html` file (618KB, 11,807 lines) has been successfully split into 4 separate HTML files for parallel development:

1. **index.html** (218KB, 4,152 lines) - Public pages + Login
2. **admin.html** (529KB, 10,302 lines) - Admin dashboard
3. **parent.html** (232KB, 4,656 lines) - Parent dashboard
4. **counselor.html** (154KB, 3,021 lines) - Counselor dashboard

## File Breakdown

### 1. index.html - Public Pages & Login
**Contents:**
- Public pages: Home, Schedule, Pricing, Location, Counselors
- Login page with email/password authentication
- ParentOnboarding wizard (for new parent registration)
- CounselorOnboarding wizard (for new counselor applications)
- RoleSelector component
- Shared components: Toast, Modal, ImageCropper, ScrollableTabs, etc.
- Supabase configuration and storage wrapper
- All constants, utilities, and helper functions

**Authentication Flow:**
- On successful login, stores user object in `sessionStorage`
- Redirects to appropriate dashboard:
  - Admin → `/admin.html`
  - Parent → `/parent.html`
  - Counselor → `/counselor.html`

**Login Handler:**
```javascript
const handleLogin = () => {
  const admin = admins.find(a => a.username === email && a.password === password);
  if (admin) {
    const user = { name: admin.name, role: 'admin', adminId: admin.id };
    sessionStorage.setItem('user', JSON.stringify(user));
    window.location.href = '/admin.html';
    return;
  }
  // Similar for parent and counselor...
};
```

**Onboarding Completion:**
```javascript
onComplete={(newUser) => {
  sessionStorage.setItem('user', JSON.stringify(newUser));
  window.location.href = '/parent.html'; // or '/counselor.html'
}}
```

---

### 2. admin.html - Admin Dashboard
**Contents:**
- All admin-specific tabs:
  - Dashboard (overview stats)
  - Admins (manage admin accounts)
  - Sessions (block/unblock camp dates)
  - Counselors (manage counselors, schedules, assignments)
  - Parents (view all parents, message them)
  - Children (all child profiles)
  - Campers (registered campers)
  - Registrations (manage camp registrations)
  - Assignments (drag-and-drop pod assignments)
  - Content (edit site content, photos)
  - Messages (inbox/outbox)
  - History (change log)
  - Danger Zone (bulk delete operations)
- ParentOnboarding component (for admin to add parents)
- CounselorOnboarding component (for admin to add counselors)
- All shared components and utilities

**Auth Check (runs on page load):**
```javascript
useEffect(() => {
  const userJson = sessionStorage.getItem('user');
  if (!userJson) {
    window.location.href = '/index.html';
    return;
  }
  const sessionUser = JSON.parse(userJson);
  if (sessionUser.role !== 'admin') {
    window.location.href = '/index.html';
    return;
  }
  if (!user) setUser(sessionUser);
}, []);
```

**Logout:**
```javascript
const handleLogout = () => {
  sessionStorage.removeItem('user');
  window.location.href = '/index.html';
};
```

---

### 3. parent.html - Parent Dashboard
**Contents:**
- Parent-specific tabs:
  - Dashboard (overview)
  - My Campers (manage children profiles, emergency contacts, view registration calendar)
  - Registrations (select dates, submit registrations)
  - Messages (view/reply to admin messages)
- Camp Schedule tab (visual schedule with counselors and pod mates)
- Children Manager component
- Emergency Contacts Manager component
- Registration Calendar View
- Camper Schedule Tab
- All shared components and utilities

**Auth Check:**
```javascript
useEffect(() => {
  const userJson = sessionStorage.getItem('user');
  if (!userJson) {
    window.location.href = '/index.html';
    return;
  }
  const sessionUser = JSON.parse(userJson);
  if (sessionUser.role !== 'parent') {
    window.location.href = '/index.html';
    return;
  }
  if (!user) setUser(sessionUser);
}, []);
```

---

### 4. counselor.html - Counselor Dashboard
**Contents:**
- Counselor-specific tabs:
  - Dashboard (availability management with month tabs)
  - My Schedule (view assigned sessions and pod campers - read-only)
- Availability calendar with quick actions by week
- All shared components and utilities

**Auth Check:**
```javascript
useEffect(() => {
  const userJson = sessionStorage.getItem('user');
  if (!userJson) {
    window.location.href = '/index.html';
    return;
  }
  const sessionUser = JSON.parse(userJson);
  if (sessionUser.role !== 'counselor') {
    window.location.href = '/index.html';
    return;
  }
  if (!user) setUser(sessionUser);
}, []);
```

---

## User Flow Examples

### New Parent Registration
1. User visits `index.html`
2. Clicks "Login" → "New? Create account with email →"
3. Selects "I'm a Parent" role
4. Completes ParentOnboarding wizard (5 steps)
5. On completion: User object stored in `sessionStorage`, redirected to `parent.html`
6. Parent dashboard loads with user from `sessionStorage`

### Admin Login
1. User visits `index.html`
2. Enters admin credentials
3. On success: Admin user stored in `sessionStorage`, redirected to `admin.html`
4. Admin dashboard loads with full administrative access

### Logout (from any dashboard)
1. User clicks "Logout" button
2. Handler removes user from `sessionStorage`
3. Redirects to `index.html`
4. If user tries to access dashboard HTML directly, auth check redirects to `index.html`

---

## Technical Implementation Details

### SessionStorage Schema
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  role: "parent" | "admin" | "counselor",
  // Additional fields depending on role...
}
```

### Shared Code Strategy
Each file contains its own copy of:
- Supabase configuration and client initialization
- All constants (CAMP_DATES, CAMP_WEEKS, etc.)
- All utility functions (formatPhone, calculateAge, etc.)
- All shared components (Toast, Modal, ImageCropper, etc.)
- All save/delete functions for database operations

**Why?** No build step, no imports - each file is completely self-contained and works independently via CDN-loaded React.

### Navigation Between Dashboards
Navigation happens via `window.location.href` rather than React router:
- Simpler implementation
- Natural page boundaries
- SessionStorage persists across page loads
- Each dashboard is truly independent

---

## File Structure Benefits

### For Parallel Development
- **index.html**: Front-end developer can work on public pages and login
- **admin.html**: Admin features developer works independently
- **parent.html**: Parent features developer works independently
- **counselor.html**: Counselor features developer works independently

### For Git Workflow
- Smaller diffs per file
- Reduced merge conflicts
- Easier code review
- Clear feature boundaries

### For Deployment
- All files deploy together
- No build step required
- Works on any static host
- Backwards compatible with existing Supabase database

---

## Important Notes

1. **No Build Step**: All files use React via CDN (`unpkg.com`). No npm, webpack, or bundler needed.

2. **SessionStorage**: User authentication persists only for the browser session. Closing the tab clears the session.

3. **Auth Checks**: Each dashboard file checks `sessionStorage` on load and redirects unauthorized users to `index.html`.

4. **Shared Components**: Code is duplicated across files. Changes to shared components need to be made in all 4 files. (Future: could extract to separate JS file loaded via script tag.)

5. **Database**: All files connect to the same Supabase instance with the same schema.

6. **URLs**: Use root-relative paths (`/admin.html`, `/parent.html`, etc.) to work correctly when deployed.

---

## Testing Checklist

- [ ] Login as admin → redirects to admin.html with full access
- [ ] Login as parent → redirects to parent.html with parent features
- [ ] Login as counselor → redirects to counselor.html with counselor features
- [ ] New parent registration → completes onboarding → redirects to parent.html
- [ ] New counselor registration → completes onboarding → redirects to counselor.html
- [ ] Logout from any dashboard → clears session → redirects to index.html
- [ ] Direct access to admin.html without auth → redirects to index.html
- [ ] Direct access to parent.html without auth → redirects to index.html
- [ ] Direct access to counselor.html without auth → redirects to index.html
- [ ] Role mismatch (parent tries admin.html) → redirects to index.html
- [ ] Public pages on index.html work without authentication
- [ ] All Supabase operations work from each dashboard

---

## Backup
Original monolithic file backed up as: `index-backup-v12.142.html`
