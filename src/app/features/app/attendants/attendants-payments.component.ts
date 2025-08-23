import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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

@Component({
  selector: 'app-attendants-payments',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './attendants-payments.component.html'
})
export class AttendantsPaymentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentsService);
  private readonly events = inject(EventsService);
  private readonly dialog = inject(MatDialog);
  private readonly loading = inject(LoadingService);

  protected readonly attendantId = this.route.snapshot.paramMap.get('attendantId') as string;
  protected readonly eventsList = toSignal(this.events.getAll$(), { initialValue: [] as AppEvent[] });
  protected readonly paymentsList = toSignal(this.payments.getByAttendant$(this.attendantId), { initialValue: [] as Payment[] });

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