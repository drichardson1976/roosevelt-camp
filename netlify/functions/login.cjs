const bcrypt = require('bcryptjs');
const { checkRateLimit, getClientIp } = require('./utils/rate-limiter.cjs');
const { sanitizeString, isValidEmail } = require('./utils/validation.cjs');

const { getCorsHeaders, handlePreflight } = require('./utils/cors.cjs');
const { getSchema } = require('./utils/schema.cjs');
const { fetchTable: _fetchTable } = require('./utils/supabase.cjs');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  try {
    const parsed = JSON.parse(event.body);

    // Validate and sanitize inputs
    // Note: admins can log in with a username (not just email), so we don't require email format
    const email = sanitizeString(parsed.email, 254).toLowerCase();
    const password = typeof parsed.password === 'string' ? parsed.password : '';

    if (!email) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Email or username is required' }) };
    }
    if (!password) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Password is required' }) };
    }

    const { isDev, schema, SUPABASE_URL, SUPABASE_KEY } = getSchema(event);
    const fetchTable = (table) => _fetchTable(SUPABASE_URL, SUPABASE_KEY, schema, table);

    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(event);
    const rateCheck = await checkRateLimit({
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY,
      schema,
      key: `login:${ip}`,
      maxAttempts: 5,
      windowMs: 60 * 1000 // 1 minute
    });
    if (!rateCheck.allowed) {
      return { statusCode: 429, headers: getCorsHeaders(event), body: JSON.stringify({ error: rateCheck.message }) };
    }

    const lowerEmail = email;

    // 1. Check admins
    const admins = await fetchTable('camp_admins');
    const admin = admins.find(a => (a.username || a.email || '').toLowerCase() === lowerEmail);
    if (admin) {
      const match = admin.passwordHash
        ? await bcrypt.compare(password, admin.passwordHash)
        : (admin.password === password); // Legacy plaintext fallback
      if (match) {
        return {
          statusCode: 200,
          headers: getCorsHeaders(event),
          body: JSON.stringify({
            success: true,
            user: { name: admin.name, role: 'admin', adminId: admin.id, loginType: 'Email/Password' }
          })
        };
      }
    }

    // 2. Check parents
    const parents = await fetchTable('camp_parents');
    const parent = parents.find(p => (p.email || '').toLowerCase() === lowerEmail);
    if (parent && (parent.passwordHash || parent.password)) {
      const match = parent.passwordHash
        ? await bcrypt.compare(password, parent.passwordHash)
        : (parent.password === password); // Legacy plaintext fallback
      if (match) {
        // Track login method (fire-and-forget)
        const now = new Date().toISOString();
        const updatedParents = parents.map(p => {
          if ((p.email || '').toLowerCase() !== lowerEmail) return p;
          return { ...p, lastLoginMethod: 'Email/Password', lastLoginAt: now };
        });
        fetch(`${SUPABASE_URL}/rest/v1/camp_parents?id=eq.main`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Content-Profile': schema
          },
          body: JSON.stringify({ data: updatedParents })
        }).catch(() => {}); // fire-and-forget

        // Return user info (never send password or passwordHash to client)
        const { password: _pw, passwordHash: _ph, ...safeParent } = parent;
        return {
          statusCode: 200,
          headers: getCorsHeaders(event),
          body: JSON.stringify({
            success: true,
            user: { ...safeParent, role: 'parent', loginType: 'Email/Password' }
          })
        };
      }
    }

    // 3. Check counselor users
    const counselorUsers = await fetchTable('camp_counselor_users');
    const counselorUser = counselorUsers.find(cu => (cu.email || '').toLowerCase() === lowerEmail);
    if (counselorUser && (counselorUser.passwordHash || counselorUser.password)) {
      const match = counselorUser.passwordHash
        ? await bcrypt.compare(password, counselorUser.passwordHash)
        : (counselorUser.password === password); // Legacy plaintext fallback
      if (match) {
        // Track login method (fire-and-forget)
        const now = new Date().toISOString();
        const updatedCounselors = counselorUsers.map(cu => {
          if ((cu.email || '').toLowerCase() !== lowerEmail) return cu;
          return { ...cu, lastLoginMethod: 'Email/Password', lastLoginAt: now };
        });
        fetch(`${SUPABASE_URL}/rest/v1/camp_counselor_users?id=eq.main`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Content-Profile': schema
          },
          body: JSON.stringify({ data: updatedCounselors })
        }).catch(() => {}); // fire-and-forget

        // Return user info (never send password or passwordHash to client)
        const { password: _pw, passwordHash: _ph, ...safeCounselor } = counselorUser;
        return {
          statusCode: 200,
          headers: getCorsHeaders(event),
          body: JSON.stringify({
            success: true,
            user: { ...safeCounselor, role: 'counselor', loginType: 'Email/Password' }
          })
        };
      }
    }

    // No match found
    return {
      statusCode: 401,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ error: 'Incorrect email or password. Please try again.' })
    };
  } catch (error) {
    console.error('Login error:', error);
    return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Login service error. Please try again.' }) };
  }
};
