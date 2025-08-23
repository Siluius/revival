import { Routes } from '@angular/router';
import { anonymousOnlyGuard } from './shared/auth/auth.guard';
import { companySelectedGuard } from './shared/company/company.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
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
    path: 'company',
    loadComponent: () => import('./features/company/company-gate.component').then(m => m.CompanyGateComponent)
  },
  {
    path: 'app',
    canActivate: [companySelectedGuard],
    loadComponent: () => import('./layout/app-layout.component').then(m => m.AppLayoutComponent),
    loadChildren: () => import('./features/app/app.routes').then(m => m.appFeatureRoutes)
  },
  { path: '**', redirectTo: 'login' }
];
