exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { token, newPassword } = JSON.parse(event.body);
    if (!token || !newPassword) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Token and new password are required' }) };
    }

    if (newPassword.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Determine schema based on origin header
    const origin = event.headers.origin || event.headers.referer || '';
    const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
    const schema = isDev ? 'dev' : 'public';

    // Look up token
    const tokenRes = await fetch(`${SUPABASE_URL}/rest/v1/camp_password_reset_tokens?id=eq.${token}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': schema
      }
    });
    const tokenRows = await tokenRes.json();

    if (!tokenRows?.length || !tokenRows[0]?.data) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or expired reset link. Please request a new one.' }) };
    }

    const tokenData = tokenRows[0].data;

    // Check if token is already used
    if (tokenData.used) {
      return { statusCode: 400, body: JSON.stringify({ error: 'This reset link has already been used. Please request a new one.' }) };
    }

    // Check if token is expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'This reset link has expired. Please request a new one.' }) };
    }

    const { email, userType } = tokenData;
    const table = userType === 'parent' ? 'camp_parents' : 'camp_counselor_users';

    // Fetch current user data
    const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.main&select=data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': schema
      }
    });
    const usersData = await usersRes.json();

    if (!usersData?.[0]?.data) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not find user data' }) };
    }

    // Update password in the JSONB array
    const users = usersData[0].data;
    let found = null;
    const updatedUsers = users.map(u => {
      if (u.email?.toLowerCase() === email.toLowerCase()) {
        found = { ...u, password: newPassword };
        return found;
      }
      return u;
    });

    if (!found) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User account not found' }) };
    }

    const { userType } = tokenData;

    // Save updated users back to Supabase
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.main`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': schema
      },
      body: JSON.stringify({ data: updatedUsers })
    });

    if (!updateRes.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update password' }) };
    }

    // Mark token as used
    await fetch(`${SUPABASE_URL}/rest/v1/camp_password_reset_tokens?id=eq.${token}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': schema
      },
      body: JSON.stringify({ data: { ...tokenData, used: true } })
    });

    // Return user info so client can auto-login
    return { statusCode: 200, body: JSON.stringify({
      success: true,
      user: { email: found.email, name: found.name, role: userType, roles: found.roles || [userType] }
    }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
