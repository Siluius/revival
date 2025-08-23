import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { IfAdminDirective } from '../../shared/auth/if-can-admin.directive';

@Component({
  selector: 'app-company-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, IfAdminDirective],
  templateUrl: './company-users.component.html'
})
export class CompanyUsersComponent {
  private readonly company = inject(CompanyService);
  protected readonly memberships = toSignal(this.company.getMembershipsForCurrentCompany$(), { initialValue: [] as any[] });
  protected readonly inviteEmail = signal('');

  async invite(): Promise<void> {
    const email = this.inviteEmail().trim();
    if (!email) return;
    await this.company.addUserToCurrentCompanyByEmail(email, 'viewer');
    this.inviteEmail.set('');
  }

  async changeRole(userId: string, role: 'viewer' | 'editor' | 'admin'): Promise<void> {
    await this.company.updateMembershipRole(userId, role);
  }
}