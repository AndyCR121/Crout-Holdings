import { HttpInterceptorFn } from '@angular/common/http';

/** Reads the JWT stored as a client-readable cookie (ca_jwt) and attaches
 *  it as an Authorization: Bearer header on every outbound API request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const match = document.cookie.match(/(?:^|;\s*)ca_jwt=([^;]*)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
