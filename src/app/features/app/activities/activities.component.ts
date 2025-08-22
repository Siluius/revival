import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivitiesService } from '../../../shared/activities/activities.service';
import { ActivityModule, ActivityRecord } from '../../../shared/activities/activities.interfaces';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  templateUrl: './activities.component.html'
})
export class ActivitiesComponent {
  private readonly service = inject(ActivitiesService);

  protected readonly module = signal<ActivityModule | 'all'>('all');
  protected readonly userId = signal<string | 'all'>('all');
  protected readonly search = signal('');

  protected readonly all = toSignal(this.service.getAll$(), { initialValue: [] as ActivityRecord[] });
  protected readonly filtered = computed(() => {
    const mod = this.module();
    const uid = this.userId();
    const q = this.search().toLowerCase().trim();
    return this.all().filter(r => {
      const matchesMod = mod === 'all' || r.module === mod;
      const matchesUser = uid === 'all' || r.userId === uid;
      const detailsText = JSON.stringify(r.details ?? '').toLowerCase();
      const who = `${r.userEmail ?? ''} ${r.userDisplayName ?? ''}`.toLowerCase();
      const matchesSearch = !q || `${r.action} ${r.module} ${r.entityCollection ?? ''} ${r.entityId ?? ''} ${who} ${detailsText}`.includes(q);
      return matchesMod && matchesUser && matchesSearch;
    });
  });

  protected readonly displayedColumns = ['when', 'module', 'action', 'entity', 'who', 'details'] as const;
}