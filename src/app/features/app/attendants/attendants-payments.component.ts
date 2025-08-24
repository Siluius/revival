import { Component, inject, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
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
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-attendants-payments',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatSortModule, MatPaginatorModule],
  templateUrl: './attendants-payments.component.html'
})
export class AttendantsPaymentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentsService);
  private readonly events = inject(EventsService);
  private readonly dialog = inject(MatDialog);
  private readonly loading = inject(LoadingService);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  protected readonly attendantId = this.route.snapshot.paramMap.get('attendantId') as string;
  protected readonly eventsList = toSignal(this.events.getAll$(), { initialValue: [] as AppEvent[] });
  protected readonly paymentsList = toSignal(this.payments.getByAttendant$(this.attendantId), { initialValue: [] as Payment[] });

  protected readonly sortState = signal<Sort>({ active: 'date', direction: 'desc' });

  protected get data(): Payment[] {
    const list = this.paymentsList();
    const s: Sort = this.sortState();
    const sorted = [...list].sort((a, b) => {
      const dir = s.direction === 'desc' ? -1 : 1;
      const av = ((): any => {
        switch (s.active) {
          case 'date': return (a.createdAt as any) ?? 0;
          case 'event': return this.eventName(a.eventId);
          case 'amountUSD': return a.amountUSD;
          default: return (a.createdAt as any) ?? 0;
        }
      })();
      const bv = ((): any => {
        switch (s.active) {
          case 'date': return (b.createdAt as any) ?? 0;
          case 'event': return this.eventName(b.eventId);
          case 'amountUSD': return b.amountUSD;
          default: return (b.createdAt as any) ?? 0;
        }
      })();
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? sorted.length;
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }

  protected readonly displayedColumns = ['date', 'event', 'amountUSD', 'original', 'actions'] as const;

  eventName(eventId: string): string {
    return this.eventsList().find(e => e.id === eventId)?.name ?? '-';
  }

  addPayment(): void {
    const id = this.attendantId; if (!id) return;
    this.dialog.open(PaymentFormDialogComponent, { width: '560px', data: { attendant: { id, firstName: '', lastName: '' } } });
  }

  editPayment(row: Payment): void {
    const id = this.attendantId; if (!id) return;
    this.dialog.open(PaymentFormDialogComponent, { width: '560px', data: { attendant: { id, firstName: '', lastName: '' }, paymentId: row.id } });
  }

  async deletePayment(row: Payment): Promise<void> {
    await this.loading.wrap(async () => {
      await this.payments.delete(row.id);
    });
  }
}