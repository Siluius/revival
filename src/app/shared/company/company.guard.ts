import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyService } from './company.service';
import { AuthService } from '../auth/auth.service';
import { map } from 'rxjs';

export const companySelectedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  
  // Simply check localStorage directly - more reliable
  const companyId = localStorage.getItem('companyId');
  
  console.log('CompanySelectedGuard - localStorage companyId:', companyId);
  
  if (companyId) {
    console.log('CompanySelectedGuard - Company found, allowing access');
    return true;
  }
  
  console.log('CompanySelectedGuard - No company found, redirecting to company selection');
  return auth.isAuthenticated$.pipe(map(isAuthed => (isAuthed ? router.createUrlTree(['/company']) : router.createUrlTree(['/login']))));
};