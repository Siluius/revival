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
  private chart?: Highcharts.Chart;
  protected chartOptions: Highcharts.Options = {
    chart: { type: 'column' },
    title: { text: 'Attendants by Status per Event' },
    xAxis: { categories: [] },
    yAxis: { min: 0, title: { text: 'Attendants' } },
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
        this.chartOptions = { ...this.chartOptions, xAxis: { categories }, series };
        this.renderChart();
        // build table rows
        this.statusTableRows = eventIds.map((evtId, idx) => ({
          event: categories[idx],
          unpaid: (series[0].data as number[])[idx] ?? 0,
          partial: (series[1].data as number[])[idx] ?? 0,
          paid: (series[2].data as number[])[idx] ?? 0,
          cancelled: (series[3].data as number[])[idx] ?? 0
        }));
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

  get totalEvents(): number { return this.eventsCount().length; }
  get totalAttendants(): number { return this.attendantsCount().length; }
  get totalPayments(): number { return this.paymentsCount().length; }
}


