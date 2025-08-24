import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { IfAdminDirective } from '../../shared/auth/if-can-admin.directive';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Firestore, doc, docData } from '@angular/fire/firestore';

interface MembershipRow { userId: string; role: 'viewer' | 'editor' | 'admin'; email?: string | null; name?: string | null; }

@Component({
  selector: 'app-company-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, IfAdminDirective, MatSortModule, MatPaginatorModule],
  templateUrl: './company-users.component.html'
})
export class CompanyUsersComponent {
  private readonly company = inject(CompanyService);
  private readonly firestore = inject(Firestore);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  protected readonly memberships = toSignal(this.company.getMembershipsForCurrentCompany$(), { initialValue: [] as any[] });
  protected readonly inviteEmail = signal('');
  protected readonly sortState = signal<Sort>({ active: 'email', direction: 'asc' });

  protected readonly rows = toSignal(this.mapRows(), { initialValue: [] as MembershipRow[] });

  private mapRows() {
    return docData(doc(this.firestore, '__noop__/__noop__')).pipe() as any;
  }

  get data(): MembershipRow[] {
    const base = (this.memberships() || []) as Array<{ userId: string; role: any; email?: string | null; name?: string | null }>;
    const withFields: MembershipRow[] = base.map(m => ({ userId: m.userId, role: m.role, email: (m as any).email ?? null, name: (m as any).name ?? null }));
    const s = this.sortState();
    const sorted = [...withFields].sort((a, b) => {
      const dir = s.direction === 'desc' ? -1 : 1;
      const pick = (row: MembershipRow) => (s.active === 'userId' ? row.userId : s.active === 'role' ? row.role : s.active === 'name' ? (row.name ?? '') : (row.email ?? ''));
      return String(pick(a)).localeCompare(String(pick(b))) * dir;
    });
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? sorted.length;
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }

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