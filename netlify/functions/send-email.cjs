const { sanitizeString, isValidEmail } = require('./utils/validation.cjs');

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

// CORS — dynamic origin check for localhost + production
const { getCorsHeaders, handlePreflight } = require('./utils/cors.cjs');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  try {
    const parsed = JSON.parse(event.body);

    // Validate required fields
    if (!parsed.to || !parsed.subject || !parsed.html) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Missing required fields: to, subject, html' }) };
    }

    // Validate and sanitize inputs
    const toList = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
    for (const addr of toList) {
      if (!isValidEmail(addr)) {
        return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: `Invalid email address: ${sanitizeString(addr, 100)}` }) };
      }
    }

    const subject = sanitizeString(parsed.subject, 500);
    if (!subject) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Subject is required' }) };
    }

    // HTML body is allowed to contain tags (it's email HTML), so only trim and limit length
    const html = typeof parsed.html === 'string' ? parsed.html.trim().slice(0, 50000) : '';
    if (!html) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Email body (html) is required' }) };
    }

    const replyTo = parsed.replyTo;
    const attachments = parsed.attachments;

    // BCC the camp email on all outgoing emails (skip if camp email is already a recipient)
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
      await sendDeliveryAlert(toList, subject, JSON.stringify(data));
      return { statusCode: response.status, headers: getCorsHeaders(event), body: JSON.stringify({ error: data }) };
    }

    return { statusCode: 200, headers: getCorsHeaders(event), body: JSON.stringify({ success: true, data }) };
  } catch (error) {
    // Unexpected error — alert the camp
    await sendDeliveryAlert('unknown', 'unknown', error.message);
    return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: error.message }) };
  }
};
