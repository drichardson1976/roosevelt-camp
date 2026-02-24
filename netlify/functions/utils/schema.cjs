const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcnRzZWJobmlucWdmYnJsZWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTcyMTMsImV4cCI6MjA4NTI3MzIxM30.l6gt5vvG1bXemZt9_BKSRy4kzbSatE4UIrV0a872QYw';

function getSchema(event) {
  const origin = event.headers.origin || event.headers.referer || '';
  const isDev = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('github.io');
  const schema = isDev ? 'dev' : 'public';
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_KEY = isDev ? SUPABASE_ANON_KEY : SUPABASE_SERVICE_KEY;
  return { isDev, schema, SUPABASE_URL, SUPABASE_KEY };
}

module.exports = { getSchema, SUPABASE_ANON_KEY };
