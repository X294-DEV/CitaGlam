import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
  console.log('[GuestGuard] Checking route:', state.url);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    console.log('[GuestGuard] ALREADY authenticated. Redirecting to /admin/dashboard.');
    router.navigate(['/admin/dashboard']);
    return false;
  }

  console.log('[GuestGuard] Guest access allowed.');
  return true;
};
