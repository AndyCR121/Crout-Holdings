// Development environment
// API calls go to /api/* which ng serve proxies to https://api.automations.crout-holdings.com
// This keeps everything same-origin so cookies (ca_jwt) work without the Secure flag.
export const environment = {
  production: false,
  apiUrl: '/api',
};
