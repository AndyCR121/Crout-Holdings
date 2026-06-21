import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad request - please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred - this item may already exist.',
  422: 'Validation failed - please check your input.',
  500: 'A server error occurred. Please try again shortly.',
  502: 'The server is temporarily unavailable.',
  503: 'Service unavailable. Please try again later.',
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message =
        err.error?.message ??
        err.error?.error ??
        STATUS_MESSAGES[err.status] ??
        `Unexpected error (${err.status})`;

      toast.error(message);

      if (err.status === 401) {
        auth.expireSession('/');
      }

      return throwError(() => err);
    })
  );
};
