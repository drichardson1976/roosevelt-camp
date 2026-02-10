const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body);
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SITE_URL = process.env.SITE_URL || 'https://rhsbasketballdaycamp.com';
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Determine schema based on origin header
    const origin = event.headers.origin || event.headers.referer || '';
    const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
    const schema = isDev ? 'dev' : 'public';

    // Check if email exists in camp_parents or camp_counselor_users
    let userType = null;
    let userName = null;

    // Check parents
    const parentsRes = await fetch(`${SUPABASE_URL}/rest/v1/camp_parents?id=eq.main&select=data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': schema
      }
    });
    const parentsData = await parentsRes.json();
    if (parentsData?.[0]?.data) {
      const parent = parentsData[0].data.find(p => p.email?.toLowerCase() === email.toLowerCase());
      if (parent) {
        userType = 'parent';
        userName = parent.name || parent.email;
      }
    }

    // Check counselor users if not found in parents
    if (!userType) {
      const counselorsRes = await fetch(`${SUPABASE_URL}/rest/v1/camp_counselor_users?id=eq.main&select=data`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept-Profile': schema
        }
      });
      const counselorsData = await counselorsRes.json();
      if (counselorsData?.[0]?.data) {
        const counselor = counselorsData[0].data.find(c => c.email?.toLowerCase() === email.toLowerCase());
        if (counselor) {
          userType = 'counselor';
          userName = counselor.name || counselor.email;
        }
      }
    }

    // Always return success (prevents email enumeration)
    if (!userType) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token in Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/camp_password_reset_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': schema,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: token,
        data: { email: email.toLowerCase(), userType, expiresAt, used: false }
      })
    });

    // Build reset link (query param before hash so window.location.search picks it up)
    const resetLink = `${SITE_URL}/?reset=${token}#login`;

    // Send email via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Roosevelt Basketball Day Camp <campdirector@rhsbasketballdaycamp.com>',
        to: [email],
        subject: 'Password Reset Request',
        html: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;"><h2 style="color: #15803d;">Password Reset</h2><p>Hi ${userName},</p><p>We received a request to reset your password for Roosevelt Basketball Day Camp.</p><p><a href="${resetLink}" style="display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset My Password</a></p><p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p></div>`,
        reply_to: 'rhsdaycamp@gmail.com',
        headers: { 'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      }),
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
