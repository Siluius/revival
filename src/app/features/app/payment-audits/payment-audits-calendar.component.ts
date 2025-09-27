import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { PaymentsService } from '../../../shared/payments/payments.service';
import { CompanyService } from '../../../shared/company/company.service';
import { Payment } from '../../../shared/payments/payments.interfaces';

interface PaymentDate {
  date: Date;
  totalUSD: number;
  totalNIO: number;
  paymentCount: number;
}

@Component({
  selector: 'app-payment-audits-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatToolbarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './payment-audits-calendar.component.html',
  styleUrls: ['./payment-audits-calendar.component.scss']
})
export class PaymentAuditsCalendarComponent implements OnInit {
  private readonly paymentsService = inject(PaymentsService);
  private readonly companyService = inject(CompanyService);

  protected readonly loading = signal<boolean>(true);
  protected readonly currentMonth = signal<Date>(new Date());
  protected readonly selectedDate = signal<Date | null>(null);
  protected readonly paymentDates = signal<PaymentDate[]>([]);

  protected readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly calendarDays = computed(() => {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayData = this.paymentDates().find(d => 
        d.date.toDateString() === currentDate.toDateString()
      );
      
      days.push({
        date: new Date(currentDate),
        hasPayments: !!dayData,
        totalUSD: dayData?.totalUSD || 0,
        totalNIO: dayData?.totalNIO || 0,
        isSelected: this.selectedDate()?.toDateString() === currentDate.toDateString(),
        isToday: currentDate.toDateString() === new Date().toDateString()
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  });

  ngOnInit(): void {
    this.loadPaymentDates();
  }

  private async loadPaymentDates(): Promise<void> {
    this.loading.set(true);
    
    try {
      const startOfMonth = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), 1);
      const endOfMonth = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth() + 1, 0);
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

      // Build payment dates
      const paymentDates: PaymentDate[] = Array.from(dailyGroups.entries()).map(([date, dayPayments]) => {
        const totalUSD = dayPayments.reduce((sum, p) => sum + p.amountUSD, 0);
        const totalNIO = dayPayments
          .filter(p => p.originalCurrency === 'NIO')
          .reduce((sum, p) => sum + (p.originalAmount || 0), 0);
        
        return {
          date: new Date(date),
          totalUSD,
          totalNIO,
          paymentCount: dayPayments.length
        };
      });

      this.paymentDates.set(paymentDates);
    } catch (error) {
      console.error('Error loading payment dates:', error);
    } finally {
      this.loading.set(false);
    }
  }

  previousMonth(): void {
    const newMonth = new Date(this.currentMonth());
    newMonth.setMonth(newMonth.getMonth() - 1);
    this.currentMonth.set(newMonth);
    this.loadPaymentDates();
  }

  nextMonth(): void {
    const newMonth = new Date(this.currentMonth());
    newMonth.setMonth(newMonth.getMonth() + 1);
    this.currentMonth.set(newMonth);
    this.loadPaymentDates();
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
    // TODO: Emit event to parent component
  }

  refreshData(): void {
    this.loadPaymentDates();
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