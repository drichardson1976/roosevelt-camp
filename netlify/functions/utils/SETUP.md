# Rate Limiting Setup

The rate limiter requires a `camp_rate_limits` table in Supabase.

Run this SQL in the Supabase SQL Editor for BOTH the `public` and `dev` schemas:

```sql
-- Public schema
CREATE TABLE IF NOT EXISTS public.camp_rate_limits (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'
);

-- Dev schema
CREATE TABLE IF NOT EXISTS dev.camp_rate_limits (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'
);
```

## How it works

- Each rate limit key gets its own row (e.g., `login:192.168.1.1`)
- The `data` column stores an array of attempt timestamps
- Old attempts outside the time window are cleaned up on each request
- If the rate limit check fails (table missing, network error), requests are allowed through (fail-open)

## Rate limits configured

| Endpoint | Limit | Window | Key format |
|----------|-------|--------|------------|
| Login | 5 attempts | 1 minute | `login:{ip}` |
| Password reset | 3 requests | 1 hour | `reset:{ip}` |
| SMS verification | 3 requests | 1 hour | `sms:{ip}` |
