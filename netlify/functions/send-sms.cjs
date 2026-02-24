const { sanitizeString, isValidPhone } = require('./utils/validation.cjs');

const { getCorsHeaders, handlePreflight } = require('./utils/cors.cjs');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  try {
    const parsed = JSON.parse(event.body);

    // Validate and sanitize inputs
    const to = typeof parsed.to === 'string' ? parsed.to.trim() : '';
    const smsBody = sanitizeString(parsed.body, 1600);

    if (!to || !isValidPhone(to)) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'A valid 10-digit phone number is required' }) };
    }
    if (!smsBody) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Message body is required' }) };
    }

    const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

    if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
      return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Twilio not configured' }) };
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
        Body: smsBody
      }).toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, headers: getCorsHeaders(event), body: JSON.stringify({ error: data.message || data }) };
    }

    return { statusCode: 200, headers: getCorsHeaders(event), body: JSON.stringify({ success: true, sid: data.sid }) };
  } catch (error) {
    return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: error.message }) };
  }
};
