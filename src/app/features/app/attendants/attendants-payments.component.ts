import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { PaymentsService } from '../../../shared/payments/payments.service';
import { Payment } from '../../../shared/payments/payments.interfaces';
import { EventsService } from '../../../shared/events/events.service';
import { AppEvent } from '../../../shared/events/events.interfaces';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PaymentFormDialogComponent } from '../../payments/payment-form-dialog.component';
import { LoadingService } from '../../../shared/loading/loading.service';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridOptions, ICellRendererParams, ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-attendants-payments',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, AgGridModule],
  templateUrl: './attendants-payments.component.html'
})
export class AttendantsPaymentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentsService);
  private readonly events = inject(EventsService);
  private readonly dialog = inject(MatDialog);
  private readonly loading = inject(LoadingService);

  protected gridApi?: GridApi;
  protected readonly theme = themeQuartz;

  protected readonly attendantId = this.route.snapshot.paramMap.get('attendantId') as string;
  protected readonly eventsList = toSignal(this.events.getAll$(), { initialValue: [] as AppEvent[] });
  protected readonly paymentsList = toSignal(this.payments.getByAttendant$(this.attendantId), { initialValue: [] as Payment[] });

  protected readonly rowData = this.paymentsList;

  protected readonly columnDefs: ColDef[] = [
    { field: 'createdAt', headerName: 'Date', valueFormatter: p => {
        const v: any = p.value; const d = (v?.toDate?.() ?? v) as Date | undefined; return d ? new Date(d).toLocaleString() : '';
      }, sort: 'desc', comparator: (a: any, b: any) => new Date(a).getTime() - new Date(b).getTime(), width: 180 },
    { headerName: 'Event', valueGetter: p => this.eventName(p.data.eventId), flex: 1 },
    { field: 'amountUSD', headerName: 'Amount (USD)', filter: 'agNumberColumnFilter', valueFormatter: p => (p.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), width: 160 },
    { headerName: 'Original', valueGetter: p => {
        const c = p.data.originalCurrency; const a = p.data.originalAmount; if (!c) return '-';
        return c === 'NIO' ? `${a} NIO` : `${(a ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
      } },
    { headerName: 'Actions', cellRenderer: (params: ICellRendererParams) => {
        const container = document.createElement('div');
        const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.className = 'mat-mdc-button'; edit.onclick = () => this.editPayment(params.data as Payment);
        const del = document.createElement('button'); del.textContent = 'Delete'; del.className = 'mat-mdc-button'; del.onclick = () => this.deletePayment(params.data as Payment);
        container.appendChild(edit); container.appendChild(del); return container;
      }, width: 200 }
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

  eventName(eventId: string): string { return this.eventsList().find(e => e.id === eventId)?.name ?? '-'; }

  addPayment(): void {
    const id = this.attendantId; if (!id) return;
    this.dialog.open(PaymentFormDialogComponent, { width: '560px', data: { attendant: { id, firstName: '', lastName: '' } } });
  }

  editPayment(row: Payment): void {
    const id = this.attendantId; if (!id) return;
    this.dialog.open(PaymentFormDialogComponent, { width: '560px', data: { attendant: { id, firstName: '', lastName: '' }, paymentId: row.id } });
  }

  async deletePayment(row: Payment): Promise<void> {
    await this.loading.wrap(async () => { await this.payments.delete(row.id); });
  }
}