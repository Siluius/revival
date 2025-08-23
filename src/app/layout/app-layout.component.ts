import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../shared/auth/auth.service';
import { ThemeService } from '../shared/theme/theme.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { CompanyService } from '../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, MatToolbarModule, MatButtonModule, MatListModule, MatIconModule, MatButtonToggleModule, MatSelectModule],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly companies = inject(CompanyService);
  protected readonly loggingOut = signal(false);
  protected readonly theme = this.themeService.theme;
  protected readonly collapsed = signal(false);

  protected readonly companyId = this.companies.selectedCompanyId;
  protected readonly myCompanies = toSignal(this.companies.getMyCompanies$(), { initialValue: [] as any[] });

  toggleSidenav(): void { this.collapsed.set(!this.collapsed()); }
  setTheme(value: 'theme-light' | 'theme-dark'): void { this.themeService.set(value); }
  setCompany(value: string): void { this.companies.setSelectedCompanyId(value); }

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.auth.logout().finally(() => this.loggingOut.set(false));
  }
}


