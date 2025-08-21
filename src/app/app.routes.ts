import { Routes } from '@angular/router';
import { anonymousOnlyGuard } from './shared/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/app-layout.component').then(m => m.AppLayoutComponent),
    loadChildren: () => import('./features/app/app.routes').then(m => m.appFeatureRoutes)
  },
  { path: '**', redirectTo: 'login' }
];
