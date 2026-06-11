// Development environment
// The dev server proxy (proxy.conf.json) forwards /api/* to this origin,
// so relative /api/* calls work. Set apiUrl to your local API origin if
// you need direct (non-proxied) calls instead.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
