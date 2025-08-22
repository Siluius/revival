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
        path: 'events',
        loadComponent: () => import('./events/events.component').then(m => m.EventsComponent)
        // Example for editor-only routes when adding create/edit pages:
        // canActivate: [editorGuard]
      },
      {
        path: 'organizations',
        loadComponent: () => import('./organizations/organizations.component').then(m => m.OrganizationsComponent)
        // canActivate: [editorGuard]
      },
      {
        path: 'attendants',
        loadComponent: () => import('./attendants/attendants.component').then(m => m.AttendantsComponent)
        // canActivate: [editorGuard]
      },
      {
        path: 'attendants/:attendantId/payments',
        loadComponent: () => import('./attendants/attendants-payments.component').then(m => m.AttendantsPaymentsComponent)
        // canActivate: [editorGuard]
      },
      {
        path: 'activities',
        loadComponent: () => import('./activities/activities.component').then(m => m.ActivitiesComponent)
      }
    ]
  }
];

