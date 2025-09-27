import { Component, inject, signal, computed } from '@angular/core';
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

  exportToPDF(): void {
    if (!this.canEdit()) return;
    // TODO: Implement PDF export using jsPDF
    console.log('Export to PDF for date:', this.selectedDate());
  }

  exportToExcel(): void {
    if (!this.canEdit()) return;
    // TODO: Implement Excel export using xlsx
    console.log('Export to Excel for date:', this.selectedDate());
  }

  onDateSelected(date: Date): void {
    this.selectedDate.set(date);
    this.selectedTab.set(0); // Switch to Daily Report tab
  }
}
