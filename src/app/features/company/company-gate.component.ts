import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { CompanyService } from '../../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company-gate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule],
  templateUrl: './company-gate.component.html'
})
export class CompanyGateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly company = inject(CompanyService);
  private readonly router = inject(Router);

  protected readonly companies = toSignal(this.company.getMyCompanies$(), { initialValue: [] as any[] });
  protected readonly invites = toSignal(this.company.getMyInvitations$(), { initialValue: [] as any[] });
  protected readonly creating = signal(false);
  protected readonly joining = signal(false);

  readonly createForm = this.fb.group({ name: ['', [Validators.required]] });
  readonly joinForm = this.fb.group({ name: ['', [Validators.required]] });

  async select(id: string) { this.company.setSelectedCompanyId(id); await this.router.navigateByUrl('/app/dashboard'); }
  async create() { if (this.createForm.invalid) return; await this.company.createCompany(this.createForm.getRawValue().name!); await this.router.navigateByUrl('/app/dashboard'); }
  async join() { if (this.joinForm.invalid) return; await this.company.joinCompanyByName(this.joinForm.getRawValue().name!); await this.router.navigateByUrl('/app/dashboard'); }

  async accept(inviteId: string) { await this.company.acceptInvitation(inviteId); await this.router.navigateByUrl('/app/dashboard'); }
  async decline(inviteId: string) { await this.company.declineInvitation(inviteId); }
}