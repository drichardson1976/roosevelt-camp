const { getCorsHeaders, handlePreflight } = require('./utils/cors.cjs');
const { getSchema } = require('./utils/schema.cjs');

exports.handler = async (event) => {
  const preflight = handlePreflight(event);
  if (preflight) return preflight;

  try {
    // Auto-detect environment: localhost → test keys, production → live keys
    const { isDev } = getSchema(event);
    const secretKey = isDev
      ? (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY)
      : process.env.STRIPE_SECRET_KEY;
    const publishableKey = isDev
      ? (process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY)
      : process.env.STRIPE_PUBLISHABLE_KEY;

    if (!secretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return {
        statusCode: 500,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Stripe is not configured. Please contact the camp director.' })
      };
    }
    const stripe = require('stripe')(secretKey);
    const { amount, orderKey, venmoCode, parentEmail, parentName } = JSON.parse(event.body);

    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        headers: getCorsHeaders(event),
        body: JSON.stringify({ error: 'Invalid amount' })
      };
    }

    // Create a PaymentIntent with order metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // amount in cents
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        orderKey: orderKey || '',
        venmoCode: venmoCode || '',
        parentEmail: parentEmail || '',
        parentName: parentName || ''
      }
    });

    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        publishableKey
      })
    };
  } catch (err) {
    console.error('Create payment intent error:', err.message, err.type || '');
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({ error: err.message || 'Failed to create payment' })
    };
  }
};
