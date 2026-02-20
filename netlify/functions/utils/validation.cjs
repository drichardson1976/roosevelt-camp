// Input validation and sanitization utilities

const sanitizeString = (str, maxLength = 500) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
};

const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isValidPhone = (phone) => {
  if (typeof phone !== 'string') return false;
  return phone.replace(/\D/g, '').length === 10;
};

module.exports = { sanitizeString, isValidEmail, isValidPhone };
