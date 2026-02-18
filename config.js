// Shared configuration — loaded by all HTML files
// Single source of truth for Supabase connection, environment detection, and Google OAuth
// Uses var so globals are accessible from Babel-transpiled script blocks

var SUPABASE_URL = 'https://rdrtsebhninqgfbrleft.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcnRzZWJobmlucWdmYnJsZWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTcyMTMsImV4cCI6MjA4NTI3MzIxM30.l6gt5vvG1bXemZt9_BKSRy4kzbSatE4UIrV0a872QYw';
var GOOGLE_CLIENT_ID = '78231770788-mhpn5dblr8rhvrbupn0uhdni42ukobhc.apps.googleusercontent.com';

var getEnvironment = function() {
  var hostname = window.location.hostname;
  return (hostname.includes('dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('--dev') || hostname.includes('github.io')) ? 'development' : 'production';
};

var ENV = getEnvironment();
var SCHEMA = ENV === 'development' ? 'dev' : 'public';

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: SCHEMA },
  global: { headers: { 'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA } }
});

console.log('Roosevelt Camp - Environment:', ENV, '- Schema:', SCHEMA);
