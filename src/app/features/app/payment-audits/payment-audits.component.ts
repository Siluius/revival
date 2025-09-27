import { Component, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PaymentAuditsDailyComponent } from './payment-audits-daily.component';
import { PaymentAuditsMonthlyComponent } from './payment-audits-monthly.component';
import { CompanyService } from '../../../shared/company/company.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-payment-audits',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatToolbarModule,
    PaymentAuditsDailyComponent,
    PaymentAuditsMonthlyComponent
  ],
  templateUrl: './payment-audits.component.html',
  styleUrls: ['./payment-audits.component.scss']
})
export class PaymentAuditsComponent {
  private readonly company = inject(CompanyService);
  
  @ViewChild(PaymentAuditsDailyComponent) dailyComponent!: PaymentAuditsDailyComponent;
  @ViewChild(PaymentAuditsMonthlyComponent) monthlyComponent!: PaymentAuditsMonthlyComponent;
  
  protected readonly selectedDate = signal<Date>(new Date());
  protected readonly selectedTab = signal<number>(0);
  protected readonly companyId = signal<string | null>(this.company.selectedCompanyId());

  protected readonly companyRole = toSignal(this.company.getMyCurrentCompanyRole$(), { initialValue: null });
  protected readonly canEdit = computed(() => {
    const role = this.companyRole();
    return role === 'editor' || role === 'admin';
  });

  protected get validSelectedDate(): Date {
    const date = this.selectedDate();
    return date && date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  }

  onDateChange(event: any): void {
    this.selectedDate.set(event.value);
  }

  goToToday(): void {
    this.selectedDate.set(new Date());
  }

  goToYesterday(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.selectedDate.set(yesterday);
  }

  exportToCSV(): void {
    if (!this.canEdit()) return;
    
    const date = this.selectedDate();
    const dateStr = date.toISOString().split('T')[0];
    const filename = `payment-audits-${dateStr}.csv`;
    
    // Get data from the current tab
    if (this.selectedTab() === 0) {
      // Daily report - we'll need to get data from the daily component
      this.exportDailyDataToCSV(filename);
    } else {
      // Monthly report - we'll need to get data from the monthly component
      this.exportMonthlyDataToCSV(filename);
    }
  }

  private exportDailyDataToCSV(filename: string): void {
    if (!this.dailyComponent) {
      console.error('Daily component not available');
      return;
    }

    const headers = ['Time', 'Attendant', 'Event', 'Amount (USD)', 'Original Amount', 'Original Currency', 'Recorded By'];
    const csvContent = headers.join(',') + '\n';
    
    // Get real data from daily component
    const auditRows = this.dailyComponent.getAuditRowsForExport();
    console.log('Exporting daily data:', auditRows);
    
    if (auditRows.length === 0) {
      const csvData = csvContent + 'No data available for this date\n';
      this.downloadCSV(csvData, filename);
      return;
    }
    
    const rows = auditRows.map(row => [
      row.time,
      row.attendantName,
      row.eventName,
      row.amountUSD.toFixed(2),
      row.originalAmount.toFixed(2),
      row.originalCurrency,
      row.recordedBy
    ]);
    
    const csvData = csvContent + rows.map(row => row.join(',')).join('\n') + '\n';
    this.downloadCSV(csvData, filename);
  }

  private exportMonthlyDataToCSV(filename: string): void {
    if (!this.monthlyComponent) {
      console.error('Monthly component not available');
      return;
    }

    const headers = ['Date', 'Total Payments', 'Total Amount (USD)', 'Total Amount (NIO)', 'Active Payments', 'Deleted Payments'];
    const csvContent = headers.join(',') + '\n';
    
    // Get real data from monthly component
    const monthlyData = this.monthlyComponent.getMonthlySummaryForExport();
    console.log('Exporting monthly data:', monthlyData);
    
    if (monthlyData.length === 0) {
      const csvData = csvContent + 'No data available for this month\n';
      this.downloadCSV(csvData, filename);
      return;
    }
    
    const rows = monthlyData.map(item => [
      item.date,
      item.paymentCount.toString(),
      item.totalUSD.toFixed(2),
      item.totalNIO.toFixed(2),
      item.activePayments.toString(),
      item.deletedPayments.toString()
    ]);
    
    const csvData = csvContent + rows.map(row => row.join(',')).join('\n') + '\n';
    this.downloadCSV(csvData, filename);
  }

  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onDateSelected(date: Date): void {
    this.selectedDate.set(date);
    this.selectedTab.set(0); // Switch to Daily Report tab
  }
}
