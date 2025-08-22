import { Component, computed, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './events.component.html'
})
export class EventsComponent {
  private readonly service = inject(EventsService);
  private readonly dialog = inject(MatDialog);

  protected readonly search = signal('');
  protected readonly allEvents = toSignal(this.service.getAll$(), { initialValue: [] as AppEvent[] });
  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const list = this.allEvents();
    if (!term) return list;
    return list.filter(e => (e.name?.toLowerCase().includes(term) || (e.description ?? '').toLowerCase().includes(term)));
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