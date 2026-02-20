const { sanitizeString } = require('./utils/validation.cjs');

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
    const phone = typeof parsed.phone === 'string' ? parsed.phone.trim() : '';
    const code = sanitizeString(parsed.code, 10);

    if (!phone) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Phone number is required' }) };
    }
    if (!code || !/^\d+$/.test(code)) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'A valid numeric verification code is required' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Determine schema based on origin header
    const origin = event.headers.origin || event.headers.referer || '';
    const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
    const schema = isDev ? 'dev' : 'public';

    // Normalize phone to digits
    const inputDigits = (phone || '').replace(/\D/g, '').replace(/^1/, '');

    // Fetch all verification tokens for this phone number
    // Tokens are prefixed with sms_{digits}_
    const tokensRes = await fetch(`${SUPABASE_URL}/rest/v1/camp_password_reset_tokens?id=like.sms_${inputDigits}_*&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': schema
      }
    });
    const tokens = await tokensRes.json();

    if (!tokens?.length) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'No verification code found. Please request a new code.' }) };
    }

    // Find a matching, unused, unexpired token
    const now = new Date();
    const validToken = tokens.find(t => {
      const d = t.data;
      return d.code === code && !d.used && new Date(d.expiresAt) > now;
    });

    if (!validToken) {
      // Check if code was correct but expired
      const expiredMatch = tokens.find(t => t.data.code === code && !t.data.used);
      if (expiredMatch) {
        return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'This code has expired. Please request a new one.' }) };
      }
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Invalid code. Please check and try again.' }) };
    }

    // Mark token as used
    await fetch(`${SUPABASE_URL}/rest/v1/camp_password_reset_tokens?id=eq.${validToken.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': schema
      },
      body: JSON.stringify({ data: { ...validToken.data, used: true } })
    });

    // Return the user's login info
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        success: true,
        email: validToken.data.email,
        name: validToken.data.name,
        loginType: validToken.data.loginType,
        userType: validToken.data.userType
      })
    };
  } catch (error) {
    return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: error.message }) };
  }
};
