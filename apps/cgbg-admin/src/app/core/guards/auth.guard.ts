import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  console.log('[AuthGuard] Checking route:', state.url);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    console.log('[AuthGuard] Authenticated. Allowing access.');
    return true;
  }

  // Redirect to login if not authenticated
  console.log('[AuthGuard] NOT authenticated. Redirecting to /login.');
  router.navigate(['/login']);
  return false;
};
