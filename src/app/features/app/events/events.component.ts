import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { EventsService } from '../../../shared/events/events.service';
import { AppEvent } from '../../../shared/events/events.interfaces';
import { EventFormDialogComponent } from './event-form-dialog.component';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule, MatSortModule, MatPaginatorModule],
  templateUrl: './events.component.html'
})
export class EventsComponent {
  private readonly service = inject(EventsService);
  private readonly dialog = inject(MatDialog);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  protected readonly search = signal('');
  protected readonly allEvents = toSignal(this.service.getAll$(), { initialValue: [] as AppEvent[] });
  protected readonly sortState = signal<Sort>({ active: 'name', direction: 'asc' });

  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const list = this.allEvents().filter(e => !term || e.name?.toLowerCase().includes(term) || (e.description ?? '').toLowerCase().includes(term));
    const s = this.sortState();
    const sorted = [...list].sort((a, b) => {
      const dir = s.direction === 'desc' ? -1 : 1;
      const av = ((): any => {
        switch (s.active) {
          case 'name': return a.name ?? '';
          case 'description': return a.description ?? '';
          case 'costUSD': return Number(a.costUSD ?? 0);
          default: return a.name ?? '';
        }
      })();
      const bv = ((): any => {
        switch (s.active) {
          case 'name': return b.name ?? '';
          case 'description': return b.description ?? '';
          case 'costUSD': return Number(b.costUSD ?? 0);
          default: return b.name ?? '';
        }
      })();
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? sorted.length;
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  });

  protected readonly displayedColumns = ['name', 'description', 'costUSD', 'actions'] as const;

  trackById(_index: number, item: AppEvent): string { return item.id; }

  add(): void {
    this.dialog.open(EventFormDialogComponent, { width: '480px' });
  }

  edit(evt: AppEvent): void {
    this.dialog.open(EventFormDialogComponent, { width: '480px', data: evt });
  }
}