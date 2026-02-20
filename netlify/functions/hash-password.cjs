const bcrypt = require('bcryptjs');
const { sanitizeString } = require('./utils/validation.cjs');

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: getCorsHeaders(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const parsed = JSON.parse(event.body);
    const password = typeof parsed.password === 'string' ? parsed.password : '';

    if (!password) {
      return { statusCode: 400, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Password is required and must be a string' }) };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ passwordHash })
    };
  } catch (error) {
    return { statusCode: 500, headers: getCorsHeaders(event), body: JSON.stringify({ error: 'Hashing failed' }) };
  }
};
