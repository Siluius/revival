import { Component, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EventsService, AppEvent, EventStatus } from '../../../shared/events/events.service';
import { EventFormDialogComponent } from './event-form-dialog.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './events.component.html'
})
export class EventsComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  private readonly dialog = inject(MatDialog);

  displayedColumns: string[] = ['name', 'description', 'status', 'start', 'end', 'actions'];
  dataSource = new MatTableDataSource<AppEvent>([]);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<EventStatus | 'all'>('all');

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: AppEvent, filter: string) => {
      const f = JSON.parse(filter) as { q: string; status: EventStatus | 'all' };
      const term = f.q.toLowerCase();
      const matchesTerm =
        data.name.toLowerCase().includes(term) ||
        data.description.toLowerCase().includes(term) ||
        data.status.toLowerCase().includes(term);
      const matchesStatus = f.status === 'all' ? true : data.status === f.status;
      return matchesTerm && matchesStatus;
    };

    this.eventsService.streamAll$().subscribe(rows => {
      this.dataSource.data = rows;
      this.applyFilter();
    });

    effect(() => {
      // react to changes in search or status
      this.applyFilter();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(): void {
    const filterValue = JSON.stringify({ q: this.search().trim().toLowerCase(), status: this.statusFilter() });
    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(EventFormDialogComponent, { data: null });
    ref.afterClosed().subscribe();
  }

  openEditDialog(event: AppEvent): void {
    const ref = this.dialog.open(EventFormDialogComponent, { data: event });
    ref.afterClosed().subscribe();
  }
}