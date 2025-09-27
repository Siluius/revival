import { Routes } from '@angular/router';
import { authGuard, editorGuard, adminGuard } from '../../shared/auth/auth.guard';

export const appFeatureRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'preferences', loadComponent: () => import('./preferences/preferences.component').then(m => m.PreferencesComponent) },
  { path: 'events', loadComponent: () => import('./events/events.component').then(m => m.EventsComponent) },
  { path: 'organizations', loadComponent: () => import('./organizations/organizations.component').then(m => m.OrganizationsComponent) },
  { path: 'attendants', loadComponent: () => import('./attendants/attendants.component').then(m => m.AttendantsComponent) },
  { path: 'attendants/:attendantId/payments', loadComponent: () => import('./attendants/attendants-payments.component').then(m => m.AttendantsPaymentsComponent) },
  { path: 'activities', loadComponent: () => import('./activities/activities.component').then(m => m.ActivitiesComponent) },
  { path: 'payment-audits', loadComponent: () => import('./payment-audits/payment-audits.component').then(m => m.PaymentAuditsComponent) },
  { path: 'company-users', canActivate: [adminGuard], loadComponent: () => import('../company/company-users.component').then(m => m.CompanyUsersComponent) }
];

