import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CompanyService } from '../../shared/company/company.service';
import { AuthService } from '../../shared/auth/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData, query, where, doc, docData } from '@angular/fire/firestore';
import { switchMap, map, of, take } from 'rxjs';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-company-gate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatIconModule],
  templateUrl: './company-gate.component.html',
  styleUrls: ['./company-gate.component.scss']
})
export class CompanyGateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly company = inject(CompanyService);
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  protected readonly companies = toSignal(this.company.getMyCompanies$(), { initialValue: [] as any[] });
  protected readonly invites = toSignal(this.company.getMyInvitations$(), { initialValue: [] as any[] });
  protected readonly creating = signal(false);
  protected readonly joining = signal(false);
  protected readonly inviteCompanies = signal<any[]>([]);

  // Load companies for invites when invites change
  constructor() {
    effect(() => {
      const invitesList = this.invites();
      if (invitesList.length > 0) {
        const companyIds = invitesList.map(i => i.companyId);
        console.log('Loading companies for invites:', companyIds);
        
        collectionData(
          query(
            collection(this.firestore, 'companies'), 
            where('__name__', 'in', companyIds)
          ), 
          { idField: 'id' }
        ).subscribe(companies => {
          console.log('Loaded invite companies:', companies);
          this.inviteCompanies.set(companies);
        });
      } else {
        this.inviteCompanies.set([]);
      }
    });
  }

  // Combine invites with company names
  protected readonly invitesWithCompanyNames = computed(() => {
    const invitesList = this.invites();
    const companiesList = this.companies();
    const inviteCompaniesList = this.inviteCompanies();
    
    console.log('Invites:', invitesList);
    console.log('My Companies:', companiesList);
    console.log('Invite Companies:', inviteCompaniesList);
    
    return invitesList.map(invite => {
      // First try to find in my companies
      let company = companiesList.find(c => c.id === invite.companyId);
      
      // If not found, try to find in invite companies
      if (!company) {
        company = inviteCompaniesList.find(c => c.id === invite.companyId);
      }
      
      console.log(`Looking for company ${invite.companyId}, found:`, company);
      
      return {
        ...invite,
        companyName: company?.name || `Company ID: ${invite.companyId}`
      };
    });
  });

  readonly createForm = this.fb.group({ name: ['', [Validators.required]] });
  readonly joinForm = this.fb.group({ name: ['', [Validators.required]] });

  async select(id: string) { this.company.setSelectedCompanyId(id); await this.router.navigateByUrl('/app/dashboard'); }
  async create() { if (this.createForm.invalid) return; await this.company.createCompany(this.createForm.getRawValue().name!); await this.router.navigateByUrl('/app/dashboard'); }
  async join() { if (this.joinForm.invalid) return; await this.company.joinCompanyByName(this.joinForm.getRawValue().name!); await this.router.navigateByUrl('/app/dashboard'); }

  async accept(inviteId: string) { await this.company.acceptInvitation(inviteId); await this.router.navigateByUrl('/app/dashboard'); }
  async decline(inviteId: string) { await this.company.declineInvitation(inviteId); }
  
  async logout(): Promise<void> {
    await this.auth.logout();
  }

  // Get company name for an invite
  async getCompanyName(companyId: string): Promise<string> {
    try {
      const companyDoc = await firstValueFrom(docData(doc(this.firestore, `companies/${companyId}`)));
      return companyDoc?.['name'] || 'Unknown Company';
    } catch (error) {
      console.error('Error getting company name:', error);
      return 'Unknown Company';
    }
  }
}