exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { phone } = JSON.parse(event.body);
    if (!phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Phone number is required' }) };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    // Determine schema based on origin header
    const origin = event.headers.origin || event.headers.referer || '';
    const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
    const schema = isDev ? 'dev' : 'public';

    // Normalize input phone to digits only for comparison
    const normalizePhone = (p) => (p || '').replace(/\D/g, '').replace(/^1/, '');

    const inputDigits = normalizePhone(phone);
    if (inputDigits.length !== 10) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Please enter a valid 10-digit phone number.' }) };
    }

    // Look up parent by phone number
    const parentsRes = await fetch(`${SUPABASE_URL}/rest/v1/camp_parents?id=eq.main&select=data`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': schema
      }
    });
    const parentsData = await parentsRes.json();

    let foundUser = null;
    if (parentsData?.[0]?.data) {
      foundUser = parentsData[0].data.find(p => normalizePhone(p.phone) === inputDigits);
      if (foundUser) foundUser = { ...foundUser, userType: 'parent' };
    }

    // Check counselor users if not found in parents
    if (!foundUser) {
      const counselorsRes = await fetch(`${SUPABASE_URL}/rest/v1/camp_counselor_users?id=eq.main&select=data`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Accept-Profile': schema
        }
      });
      const counselorsData = await counselorsRes.json();
      if (counselorsData?.[0]?.data) {
        foundUser = counselorsData[0].data.find(c => normalizePhone(c.phone) === inputDigits);
        if (foundUser) foundUser = { ...foundUser, userType: 'counselor' };
      }
    }

    // Always return success to prevent phone enumeration
    if (!foundUser) {
      console.log(`Phone lookup: no user found for digits ${inputDigits} in schema ${schema}`);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    console.log(`Phone lookup: found ${foundUser.name} (${foundUser.userType}) in schema ${schema}`);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store code in Supabase (reuse password reset tokens table)
    const tokenId = `sms_${inputDigits}_${Date.now()}`;
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
        id: tokenId,
        data: {
          phone: inputDigits,
          code,
          email: foundUser.email,
          name: foundUser.name,
          userType: foundUser.userType,
          loginType: foundUser.password ? 'Email/Password' : 'No Password Set',
          expiresAt,
          used: false
        }
      })
    });

    // Send SMS via Twilio
    const toNumber = '+1' + inputDigits;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const smsRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toNumber,
        From: TWILIO_PHONE_NUMBER,
        Body: `Roosevelt Basketball Day Camp: Your verification code is ${code}. This code expires in 10 minutes.`
      }).toString()
    });

    const smsData = await smsRes.json();
    console.log(`Twilio response [${smsRes.status}]: SID=${smsData.sid}, status=${smsData.status}, from=${TWILIO_PHONE_NUMBER}, to=${toNumber}, error_code=${smsData.error_code}, error_message=${smsData.error_message}`);

    if (!smsRes.ok) {
      console.error('Twilio error details:', JSON.stringify(smsData));
      return { statusCode: 500, body: JSON.stringify({ error: `SMS failed: ${smsData.message || 'Could not send verification code. Please try again.'}` }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
