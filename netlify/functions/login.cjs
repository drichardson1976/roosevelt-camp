const bcrypt = require('bcryptjs');
const { checkRateLimit, getClientIp } = require('./utils/rate-limiter.cjs');
const { sanitizeString, isValidEmail } = require('./utils/validation.cjs');

const ALLOWED_ORIGINS = [
  'https://rhsbasketballdaycamp.com',
  'https://www.rhsbasketballdaycamp.com',
  'http://localhost:8000',
  'http://localhost:8888',
  'http://localhost:3000',
  'http://127.0.0.1:8000',
];

function getCorsHeaders(event) {
  const origin = event?.headers?.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

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

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcnRzZWJobmlucWdmYnJsZWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTcyMTMsImV4cCI6MjA4NTI3MzIxM30.l6gt5vvG1bXemZt9_BKSRy4kzbSatE4UIrV0a872QYw';

    // Determine schema based on origin header
    const origin = event.headers.origin || event.headers.referer || '';
    const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
    const schema = isDev ? 'dev' : 'public';

    // Use anon key for dev (service role doesn't have dev schema access), service key for prod
    const SUPABASE_KEY = isDev ? SUPABASE_ANON_KEY : SUPABASE_SERVICE_KEY;

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

    // Helper to fetch a JSONB table
    const fetchTable = async (table) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.main&select=data`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept-Profile': schema
        }
      });
      const rows = await res.json();
      return rows?.[0]?.data || [];
    };

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
