# Developer Guide - Split File Architecture

## Quick Start

The Roosevelt Camp application has been split into 4 independent HTML files:

```
index.html          → Public website + Login (218KB)
admin.html          → Admin dashboard (529KB)
parent.html         → Parent dashboard (232KB)
counselor.html      → Counselor dashboard (154KB)
```

## Local Development

### Option 1: Python HTTP Server (Recommended)
```bash
cd /Users/derek/Documents/roosevelt-camp
python3 -m http.server 8000
```
Then open: `http://localhost:8000/index.html`

### Option 2: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

### Option 3: Node.js http-server
```bash
npx http-server -p 8000
```

## Working on Specific Features

### Public Pages (Home, Schedule, Pricing, Location, Counselors)
**File:** `index.html`
**Lines to edit:** 2941-3755 (Home, Schedule, Pricing, Location, Counselors pages)

**Example - Edit Home Page:**
```javascript
// Around line 2941 in index.html
const Home = () => (
  <div className="bg-white">
    {/* Hero section */}
    <div className="relative">
      {/* Edit hero content here */}
    </div>
  </div>
);
```

### Login & Authentication
**File:** `index.html`
**Lines to edit:** 3988-4147 (Login component)

**Example - Add Social Login:**
```javascript
// Around line 4110 in index.html
<button
  onClick={() => handleGoogleLogin()}
  className="w-full flex items-center justify-center gap-3 px-4 py-3..."
>
  Continue with Google
</button>
```

### Admin Features
**File:** `admin.html`
**Component locations:**
- Dashboard stats: ~line 7530
- Counselors tab: ~line 7700
- Parents tab: ~line 2000
- Assignments: ~line 4200
- Danger Zone: ~line 3000-5000

**Example - Add Admin Tab:**
```javascript
// Add to adminTab state checks around line 7600
{adminTab === 'mytab' && (
  <div>
    {/* Your new admin tab content */}
  </div>
)}
```

### Parent Features
**File:** `parent.html`
**Component locations:**
- Dashboard: ~line 3000
- My Campers tab: ~line 3200
- Registrations: ~line 3500
- Camp Schedule: End of file

### Counselor Features
**File:** `counselor.html`
**Component locations:**
- Availability calendar: ~line 2000
- My Schedule: ~line 2600

## Making Changes to Shared Components

**IMPORTANT:** Since there's no build step, shared components are duplicated across files.

### Shared Components Present in ALL Files:
- Toast (notification system)
- Modal (popup dialogs)
- ImageCropper (photo editing)
- ScrollableTabs (tabbed navigation)
- StableInput / StableTextarea (form inputs)
- CounselorEditForm

### Example - Update Toast Component

If you modify the Toast component, you MUST update it in ALL 4 files:

```javascript
// Search for "const Toast =" in each file
// Around line 2227 in each file
const Toast = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000); // Change timeout here
    return () => clearTimeout(t);
  }, []);
  return <div className={...}>{message}</div>;
};
```

**Files to update:**
1. `index.html` (line ~2227)
2. `admin.html` (line ~2227)
3. `parent.html` (line ~2227)
4. `counselor.html` (line ~2227)

**Helper command to find occurrences:**
```bash
grep -n "const Toast =" *.html
```

## Database Changes

All files use the same Supabase instance. Database operations are in the `storage` object:

```javascript
// Available in all files around line 625
const storage = {
  async get(table) { ... },
  async set(table, id, data) { ... }
};
```

### Adding a New Table

1. Update Supabase schema (via Supabase dashboard or SQL)
2. Add save function in each file that needs it:

```javascript
// Add in RooseveltCamp() function, around line 6000+
const saveMyNewTable = async (data, action = null) => {
  setMyNewTable(data);
  await storage.set('my_new_table', 'main', data);
  if (action) addToHistory('MyTable', action);
  showToast('Saved!');
};
```

3. Add useEffect to load data on startup:

```javascript
// In the main useEffect around line 5970
const load = async () => {
  // ... existing loads ...
  const mnt = await storage.get('my_new_table');
  if (mnt?.[0]?.data) setMyNewTable(mnt[0].data);
};
```

## Authentication Flow

### Adding a New User Role

1. **Update Login Handler** (`index.html`, line ~3997):
```javascript
const handleLogin = () => {
  // Add your role check
  const myRole = myRoles.find(r => r.email === email && r.password === password);
  if (myRole) {
    const user = { ...myRole, role: 'myrole' };
    sessionStorage.setItem('user', JSON.stringify(user));
    window.location.href = '/myrole.html';
    return;
  }
  // ... existing checks ...
};
```

2. **Create New Dashboard File** (`myrole.html`):
- Copy structure from `counselor.html` (simplest)
- Update auth check to verify `role === 'myrole'`
- Build your dashboard UI

3. **Update Nav Component** in new file:
```javascript
const Nav = () => {
  const handleLogout = () => {
    sessionStorage.removeItem('user');
    window.location.href = '/index.html';
  };
  // ... nav UI ...
};
```

## Common Patterns

### Adding a Modal

