const ALLOWED_ORIGINS = [
  'https://rhsbasketballdaycamp.com',
  'https://www.rhsbasketballdaycamp.com',
  'http://localhost:8000',
  'http://localhost:8888',
  'http://localhost:3000',
  'http://127.0.0.1:8000',
];

function getCorsHeaders(event) {
  const origin = event?.headers?.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function handlePreflight(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  return null;
}

module.exports = { ALLOWED_ORIGINS, getCorsHeaders, handlePreflight };
