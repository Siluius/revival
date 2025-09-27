import { Component, Input, inject, signal, computed, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { Payment } from '../../../shared/payments/payments.interfaces';
import { PaymentsService } from '../../../shared/payments/payments.service';
import { CompanyService } from '../../../shared/company/company.service';
import { EventsService } from '../../../shared/events/events.service';
import { AttendantsService } from '../../../shared/attendants/attendants.service';
import { AppEvent } from '../../../shared/events/events.interfaces';
import { Attendant } from '../../../shared/attendants/attendants.interfaces';

interface PaymentAuditRow {
  id: string;
  time: string;
  attendantName: string;
  eventName: string;
  originalAmount: number;
  originalCurrency: string;
  amountUSD: number;
  recordedBy: string;
  status: 'active' | 'deleted';
}

@Component({
  selector: 'app-payment-audits-daily',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatToolbarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './payment-audits-daily.component.html',
  styleUrls: ['./payment-audits-daily.component.scss']
})
export class PaymentAuditsDailyComponent implements OnInit, OnChanges {
  @Input() selectedDate: Date = new Date();
  @Input() companyId: string | null = null;

  private readonly paymentsService = inject(PaymentsService);
  private readonly companyService = inject(CompanyService);
  private readonly eventsService = inject(EventsService);
  private readonly attendantsService = inject(AttendantsService);

  protected readonly loading = signal<boolean>(true);
  protected readonly auditRows = signal<PaymentAuditRow[]>([]);

  protected readonly totalUSD = computed(() => {
    return this.auditRows().reduce((sum, row) => {
      return sum + (row.status === 'active' ? row.amountUSD : -row.amountUSD);
    }, 0);
  });

  protected readonly totalNIO = computed(() => {
    return this.auditRows().reduce((sum, row) => {
      if (row.originalCurrency === 'NIO') {
        return sum + (row.status === 'active' ? row.originalAmount : -row.originalAmount);
      }
      return sum;
    }, 0);
  });

  protected readonly totalPayments = computed(() => {
    return this.auditRows().filter(row => row.status === 'active').length;
  });

  ngOnInit(): void {
    this.loadDailyData();
  }

  ngOnChanges(): void {
    this.loadDailyData();
  }

  private async loadDailyData(): Promise<void> {
    this.loading.set(true);
    
    try {
      const startOfDay = new Date(this.selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(this.selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all payments for the selected date
      const payments = await this.paymentsService.getPaymentsByDateRange(startOfDay, endOfDay);
      console.log('Payments found:', payments.length);
      console.log('Payments data:', payments.map(p => ({ id: p.id, attendantId: p.attendantId, eventId: p.eventId })));
      
      // Get events and attendants for display (filtered by company)
      const events = await this.eventsService.getAll$().pipe(take(1)).toPromise() || [];
      const attendants = await this.attendantsService.getAll$().pipe(take(1)).toPromise() || [];
      console.log('Attendants found:', attendants.length);
      console.log('Attendants data:', attendants.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })));

      // Build audit rows
      const rows: PaymentAuditRow[] = payments.map(payment => {
        const event = events.find(e => e.id === payment.eventId);
        const attendant = attendants.find(a => a.id === payment.attendantId);
        
        // Debug logging
        if (!attendant) {
          console.warn('Attendant not found for payment:', {
            paymentId: payment.id,
            attendantId: payment.attendantId,
            availableAttendants: attendants.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))
          });
        }
        
        return {
          id: payment.id,
          time: payment.createdAt ? this.formatFirestoreTimestamp(payment.createdAt) : '',
          attendantName: attendant ? `${attendant.firstName} ${attendant.lastName}` : `Unknown (ID: ${payment.attendantId})`,
          eventName: event?.name || 'Unknown Event',
          originalAmount: payment.originalAmount || payment.amountUSD,
          originalCurrency: payment.originalCurrency || 'USD',
          amountUSD: payment.amountUSD,
          recordedBy: payment.recordedBy || 'System',
          status: 'active'
        };
      });

      this.auditRows.set(rows);
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  refreshData(): void {
    this.loadDailyData();
  }


  getFormattedDate(): string {
    if (!this.selectedDate || !(this.selectedDate instanceof Date) || isNaN(this.selectedDate.getTime())) {
      return 'Loading...';
    }
    return this.selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Public method to get audit rows for export
  getAuditRowsForExport(): PaymentAuditRow[] {
    return this.auditRows();
  }

  private formatFirestoreTimestamp(timestamp: any): string {
    try {
      // Handle Firestore timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleTimeString();
      }
      // Handle regular Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString();
      }
      // Handle string or number timestamp
      if (timestamp) {
        return new Date(timestamp).toLocaleTimeString();
      }
      return '';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  }
}
