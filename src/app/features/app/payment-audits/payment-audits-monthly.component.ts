import { Component, Input, inject, signal, computed, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { Payment } from '../../../shared/payments/payments.interfaces';
import { PaymentsService } from '../../../shared/payments/payments.service';
import { CompanyService } from '../../../shared/company/company.service';

interface MonthlySummary {
  date: string;
  originalDate: Date;
  totalUSD: number;
  totalNIO: number;
  paymentCount: number;
  activePayments: number;
  deletedPayments: number;
}

@Component({
  selector: 'app-payment-audits-monthly',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './payment-audits-monthly.component.html',
  styleUrls: ['./payment-audits-monthly.component.scss']
})
export class PaymentAuditsMonthlyComponent implements OnInit, OnChanges {
  @Input() selectedDate: Date = new Date();
  @Input() companyId: string | null = null;
  @Output() dateSelected = new EventEmitter<Date>();

  private readonly paymentsService = inject(PaymentsService);
  private readonly companyService = inject(CompanyService);

  protected readonly loading = signal<boolean>(true);
  protected readonly monthlySummary = signal<MonthlySummary[]>([]);

  protected readonly monthlyTotalUSD = computed(() => {
    return this.monthlySummary().reduce((sum, day) => sum + day.totalUSD, 0);
  });

  protected readonly monthlyTotalNIO = computed(() => {
    return this.monthlySummary().reduce((sum, day) => sum + day.totalNIO, 0);
  });

  protected readonly monthlyTotalPayments = computed(() => {
    return this.monthlySummary().reduce((sum, day) => sum + day.activePayments, 0);
  });

  ngOnInit(): void {
    this.loadMonthlyData();
  }

  ngOnChanges(): void {
    this.loadMonthlyData();
  }

  private async loadMonthlyData(): Promise<void> {
    this.loading.set(true);
    
    try {
      const startOfMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
      const endOfMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Get all payments for the month
      const payments = await this.paymentsService.getPaymentsByDateRange(startOfMonth, endOfMonth);
      
      // Group by date
      const dailyGroups = new Map<string, Payment[]>();
      
      payments.forEach(payment => {
        const date = this.formatFirestoreTimestamp(payment.createdAt);
        if (!dailyGroups.has(date)) {
          dailyGroups.set(date, []);
        }
        dailyGroups.get(date)!.push(payment);
      });

      // Build monthly summary
      const summary: MonthlySummary[] = Array.from(dailyGroups.entries()).map(([date, dayPayments]) => {
        const totalUSD = dayPayments.reduce((sum, p) => sum + p.amountUSD, 0);
        const totalNIO = dayPayments
          .filter(p => p.originalCurrency === 'NIO')
          .reduce((sum, p) => sum + (p.originalAmount || 0), 0);
        
        const originalDate = new Date(date);
        return {
          date: originalDate.toLocaleDateString(),
          originalDate: originalDate,
          totalUSD,
          totalNIO,
          paymentCount: dayPayments.length,
          activePayments: dayPayments.length, // TODO: Implement deleted payments tracking
          deletedPayments: 0
        };
      });

      // Sort by date
      summary.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      this.monthlySummary.set(summary);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  refreshData(): void {
    this.loadMonthlyData();
  }

  getFormattedDate(): string {
    if (!this.selectedDate || !(this.selectedDate instanceof Date) || isNaN(this.selectedDate.getTime())) {
      return 'Loading...';
    }
    return this.selectedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  viewDayDetails(row: MonthlySummary): void {
    this.dateSelected.emit(row.originalDate);
  }

  // Public method to get monthly summary for export
  getMonthlySummaryForExport(): MonthlySummary[] {
    return this.monthlySummary();
  }

  private formatFirestoreTimestamp(timestamp: any): string {
    try {
      // Handle Firestore timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toDateString();
      }
      // Handle regular Date object
      if (timestamp instanceof Date) {
        return timestamp.toDateString();
      }
      // Handle string or number timestamp
      if (timestamp) {
        return new Date(timestamp).toDateString();
      }
      return '';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  }
}
