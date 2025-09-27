import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import type { User } from '@angular/fire/auth';
import { AuthService } from '../../../shared/auth/auth.service';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { CompanyService } from '../../../shared/company/company.service';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly company = inject(CompanyService);
  protected readonly displayName = signal<string | null>('');

  protected readonly eventsCount = toSignal(collectionData(
    query(collection(this.firestore, 'events'), 
      ...(this.company.selectedCompanyId() ? [where('companyId', '==', this.company.selectedCompanyId())] : [])
    )
  ).pipe(), { initialValue: [] as any[] });
  
  protected readonly attendantsCount = toSignal(collectionData(
    query(collection(this.firestore, 'attendants'), 
      ...(this.company.selectedCompanyId() ? [where('companyId', '==', this.company.selectedCompanyId())] : [])
    )
  ).pipe(), { initialValue: [] as any[] });
  
  protected readonly paymentsCount = toSignal(collectionData(collection(this.firestore, 'payments')).pipe(), { initialValue: [] as any[] });

  @ViewChild('chart', { static: false }) chartEl?: ElementRef<HTMLDivElement>;
  @ViewChild('tshirtChart', { static: false }) tshirtChartEl?: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private tshirtChart?: Highcharts.Chart;
  
  protected chartOptions: Highcharts.Options = {
    chart: { type: 'pie' },
    title: { text: 'Attendants by Status per Event' },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: { enabled: true, format: '{point.name}: {point.y}' }
      }
    },
    series: []
  };

  protected tshirtChartOptions: Highcharts.Options = {
    chart: { type: 'column' },
    title: { text: 'T-Shirt Size Distribution' },
    xAxis: {
      categories: ['18', 'S', 'M', 'L', 'XL'],
      title: { text: 'T-Shirt Size' }
    },
    yAxis: {
      title: { text: 'Number of Attendants' },
      allowDecimals: false
    },
    plotOptions: {
      column: {
        dataLabels: { enabled: true }
      }
    },
    series: []
  };

  protected statusTableRows: Array<{ event: string; unpaid: number; partial: number; paid: number }> = [];

  constructor() {
    this.auth.authState$.subscribe((user: User | null) => this.displayName.set(user?.displayName ?? user?.email ?? null));

    const companyId = this.company.selectedCompanyId();
    const eventsQuery = companyId ? 
      query(collection(this.firestore, 'events'), where('companyId', '==', companyId)) : 
      collection(this.firestore, 'events');
    const attendantsQuery = companyId ? 
      query(collection(this.firestore, 'attendants'), where('companyId', '==', companyId)) : 
      collection(this.firestore, 'attendants');
      
    collectionData(eventsQuery, { idField: 'id' }).subscribe((events: any[]) => {
      const categories: string[] = events.map(e => e.name);
      const eventIds: string[] = events.map(e => e.id);
      collectionData(attendantsQuery).subscribe((atts: any[]) => {
        // Count each attendant only once using overall payment status
        const statusCounts = { unpaid: 0, partial: 0, paid: 0 };
        for (const a of atts) {
          const status = a.paymentStatus ?? 'unpaid';
          if (status in statusCounts) {
            statusCounts[status as keyof typeof statusCounts]++;
          }
        }

        // Build pie data with unique attendant counts
        const pieData = [
          { name: 'UNPAID', y: statusCounts.unpaid },
          { name: 'PARTIAL', y: statusCounts.partial },
          { name: 'PAID', y: statusCounts.paid }
        ];

        const pieSeries: Highcharts.SeriesPieOptions = {
          type: 'pie',
          name: 'Attendants',
          data: pieData
        };

        this.chartOptions = { ...this.chartOptions, chart: { type: 'pie' }, series: [pieSeries] };
        this.renderChart();

        // build table rows (per-event breakdown with event-specific statuses)
        this.statusTableRows = eventIds.map((evtId, idx) => {
          const statusCounts = { unpaid: 0, partial: 0, paid: 0 };
          for (const a of atts) {
            const ep = a.eventPayments?.[evtId];
            const status = ep?.status ?? 'unpaid';
            if (status in statusCounts) {
              statusCounts[status as keyof typeof statusCounts]++;
            }
          }
          return {
            event: categories[idx],
            unpaid: statusCounts.unpaid,
            partial: statusCounts.partial,
            paid: statusCounts.paid
          };
        });
        
        console.log('Dashboard table rows:', this.statusTableRows);

        // Build t-shirt size distribution data
        this.buildTShirtSizeChart(atts);
      });
    });
  }

  private renderChart(): void {
    if (!this.chartEl) return;
    if (!this.chart) {
      this.chart = Highcharts.chart(this.chartEl.nativeElement, this.chartOptions);
    } else {
      this.chart.update(this.chartOptions as Highcharts.Options, true, true);
    }
  }

  private renderTShirtChart(): void {
    if (!this.tshirtChartEl) return;
    if (!this.tshirtChart) {
      this.tshirtChart = Highcharts.chart(this.tshirtChartEl.nativeElement, this.tshirtChartOptions);
    } else {
      this.tshirtChart.update(this.tshirtChartOptions as Highcharts.Options, true, true);
    }
  }

  private buildTShirtSizeChart(attendants: any[]): void {
    const tshirtSizes = ['18', 'S', 'M', 'L', 'XL'];
    const sizeCounts = tshirtSizes.map(size => {
      return attendants.filter(att => att.tShirtSize === size).length;
    });

    const tshirtSeries: Highcharts.SeriesColumnOptions = {
      type: 'column',
      name: 'Attendants',
      data: sizeCounts,
      color: '#1976d2'
    };

    this.tshirtChartOptions = { 
      ...this.tshirtChartOptions, 
      series: [tshirtSeries] 
    };
    this.renderTShirtChart();
  }

  get totalEvents(): number { return this.eventsCount().length; }
  get totalAttendants(): number { return this.attendantsCount().length; }
  get totalPayments(): number { return this.paymentsCount().length; }
}


