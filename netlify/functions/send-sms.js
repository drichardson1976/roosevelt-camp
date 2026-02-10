exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { to, body } = JSON.parse(event.body);

    if (!to || !body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: to, body' }) };
    }

    const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Twilio not configured' }) };
    }

    // Normalize phone number to E.164 format (+1XXXXXXXXXX)
    let normalized = to.replace(/[\s\-\(\)\.]/g, '');
    if (normalized.length === 10) normalized = '+1' + normalized;
    else if (normalized.length === 11 && normalized.startsWith('1')) normalized = '+' + normalized;
    else if (!normalized.startsWith('+')) normalized = '+' + normalized;

    // Send SMS via Twilio REST API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: normalized,
        From: FROM_NUMBER,
        Body: body
      }).toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.message || data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, sid: data.sid }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
