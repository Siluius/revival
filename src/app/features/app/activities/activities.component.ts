import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivitiesService } from '../../../shared/activities/activities.service';
import { ActivityModule, ActivityRecord } from '../../../shared/activities/activities.interfaces';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatSortModule, MatPaginatorModule],
  templateUrl: './activities.component.html'
})
export class ActivitiesComponent {
  private readonly service = inject(ActivitiesService);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  protected readonly module = signal<ActivityModule | 'all'>('all');
  protected readonly userId = signal<string | 'all'>('all');
  protected readonly search = signal('');

  protected readonly all = toSignal(this.service.getAll$(), { initialValue: [] as ActivityRecord[] });
  protected readonly sortState = signal<Sort>({ active: 'when', direction: 'desc' });

  protected readonly filtered = computed(() => {
    const mod = this.module();
    const uid = this.userId();
    const q = this.search().toLowerCase().trim();
    const list = this.all().filter(r => {
      const matchesMod = mod === 'all' || r.module === mod;
      const matchesUser = uid === 'all' || r.userId === uid;
      const detailsText = JSON.stringify(r.details ?? '').toLowerCase();
      const who = `${r.userEmail ?? ''} ${r.userDisplayName ?? ''}`.toLowerCase();
      const matchesSearch = !q || `${r.action} ${r.module} ${r.entityCollection ?? ''} ${r.entityId ?? ''} ${who} ${detailsText}`.includes(q);
      return matchesMod && matchesUser && matchesSearch;
    });
    const s = this.sortState();
    const sorted = [...list].sort((a, b) => {
      const dir = s.direction === 'desc' ? -1 : 1;
      const av = ((): any => {
        switch (s.active) {
          case 'when': return (a.createdAt as any) ?? 0;
          case 'module': return a.module;
          case 'action': return a.action;
          case 'entity': return `${a.entityCollection}/${a.entityId}`;
          case 'who': return a.userDisplayName ?? a.userEmail ?? a.userId ?? '';
          default: return (a.createdAt as any) ?? 0;
        }
      })();
      const bv = ((): any => {
        switch (s.active) {
          case 'when': return (b.createdAt as any) ?? 0;
          case 'module': return b.module;
          case 'action': return b.action;
          case 'entity': return `${b.entityCollection}/${b.entityId}`;
          case 'who': return b.userDisplayName ?? b.userEmail ?? b.userId ?? '';
          default: return (b.createdAt as any) ?? 0;
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

  protected readonly displayedColumns = ['when', 'module', 'action', 'entity', 'who', 'details'] as const;
}