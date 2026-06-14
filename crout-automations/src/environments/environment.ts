// Development environment
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  // Public key is safe to expose — it's designed to be client-side.
  // Secret key lives ONLY in the backend docker env as PAYSTACK_SECRET_KEY.
  paystackPublicKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};
