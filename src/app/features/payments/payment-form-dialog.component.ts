import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { PaymentsService } from '../../shared/payments/payments.service';
import { EventsService } from '../../shared/events/events.service';
import { AppEvent } from '../../shared/events/events.interfaces';
import { toSignal } from '@angular/core/rxjs-interop';

interface PaymentDialogData { attendant: { id: string; firstName: string; lastName: string }; paymentId?: string; }

@Component({
  selector: 'app-payment-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],
  templateUrl: './payment-form-dialog.component.html'
})
export class PaymentFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PaymentsService);
  private readonly eventsService = inject(EventsService);
  private readonly dialogRef = inject(MatDialogRef<PaymentFormDialogComponent>);
  protected readonly data = inject<PaymentDialogData>(MAT_DIALOG_DATA);

  protected readonly events = toSignal(this.eventsService.getAll$(), { initialValue: [] as AppEvent[] });

  protected readonly form = this.fb.group({
    eventId: ['', [Validators.required]],
    currency: ['USD' as 'USD' | 'NIO', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]]
  });

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    await this.service.create({
      attendantId: this.data.attendant.id,
      eventId: value.eventId!,
      currency: value.currency!,
      amount: Number(value.amount)
    });
    this.dialogRef.close(true);
  }
}