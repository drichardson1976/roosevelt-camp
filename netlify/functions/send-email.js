const CAMP_EMAIL = 'rhsdaycamp@gmail.com';

// Send a delivery failure alert to the camp email (best-effort, never throws)
async function sendDeliveryAlert(originalTo, subject, errorDetails) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Roosevelt Basketball Day Camp <campdirector@rhsbasketballdaycamp.com>',
        to: [CAMP_EMAIL],
        subject: `⚠️ Email Delivery Failed: ${subject}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Email Delivery Failed</h2>
          <p>An email could not be delivered. Details below:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">To</td><td style="padding: 8px; border: 1px solid #ddd;">${Array.isArray(originalTo) ? originalTo.join(', ') : originalTo}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Subject</td><td style="padding: 8px; border: 1px solid #ddd;">${subject}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Error</td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">${errorDetails}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Time</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">This is an automated alert from the camp email system.</p>
        </div>`,
        reply_to: CAMP_EMAIL,
        headers: { 'X-Entity-Ref-ID': `alert-${Date.now()}` },
      }),
    });
  } catch (e) {
    console.error('Failed to send delivery alert:', e.message);
  }
}

// CORS headers — allows localhost and production to call this function
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { to, subject, html, replyTo, attachments } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !html) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing required fields: to, subject, html' }) };
    }

    // BCC the camp email on all outgoing emails (skip if camp email is already a recipient)
    const toList = Array.isArray(to) ? to : [to];
    const isCampRecipient = toList.some(addr => addr.toLowerCase() === CAMP_EMAIL.toLowerCase());
    const bcc = isCampRecipient ? undefined : [CAMP_EMAIL];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Roosevelt Basketball Day Camp <campdirector@rhsbasketballdaycamp.com>',
        to: toList,
        ...(bcc ? { bcc } : {}),
        subject,
        html,
        reply_to: replyTo || CAMP_EMAIL,
        headers: { 'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).slice(2)}` },
        ...(attachments ? { attachments } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Email delivery failed — alert the camp
      await sendDeliveryAlert(to, subject, JSON.stringify(data));
      return { statusCode: response.status, headers: CORS_HEADERS, body: JSON.stringify({ error: data }) };
    }

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, data }) };
  } catch (error) {
    // Unexpected error — alert the camp
    await sendDeliveryAlert('unknown', 'unknown', error.message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