```javascript
// 1. Add state
const [showMyModal, setShowMyModal] = useState(false);

// 2. Add button to trigger
<button onClick={() => setShowMyModal(true)}>Open</button>

// 3. Add Modal component
{showMyModal && (
  <Modal
    isOpen={showMyModal}
    onClose={() => setShowMyModal(false)}
    title="My Modal"
  >
    <div>Modal content here</div>
  </Modal>
)}
```

### Adding a Toast Notification

```javascript
// showToast is available in all files
showToast('Operation successful!'); // Green success toast
showToast('Error occurred!', 'error'); // Red error toast
```

### Adding Form Validation

```javascript
const validateStep = () => {
  if (!name.trim()) {
    showToast('Name is required', 'error');
    return false;
  }
  if (!isValidPhone(phone)) {
    showToast('Valid phone number required', 'error');
    return false;
  }
  return true;
};
```

## Deployment

### Static Host (Netlify, Vercel, GitHub Pages)

1. All 4 HTML files MUST be in the root directory
2. Configure rewrites for clean URLs (optional):

**Netlify** (`netlify.toml`):
```toml
[[redirects]]
  from = "/admin"
  to = "/admin.html"
  status = 200

[[redirects]]
  from = "/parent"
  to = "/parent.html"
  status = 200

[[redirects]]
  from = "/counselor"
  to = "/counselor.html"
  status = 200
```

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/admin", "destination": "/admin.html" },
    { "source": "/parent", "destination": "/parent.html" },
    { "source": "/counselor", "destination": "/counselor.html" }
  ]
}
```

3. Set environment variables (if needed):
   - `SUPABASE_URL` (usually hardcoded)
   - `SUPABASE_ANON_KEY` (usually hardcoded)

4. Deploy all files together

## Testing

### Manual Test Checklist

```bash
# Test 1: Public pages work without login
✓ Home page loads
✓ Schedule page loads
✓ Pricing page loads
✓ Location page loads
✓ Counselors page loads

# Test 2: Login flow
✓ Admin login → redirects to /admin.html
✓ Parent login → redirects to /parent.html
✓ Counselor login → redirects to /counselor.html

# Test 3: Onboarding
✓ New parent registration → creates account → redirects to /parent.html
✓ New counselor registration → creates account → redirects to /counselor.html

# Test 4: Authorization
✓ Direct access to /admin.html without login → redirects to /index.html
✓ Parent accessing /admin.html → redirects to /index.html
✓ Counselor accessing /parent.html → redirects to /index.html

# Test 5: Logout
✓ Logout from admin → clears session → redirects to /index.html
✓ Logout from parent → clears session → redirects to /index.html
✓ Logout from counselor → clears session → redirects to /index.html

# Test 6: Data persistence
✓ Create registration in parent dashboard → appears in admin dashboard
✓ Admin updates counselor schedule → reflects in counselor dashboard
✓ Message from admin → appears in parent messages
```

## Troubleshooting

### Issue: Changes don't appear after refresh
**Solution:** Hard refresh with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Issue: Infinite redirect loop
**Cause:** Auth check fails, redirects to index, login succeeds, auth check fails again
**Solution:** Check `sessionStorage` schema matches expected format:
```javascript
// Browser console
JSON.parse(sessionStorage.getItem('user'))
// Should return: { name, email, role, ... }
```

### Issue: "user is not defined" error
**Cause:** User not loaded from sessionStorage before component renders
**Solution:** Add loading check:
```javascript
if (!user) return <div>Loading...</div>;
```

### Issue: Supabase operations fail
**Check:**
1. Network tab in DevTools for failed requests
2. Supabase URL and anon key are correct
3. Schema (`dev` vs `public`) matches environment
4. Database table exists and has correct structure

### Issue: Can't access admin dashboard after login
**Debug:**
```javascript
// In browser console after login:
console.log(sessionStorage.getItem('user'));
// Should show: {"name":"...","role":"admin",...}

// Check redirect happened:
console.log(window.location.href);
// Should be: http://localhost:8000/admin.html
```

## Best Practices

1. **Always test in all 4 files** if you modify shared components
2. **Use Git branches** for major features
3. **Commit often** with descriptive messages
4. **Test auth flows** after any login/redirect changes
5. **Clear sessionStorage** when testing auth: `sessionStorage.clear()`
6. **Use browser DevTools** → Application tab → Session Storage to inspect auth state
7. **Keep backups** before major refactoring

## File Size Considerations

The files are large but manageable:
- `admin.html` (529KB) - Largest due to all admin features
- `parent.html` (232KB) - Moderate size
- `index.html` (218KB) - Public pages
- `counselor.html` (154KB) - Smallest, simplest dashboard

If performance becomes an issue, consider:
1. Extracting large shared components to separate `.js` files
2. Using code splitting (would require build step)
3. Lazy loading heavy components
4. Minifying production builds

## Need Help?

- Check `SPLIT_IMPLEMENTATION.md` for architecture overview
- Review `index-backup-v12.142.html` for original monolithic version
- Search for examples: `grep -n "pattern" *.html`

---

**Remember:** There's no build step. Changes to HTML files are immediate. Refresh the browser to see changes.
