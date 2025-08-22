import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, switchMap, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(map(isAuthed => (isAuthed ? true : router.createUrlTree(['/login']))));
};

export const anonymousOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated$.pipe(map(isAuthed => (isAuthed ? router.createUrlTree(['/app/dashboard']) : true)));
};

export const editorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.authState$.pipe(
    switchMap(user => {
      if (!user) return of(router.createUrlTree(['/login']));
      return auth.getUserProfile$(user.uid) as any;
    }),
    map((profile: any) => {
      const role = (profile?.role as string) ?? 'viewer';
      return role === 'editor' || role === 'admin' ? true : router.createUrlTree(['/app/dashboard']);
    })
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.authState$.pipe(
    switchMap(user => {
      if (!user) return of(router.createUrlTree(['/login']));
      return auth.getUserProfile$(user.uid) as any;
    }),
    map((profile: any) => {
      const role = (profile?.role as string) ?? 'viewer';
      return role === 'admin' ? true : router.createUrlTree(['/app/dashboard']);
    })
  );
};


