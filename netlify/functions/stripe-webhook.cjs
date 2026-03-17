const { getSchema } = require('./utils/schema.cjs');
const { fetchTable, upsertRow } = require('./utils/supabase.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Verify the webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle payment_intent.succeeded
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object;
      const { orderKey, parentEmail } = paymentIntent.metadata;

      if (orderKey) {
        // Determine schema from metadata or default to public (webhooks come from Stripe, not browser)
        const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rdrtsebhninqgfbrleft.supabase.co';
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const schema = 'public'; // Webhooks are for production payments

        // Fetch registrations and update matching ones
        const registrations = await fetchTable(SUPABASE_URL, SUPABASE_KEY, schema, 'camp_registrations');
        if (Array.isArray(registrations)) {
          const updated = registrations.map(reg => {
            if ((reg.orderId === orderKey || reg.id === orderKey) && reg.parentEmail === parentEmail) {
              return {
                ...reg,
                status: 'approved',
                paymentStatus: 'paid',
                paymentMethod: 'credit_card',
                paymentConfirmedAt: new Date().toISOString(),
                stripePaymentIntentId: paymentIntent.id
              };
            }
            return reg;
          });
          await upsertRow(SUPABASE_URL, SUPABASE_KEY, schema, 'camp_registrations', 'main', updated);
          console.log(`Webhook: Marked order ${orderKey} as paid via credit card`);
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Webhook handler error:', err);
    return { statusCode: 500, body: 'Webhook handler failed' };
  }
};
