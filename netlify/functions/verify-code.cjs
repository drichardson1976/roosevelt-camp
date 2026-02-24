const { sanitizeString } = require('./utils/validation.cjs');

const { getCorsHeaders, handlePreflight } = require('./utils/cors.cjs');
const { getSchema } = require('./utils/schema.cjs');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

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

    const { isDev, schema, SUPABASE_URL, SUPABASE_KEY } = getSchema(event);



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
