/**
 * Rate limiter for Netlify functions using Supabase as state store.
 *
 * Uses the camp_rate_limits table (one row per key) to track attempts.
 * Each key is like "login:192.168.1.1" or "reset:user@example.com".
 *
 * Table must exist in both dev and public schemas:
 *   CREATE TABLE camp_rate_limits (
 *     id TEXT PRIMARY KEY,
 *     data JSONB DEFAULT '{}'
 *   );
 */

async function checkRateLimit({ supabaseUrl, supabaseKey, schema, key, maxAttempts, windowMs }) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Fetch current attempts for this key
    const res = await fetch(`${supabaseUrl}/rest/v1/camp_rate_limits?id=eq.${encodeURIComponent(key)}&select=data`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept-Profile': schema
      }
    });

    let attempts = [];
    let exists = false;

    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0 && rows[0].data) {
        exists = true;
        // Filter to only attempts within the current window
        attempts = (rows[0].data.attempts || []).filter(t => t > windowStart);
      }
    }

    // Check if over limit
    if (attempts.length >= maxAttempts) {
      const oldestInWindow = Math.min(...attempts);
      const retryAfterMs = oldestInWindow + windowMs - now;
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec,
        message: `Too many attempts. Please try again in ${retryAfterSec > 60 ? Math.ceil(retryAfterSec / 60) + ' minutes' : retryAfterSec + ' seconds'}.`
      };
    }

    // Record this attempt
    const updatedAttempts = [...attempts, now];
    const body = JSON.stringify({ id: key, data: { attempts: updatedAttempts } });

    if (exists) {
      await fetch(`${supabaseUrl}/rest/v1/camp_rate_limits?id=eq.${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Content-Profile': schema
        },
        body: JSON.stringify({ data: { attempts: updatedAttempts } })
      });
    } else {
      await fetch(`${supabaseUrl}/rest/v1/camp_rate_limits`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Content-Profile': schema,
          'Prefer': 'resolution=merge-duplicates'
        },
        body
      });
    }

    return {
      allowed: true,
      remaining: maxAttempts - updatedAttempts.length,
      retryAfterSec: 0
    };
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    // Better to let a request through than block legitimate users
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: maxAttempts, retryAfterSec: 0 };
  }
}

function getClientIp(event) {
  return event.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers['x-real-ip']
    || event.headers['client-ip']
    || 'unknown';
}

module.exports = { checkRateLimit, getClientIp };
