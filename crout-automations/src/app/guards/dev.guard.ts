import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const devGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (user && user.isDev) return true;
  if (!user) {
    router.navigate(['/']);
    return false;
  }
  return auth.refreshUser().pipe(
    map(refreshed => {
      if (refreshed?.isDev) return true;
      router.navigate(['/']);
      return false;
    })
  );
};
