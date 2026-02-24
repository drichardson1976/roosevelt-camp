const bcrypt = require('bcryptjs');
const { sanitizeString } = require('./utils/validation.cjs');

const { getCorsHeaders, handlePreflight } = require('./utils/cors.cjs');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

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
