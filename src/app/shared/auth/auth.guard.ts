import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CompanyService } from '../company/company.service';
import { map, switchMap, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(map(isAuthed => (isAuthed ? true : router.createUrlTree(['/login']))));
};

export const anonymousOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(map(isAuthed => (isAuthed ? router.createUrlTree(['/company']) : true)));
};

export const editorGuard: CanActivateFn = () => {
  const company = inject(CompanyService);
  const router = inject(Router);
  
  return company.getMyCurrentCompanyRole$().pipe(
    map(role => {
      console.log('EditorGuard - Company role:', role);
      if (role === 'editor' || role === 'admin') {
        console.log('EditorGuard - Access granted');
        return true;
      } else {
        console.log('EditorGuard - Access denied, redirecting to company selection');
        return router.createUrlTree(['/company']);
      }
    })
  );
};

export const adminGuard: CanActivateFn = () => {
  const company = inject(CompanyService);
  const router = inject(Router);
  
  return company.getMyCurrentCompanyRole$().pipe(
    map(role => {
      console.log('AdminGuard - Company role:', role);
      if (role === 'admin') {
        console.log('AdminGuard - Access granted');
        return true;
      } else {
        console.log('AdminGuard - Access denied, redirecting to company selection');
        return router.createUrlTree(['/company']);
      }
    })
  );
};

export const viewerGuard: CanActivateFn = () => {
  const company = inject(CompanyService);
  const router = inject(Router);
  
  return company.getMyCurrentCompanyRole$().pipe(
    map(role => {
      console.log('ViewerGuard - Company role:', role);
      if (role === 'viewer' || role === 'editor' || role === 'admin') {
        console.log('ViewerGuard - Access granted');
        return true;
      } else {
        console.log('ViewerGuard - Access denied, redirecting to company selection');
        return router.createUrlTree(['/company']);
      }
    })
  );
};


