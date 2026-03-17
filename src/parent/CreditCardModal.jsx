import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Inner form component — handles the actual Stripe Payment Element
const CheckoutForm = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required'
    });

    if (result.error) {
      setError(result.error.message);
      setPaying(false);
    } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
      onSuccess(result.paymentIntent.id);
    } else {
      setError('Payment was not completed. Please try again.');
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs', paymentMethodOrder: ['card'] }} />
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="space-y-2 mt-6">
        <button
          type="submit"
          disabled={!stripe || paying}
          className="w-full font-bold py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {paying ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="w-full bg-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Main modal component — handles PaymentIntent creation and wraps form in Elements
const CreditCardModal = ({ orderKey, regs, totalAmount, venmoCode, title, parentEmail, parentName, onSuccess, onClose }) => {
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/.netlify/functions/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(totalAmount * 100), // Convert dollars to cents
            orderKey,
            venmoCode,
            parentEmail,
            parentName
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to initialize payment');
        }

        const { clientSecret: secret, publishableKey } = await res.json();
        setClientSecret(secret);
        setStripePromise(loadStripe(publishableKey));
        setLoading(false);
      } catch (err) {
        console.error('Payment init error:', err);
        setError(err.message || 'Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSuccess = (paymentIntentId) => {
    onSuccess(paymentIntentId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-xl">Pay with Credit Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-4">
          <div className="font-bold text-gray-800 mb-2">{title}</div>
          {regs && (() => {
            const byCamper = {};
            regs.forEach(r => {
              const name = r.childName || r.camperName || 'Unknown';
              if (!byCamper[name]) byCamper[name] = [];
              byCamper[name].push(r);
            });
            return Object.entries(byCamper).map(([name, camperRegs]) => {
              const sorted = camperRegs.sort((a, b) => new Date(a.date) - new Date(b.date));
              const sessions = sorted.flatMap(r => r.sessions || []);
              const hasAM = sessions.includes('morning');
              const hasPM = sessions.includes('afternoon');
              const sessionLabel = hasAM && hasPM ? 'AM + PM' : hasAM ? 'AM only' : 'PM only';
              const dates = sorted.map(r => r.date);
              const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const dateRange = dates.length === 1 ? fmt(dates[0]) : `${fmt(dates[0])} - ${fmt(dates[dates.length - 1])}`;
              return (
                <div key={name} className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{name}</span> — {dateRange} — {dates.length} day{dates.length > 1 ? 's' : ''} — {sessionLabel}
                </div>
              );
            });
          })()}
          <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between">
            <span className="font-bold text-gray-800">Total</span>
            <span className="font-bold text-gray-800 text-lg">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Form */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-green-600 mb-3"></div>
            <p className="text-gray-500">Initializing secure payment...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
          </div>
        )}

        {!loading && !error && clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm
              amount={Math.round(totalAmount * 100)}
              onSuccess={handleSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          Payments processed securely by Stripe. Your card details are never stored on our servers.
        </p>
      </div>
    </div>
  );
};

export default CreditCardModal;
