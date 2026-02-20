const bcrypt = require('bcryptjs');
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
    const { table, userData } = JSON.parse(event.body);

    // Validate inputs
    if (!table || !userData || !userData.email) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Only allow specific tables
    const allowedTables = ['camp_parents', 'camp_counselor_users', 'camp_admins'];
    if (!allowedTables.includes(table)) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Invalid table' }) };
    }

    // Validate and sanitize user data
    const emailValue = sanitizeString(userData.email, 254).toLowerCase();
    if (!isValidEmail(emailValue)) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'A valid email address is required' }) };
    }

    if (userData.password) {
      if (typeof userData.password !== 'string' || userData.password.length < 6) {
        return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
      }
    }

    if (!userData.name || typeof userData.name !== 'string' || !userData.name.trim()) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Name is required' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Determine schema based on origin header
    const origin = event.headers.origin || event.headers.referer || '';
    const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
    const schema = isDev ? 'dev' : 'public';

    // Sanitize user data before processing
    const processedUser = { ...userData };
    processedUser.email = emailValue;
    processedUser.name = sanitizeString(userData.name, 200);
    if (processedUser.password) {
      processedUser.passwordHash = await bcrypt.hash(processedUser.password, 10);
      delete processedUser.password; // Never store plaintext
    }

    // Fetch existing users
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.main&select=data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': schema
      }
    });
    const rows = await res.json();
    const existingUsers = rows?.[0]?.data || [];

    // Check if email already exists
    const lowerEmail = processedUser.email.toLowerCase();
    const exists = existingUsers.some(u => (u.email || '').toLowerCase() === lowerEmail);
    if (exists) {
      return { statusCode: 409, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'An account with this email already exists' }) };
    }

    // Add user to array
    const updatedUsers = [...existingUsers, processedUser];

    // Save back to Supabase
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': schema,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: 'main', data: updatedUsers })
    });

    if (!upsertRes.ok) {
      return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Failed to create account' }) };
    }

    // Return safe user info (no password data)
    const { passwordHash: _ph, ...safeUser } = processedUser;
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ success: true, user: safeUser })
    };
  } catch (error) {
    console.error('Signup error:', error);
    return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Signup service error. Please try again.' }) };
  }
};
