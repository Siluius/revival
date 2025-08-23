import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CompanyService } from './company.service';

export const companySelectedGuard: CanActivateFn = () => {
  const company = inject(CompanyService);
  const router = inject(Router);
  const id = company.selectedCompanyId();
  return id ? true : router.createUrlTree(['/company']);
};