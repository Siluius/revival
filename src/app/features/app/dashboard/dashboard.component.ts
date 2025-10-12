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
  
  protected readonly paymentsCount = toSignal(collectionData(
    query(collection(this.firestore, 'payments'), 
      ...(this.company.selectedCompanyId() ? [where('companyId', '==', this.company.selectedCompanyId())] : [])
    )
  ).pipe(), { initialValue: [] as any[] });

  @ViewChild('chart', { static: false }) chartEl?: ElementRef<HTMLDivElement>;
  @ViewChild('tshirtChart', { static: false }) tshirtChartEl?: ElementRef<HTMLDivElement>;
  @ViewChild('financialChart', { static: false }) financialChartEl?: ElementRef<HTMLDivElement>;
  private chart?: Highcharts.Chart;
  private tshirtChart?: Highcharts.Chart;
  private financialChart?: Highcharts.Chart;
  
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

  protected financialChartOptions: Highcharts.Options = {
    chart: { type: 'column' },
    title: { text: 'Financial Status per Event' },
    xAxis: {
      categories: [],
      title: { text: 'Events' }
    },
    yAxis: {
      title: { text: 'Amount (USD)' },
      allowDecimals: true
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        dataLabels: { enabled: true, format: '${y:.2f}' }
      }
    },
    tooltip: {
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>${point.y:.2f}</b><br/>',
      shared: true
    },
    series: []
  };

  protected statusTableRows = signal<Array<{ event: string; unpaid: number; partial: number; paid: number }>>([]);

  constructor() {
    this.auth.authState$.subscribe((user: User | null) => this.displayName.set(user?.displayName ?? user?.email ?? null));

    const companyId = this.company.selectedCompanyId();
    console.log('Dashboard - Company ID for filtering:', companyId);
    
    const eventsQuery = companyId ? 
      query(collection(this.firestore, 'events'), where('companyId', '==', companyId)) : 
      collection(this.firestore, 'events');
    const attendantsQuery = companyId ? 
      query(collection(this.firestore, 'attendants'), where('companyId', '==', companyId)) : 
      collection(this.firestore, 'attendants');
    const paymentsQuery = companyId ? 
      query(collection(this.firestore, 'payments'), where('companyId', '==', companyId)) : 
      collection(this.firestore, 'payments');
      
    console.log('Dashboard queries - Events filtered by company:', !!companyId);
    console.log('Dashboard queries - Attendants filtered by company:', !!companyId);
    console.log('Dashboard queries - Payments filtered by company:', !!companyId);
      
    collectionData(eventsQuery, { idField: 'id' }).subscribe((events: any[]) => {
      const categories: string[] = events.map(e => e.name);
      const eventIds: string[] = events.map(e => e.id);
      collectionData(attendantsQuery).subscribe((atts: any[]) => {
        console.log('Attendants data:', atts);
        console.log('Sample attendant eventPayments:', atts[0]?.eventPayments);
        collectionData(paymentsQuery).subscribe((payments: any[]) => {
          console.log('Payments data:', payments);
          console.log('Events data:', events);
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
          const tableRows = eventIds.map((evtId, idx) => {
            const statusCounts = { unpaid: 0, partial: 0, paid: 0 };
            console.log(`\n=== STATUS TABLE Processing Event: ${categories[idx]} (${evtId}) ===`);
            
            let totalAttendantsForEvent = 0;
            for (const a of atts) {
              const ep = a.eventPayments?.[evtId];
              if (ep !== undefined) {
                totalAttendantsForEvent++;
                const status = ep?.status ?? 'unpaid';
                console.log(`STATUS TABLE: Attendant ${a.firstName} ${a.lastName} for event ${categories[idx]}: status ${status}`, ep);
                if (status in statusCounts) {
                  statusCounts[status as keyof typeof statusCounts]++;
                }
              }
            }
            console.log(`STATUS TABLE: Event ${categories[idx]} has ${totalAttendantsForEvent} total attendants`);
            
            console.log(`Event ${categories[idx]} final status counts:`, statusCounts);
            const row = {
              event: categories[idx],
              unpaid: statusCounts.unpaid,
              partial: statusCounts.partial,
              paid: statusCounts.paid
            };
            console.log(`Created table row:`, row);
            return row;
          });
          
          console.log('Dashboard table rows:', tableRows);
          console.log('Table rows length:', tableRows.length);
          
          // Set the signal with the new table rows
          this.statusTableRows.set(tableRows);

          // Build t-shirt size distribution data
          this.buildTShirtSizeChart(atts);
          
          // Build financial status chart
          this.buildFinancialChart(events, atts, payments);
        });
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

  private renderFinancialChart(): void {
    if (!this.financialChartEl) return;
    if (!this.financialChart) {
      this.financialChart = Highcharts.chart(this.financialChartEl.nativeElement, this.financialChartOptions);
    } else {
      this.financialChart.update(this.financialChartOptions as Highcharts.Options, true, true);
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

  private buildFinancialChart(events: any[], attendants: any[], payments: any[]): void {
    console.log('=== Financial Chart - Company Filtering Verification ===');
    console.log('Events loaded:', events.length, 'events');
    console.log('Attendants loaded:', attendants.length, 'attendants');
    console.log('Payments loaded:', payments.length, 'payments');
    
    // Verify company filtering
    if (events.length > 0) {
      console.log('Sample event companyId:', events[0].companyId);
    }
    if (attendants.length > 0) {
      console.log('Sample attendant companyId:', attendants[0].companyId);
    }
    if (payments.length > 0) {
      console.log('Sample payment companyId:', payments[0].companyId);
    }
    
    const eventCategories = events.map(e => e.name);
    const collectedData: number[] = [];
    const remainingData: number[] = [];

    events.forEach(event => {
      console.log(`Processing event: ${event.name} (${event.id}) - Cost: $${event.costUSD || 0}`);
      
      // Calculate expected amount: Event cost × Number of attendants registered for this event
      // Use the same logic as the status table - count all attendants with any status for this event
      const eventAttendants = attendants.filter(att => {
        const ep = att.eventPayments?.[event.id];
        console.log(`Checking attendant ${att.firstName} ${att.lastName} for event ${event.name}:`, {
          hasEventPayments: !!att.eventPayments,
          eventId: event.id,
          eventPayment: ep,
          isRegistered: ep !== undefined
        });
        return ep !== undefined; // Any attendant with any status for this event
      });
      console.log(`Event ${event.name} has ${eventAttendants.length} attendants registered (same as status table)`);
      
      const eventCost = event.costUSD || 0;
      const expectedAmount = eventCost * eventAttendants.length;
      console.log(`Event ${event.name}: Cost per attendant $${eventCost} × ${eventAttendants.length} attendants = $${expectedAmount} expected`);

      // Calculate collected amount from payments for this event
      const eventPayments = payments.filter(payment => 
        payment.eventId === event.id
      );
      console.log(`Event ${event.name} has ${eventPayments.length} payments`);
      
      const collectedAmount = eventPayments.reduce((sum, payment) => {
        const amount = payment.amountUSD || 0;
        return sum + amount;
      }, 0);

      console.log(`Event ${event.name}: Expected=${expectedAmount}, Collected=${collectedAmount}, Remaining=${expectedAmount - collectedAmount}`);
      
      collectedData.push(collectedAmount);
      // Remaining = Expected - Collected (event cost × attendants minus what we've collected)
      remainingData.push(Math.max(0, expectedAmount - collectedAmount));
    });

    console.log('Financial Chart Data:', {
      events: eventCategories,
      collected: collectedData,
      remaining: remainingData
    });

    const collectedSeries: Highcharts.SeriesColumnOptions = {
      type: 'column',
      name: 'Collected',
      data: collectedData,
      color: '#4caf50'
    };

    const remainingSeries: Highcharts.SeriesColumnOptions = {
      type: 'column',
      name: 'Remaining',
      data: remainingData,
      color: '#ff9800'
    };

    this.financialChartOptions = {
      ...this.financialChartOptions,
      xAxis: {
        ...this.financialChartOptions.xAxis,
        categories: eventCategories
      },
      series: [collectedSeries, remainingSeries]
    };
    this.renderFinancialChart();
  }

  get totalEvents(): number { return this.eventsCount().length; }
  get totalAttendants(): number { return this.attendantsCount().length; }
  get totalPayments(): number { return this.paymentsCount().length; }
}


