import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../shared/auth/auth.service';
import { AppUserProfile } from '../shared/auth/auth.interfaces';
import { ThemeService } from '../shared/theme/theme.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompanyService } from '../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { IfAdminDirective } from '../shared/auth/if-can-admin.directive';
import { LoadingService } from '../shared/loading/loading.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, MatToolbarModule, MatButtonModule, MatListModule, MatIconModule, MatMenuModule, MatDividerModule, MatTooltipModule, IfAdminDirective],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly companies = inject(CompanyService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);
  protected readonly loggingOut = signal(false);
  protected readonly theme = this.themeService.theme;
  protected readonly collapsed = signal(false);

  protected readonly companyId = this.companies.selectedCompanyId;
  protected readonly myCompanies = toSignal(this.companies.getMyCompanies$(), { initialValue: [] as any[] });
  protected readonly loading = this.loadingService.active;
  protected readonly user = toSignal(this.auth.authState$, { initialValue: null });
  private readonly userProfile = toSignal(
    this.auth.authState$.pipe(
      switchMap(user => user ? this.auth.getUserProfile$(user.uid) : of(null))
    ), 
    { initialValue: null as AppUserProfile | null }
  );

  toggleSidenav(): void { this.collapsed.set(!this.collapsed()); }
  setTheme(value: 'theme-light' | 'theme-dark'): void { this.themeService.set(value); }
  setCompany(value: string): void { this.companies.setSelectedCompanyId(value); }
  
  getCurrentThemeText(): string {
    return this.theme() === 'theme-dark' ? 'Dark' : 'Light';
  }

  getUserDisplayName(): string {
    const profile = this.userProfile();
    const user = this.user();
    
    // Priorizar el displayName del perfil (que se actualiza desde Firestore)
    if (profile?.displayName) {
      return profile.displayName;
    }
    
    // Fallback al displayName del usuario de auth
    if (user?.displayName) {
      return user.displayName;
    }
    
    // Fallback al email
    return user?.email || 'User';
  }

  goToPreferences(): void {
    this.router.navigate(['/app/preferences']);
  }

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.auth.logout()
      .then(() => {
        console.log('Logout successful');
      })
      .catch((error) => {
        console.error('Logout failed:', error);
      })
      .finally(() => {
        this.loggingOut.set(false);
      });
  }
}


