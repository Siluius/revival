import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyService } from './company.service';
import { AuthService } from '../auth/auth.service';
import { map } from 'rxjs';

export const companySelectedGuard: CanActivateFn = () => {
  const company = inject(CompanyService);
  const router = inject(Router);
  const auth = inject(AuthService);
  const id = company.selectedCompanyId();
  if (id) return true;
  return auth.isAuthenticated$.pipe(map(isAuthed => (isAuthed ? router.createUrlTree(['/company']) : router.createUrlTree(['/login']))));
};