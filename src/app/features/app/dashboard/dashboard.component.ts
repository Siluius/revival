import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import type { User } from '@angular/fire/auth';
import { AuthService } from '../../../shared/auth/auth.service';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
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
  protected readonly displayName = signal<string | null>('');

  protected readonly eventsCount = toSignal(collectionData(collection(this.firestore, 'events')).pipe(), { initialValue: [] as any[] });
  protected readonly attendantsCount = toSignal(collectionData(collection(this.firestore, 'attendants')).pipe(), { initialValue: [] as any[] });
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

  protected statusTableRows: Array<{ event: string; unpaid: number; partial: number; paid: number; cancelled: number }> = [];

  constructor() {
    this.auth.authState$.subscribe((user: User | null) => this.displayName.set(user?.displayName ?? user?.email ?? null));

    collectionData(collection(this.firestore, 'events'), { idField: 'id' }).subscribe((events: any[]) => {
      const categories: string[] = events.map(e => e.name);
      const eventIds: string[] = events.map(e => e.id);
      collectionData(collection(this.firestore, 'attendants')).subscribe((atts: any[]) => {
        const statuses = ['unpaid', 'partial', 'paid', 'cancelled'] as const;
        const series = statuses.map(status => {
          const data = eventIds.map(evtId => {
            let count = 0;
            for (const a of atts) {
              const ep = a.eventPayments?.[evtId];
              if (ep && ep.status === status) count++;
            }
            return count;
          });
          return { type: 'column', name: status.toUpperCase(), data } as Highcharts.SeriesColumnOptions;
        });

        // Build pie data by aggregating totals across all events
        const pieData = series.map(s => ({
          name: s.name || '',
          y: (s.data as number[]).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
        }));

        const pieSeries: Highcharts.SeriesPieOptions = {
          type: 'pie',
          name: 'Attendants',
          data: pieData
        };

        this.chartOptions = { ...this.chartOptions, chart: { type: 'pie' }, series: [pieSeries] };
        this.renderChart();

        // build table rows (per-event breakdown remains unchanged)
        this.statusTableRows = eventIds.map((evtId, idx) => ({
          event: categories[idx],
          unpaid: (series[0].data as number[])[idx] ?? 0,
          partial: (series[1].data as number[])[idx] ?? 0,
          paid: (series[2].data as number[])[idx] ?? 0,
          cancelled: (series[3].data as number[])[idx] ?? 0
        }));

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


