import { Component, effect, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AttendantsService } from '../../../shared/attendants/attendants.service';
import { Attendant, PaymentStatus, Gender } from '../../../shared/attendants/attendants.interfaces';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';
import { AttendantFormDialogComponent } from './attendant-form-dialog.component';
import { FindByIdPipe } from '../../../shared/utils/find-by-id.pipe';
import { EventsService } from '../../../shared/events/events.service';
import { AppEvent } from '../../../shared/events/events.interfaces';
import { PaymentFormDialogComponent } from '../../payments/payment-form-dialog.component';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-attendants',
  standalone: true,
  imports: [CommonModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDialogModule, FindByIdPipe, AgGridModule],
  templateUrl: './attendants.component.html'
})
export class AttendantsComponent {
  private readonly service = inject(AttendantsService);
  private readonly orgService = inject(OrganizationsService);
  private readonly eventsService = inject(EventsService);
  private readonly dialog = inject(MatDialog);

  protected gridApi?: GridApi;

  protected readonly search = signal('');
  protected readonly paymentStatus = signal<PaymentStatus | 'all'>('all');
  protected readonly gender = signal<Gender | 'all'>('all');
  protected readonly organizationId = signal<string | 'all'>('all');
  protected readonly eventId = signal<string | 'all'>('all');

  protected readonly allAttendants = toSignal(this.service.getAll$(), { initialValue: [] as Attendant[] });
  protected readonly organizations = toSignal(this.orgService.getAll$(), { initialValue: [] as Organization[] });
  protected readonly events = toSignal(this.eventsService.getAll$(), { initialValue: [] as AppEvent[] });

  protected readonly rowData = computed(() => this.applyClientFiltersAndSort(this.allAttendants()));

  constructor() {
    effect(() => {
      if (!this.gridApi) return;
      this.gridApi.setGridOption('quickFilterText', this.search());
    });
  }

  protected readonly columnDefs: ColDef[] = [
    { field: 'firstName', headerName: 'First Name', sortable: true, filter: true, flex: 1 },
    { field: 'lastName', headerName: 'Last Name', sortable: true, filter: true, flex: 1 },
    { field: 'gender', headerName: 'Gender', sortable: true, filter: true, width: 120 },
    { headerName: 'Age', valueGetter: params => this.age(params.data) ?? '-', sortable: true, width: 100 },
    { headerName: 'Organization', valueGetter: params => (this.organizations().find(o => o.id === params.data.organizationId)?.name ?? '-'), sortable: true, filter: true, flex: 1 },
    { headerName: 'Payment', valueGetter: params => params.data.paymentStatus ?? 'unpaid', sortable: true, width: 120 },
    { headerName: 'Event Payments (USD)', valueGetter: params => this.eventId() !== 'all' ? (params.data.eventPayments?.[this.eventId()]?.totalUSD ?? 0) : this.overallTotalUSD(params.data), width: 160, sortable: true, valueFormatter: p => (Number(p.value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { headerName: 'Actions', cellRenderer: (params: ICellRendererParams) => {
        const e = document.createElement('div');
        e.style.display = 'flex'; e.style.gap = '8px';
        const editBtn = document.createElement('button'); editBtn.textContent = 'Edit'; editBtn.className = 'mat-mdc-button mat-primary'; editBtn.onclick = () => this.edit(params.data as Attendant);
        const payBtn = document.createElement('button'); payBtn.textContent = 'Add Payment'; payBtn.className = 'mat-mdc-outlined-button'; payBtn.onclick = () => this.addPayment(params.data as Attendant);
        const viewA = document.createElement('a'); viewA.textContent = 'View Payments'; viewA.className = 'mat-mdc-button'; viewA.onclick = () => (window.location.href = `/app/attendants/${(params.data as Attendant).id}/payments`);
        e.appendChild(editBtn); e.appendChild(payBtn); e.appendChild(viewA); return e;
      }, width: 280 }
  ];

  protected readonly gridOptions: GridOptions = {
    rowModelType: 'clientSide',
    pagination: true,
    paginationPageSize: 10,
    suppressCellFocus: true,
    animateRows: true,
    defaultColDef: { sortable: true, filter: true, resizable: true }
  } as GridOptions;

  onGridReady = (event: any) => {
    this.gridApi = event.api as GridApi;
    this.gridApi.setGridOption('quickFilterText', this.search());
  };

  private applyClientFiltersAndSort(rows: Attendant[]): Attendant[] {
    const term = this.search().toLowerCase().trim();
    const gender = this.gender();
    const payment = this.paymentStatus();
    const orgId = this.organizationId();
    const evtId = this.eventId();
    const filtered = rows.filter(a => {
      const matchesTerm = !term || `${a.firstName} ${a.lastName}`.toLowerCase().includes(term) || (a.address ?? '').toLowerCase().includes(term);
      const matchesGender = gender === 'all' || a.gender === gender;
      const matchesOrg = orgId === 'all' || a.organizationId === orgId;
      const effectiveStatus: PaymentStatus | null = evtId === 'all' ? (a.paymentStatus ?? null) : (a.eventPayments?.[evtId]?.status ?? null);
      const matchesPayment = payment === 'all' || effectiveStatus === payment;
      return matchesTerm && matchesGender && matchesPayment && matchesOrg;
    });
    return filtered.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  }

  overallTotalUSD(a: Attendant): number {
    const map = a.eventPayments || {};
    let total = 0;
    for (const key of Object.keys(map)) {
      const v = map[key];
      if (v && typeof v.totalUSD === 'number') total += v.totalUSD;
    }
    return total;
  }

  age(a: Attendant): number | null {
    const raw = (a as any)?.dateOfBirth;
    if (!raw) return null;
    const d: Date = raw instanceof Date ? raw : (typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw));
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
    return years;
  }

  add(): void { this.dialog.open(AttendantFormDialogComponent, { width: '640px' }); }
  edit(row: Attendant): void { this.dialog.open(AttendantFormDialogComponent, { width: '640px', data: row }); }
  addPayment(row: Attendant): void { this.dialog.open(PaymentFormDialogComponent, { width: '560px', data: { attendant: row } }); }
}
