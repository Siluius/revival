import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { IfAdminDirective } from '../../shared/auth/if-can-admin.directive';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, ICellRendererParams, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface MembershipRow { userId: string; role: 'viewer' | 'editor' | 'admin'; email?: string | null; name?: string | null; }

@Component({
  selector: 'app-company-users',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, IfAdminDirective, AgGridModule],
  templateUrl: './company-users.component.html'
})
export class CompanyUsersComponent {
  private readonly company = inject(CompanyService);
  private readonly firestore = inject(Firestore);

  protected gridApi?: GridApi;
  protected readonly theme = themeQuartz;

  protected readonly memberships = toSignal(this.company.getMembershipsForCurrentCompany$(), { initialValue: [] as any[] });
  protected readonly inviteEmail = signal('');

  protected readonly rows = toSignal(
    this.company.getMembershipsForCurrentCompany$().pipe(
      switchMap((ms: any[]) => {
        if (!ms || ms.length === 0) return of([] as MembershipRow[]);
        const streams = ms.map(m =>
          docData(doc(this.firestore, `users/${m.userId}`)).pipe(
            map((u: any) => ({ userId: m.userId, role: m.role, email: u?.email ?? null, name: u?.displayName ?? null }))
          )
        );
        return combineLatest(streams);
      })
    ),
    { initialValue: [] as MembershipRow[] }
  );

  protected readonly isAdmin = toSignal(
    this.company.selectedCompanyId()
      ? this.company.getMyMembership$(this.company.selectedCompanyId() as string).pipe(map(m => (m?.role === 'admin')))
      : of(false),
    { initialValue: false }
  );

  protected readonly columnDefs: ColDef[] = [
    { field: 'email', headerName: 'Email', flex: 1, filter: true, sortable: true },
    { field: 'name', headerName: 'Name', flex: 1, filter: true, sortable: true },
    { field: 'userId', headerName: 'User ID', flex: 1, filter: true, sortable: true },
    { field: 'role', headerName: 'Role', width: 180, sortable: true, filter: true,
      cellRenderer: (params: ICellRendererParams) => {
        if (!this.isAdmin()) {
          const span = document.createElement('span'); span.textContent = params.value ?? '-'; return span;
        }
        const container = document.createElement('div');
        const select = document.createElement('select');
        select.className = 'ag-cell-edit-select';
        ['viewer','editor','admin'].forEach(r => {
          const opt = document.createElement('option'); opt.value = r; opt.textContent = r.charAt(0).toUpperCase() + r.slice(1); if (params.value === r) opt.selected = true; select.appendChild(opt);
        });
        select.onchange = () => this.changeRole((params.data as MembershipRow).userId, select.value as any);
        container.appendChild(select);
        return container;
      }
    }
  ];

  protected readonly gridOptions: GridOptions = {
    rowModelType: 'clientSide',
    theme: themeQuartz,
    pagination: true,
    paginationPageSize: 10,
    suppressCellFocus: true,
    animateRows: true,
    defaultColDef: { sortable: true, filter: true, resizable: true }
  } as GridOptions;

  onGridReady(event: any) { this.gridApi = event.api as GridApi; }

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