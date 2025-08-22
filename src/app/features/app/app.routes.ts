import { Routes } from '@angular/router';
import { authGuard } from '../../shared/auth/auth.guard';

export const appFeatureRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'preferences',
        loadComponent: () => import('./preferences/preferences.component').then(m => m.PreferencesComponent)
      },
      {
        path: 'organizations',
        loadComponent: () => import('./organizations/organizations.component').then(m => m.OrganizationsComponent)
      },
      {
        path: 'attendants',
        loadComponent: () => import('./attendants/attendants.component').then(m => m.AttendantsComponent)
      },
      {
        path: 'attendants/:attendantId/payments',
        loadComponent: () => import('./attendants/attendants-payments.component').then(m => m.AttendantsPaymentsComponent)
      }
    ]
  }
];


