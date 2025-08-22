import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';
import { OrganizationFormDialogComponent } from './organization-form-dialog.component';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule, MatSortModule, MatPaginatorModule],
  templateUrl: './organizations.component.html'
})
export class OrganizationsComponent {
  private readonly service = inject(OrganizationsService);
  private readonly dialog = inject(MatDialog);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  protected readonly search = signal('');
  protected readonly allOrganizations = toSignal(this.service.getAll$(), { initialValue: [] as Organization[] });
  protected readonly sortState = signal<Sort>({ active: 'name', direction: 'asc' });

  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const list = this.allOrganizations();
    const filtered = !term ? list : list.filter(o => (o.name?.toLowerCase().includes(term) || (o.description ?? '').toLowerCase().includes(term)));
    const s = this.sortState();
    const sorted = [...filtered].sort((a, b) => {
      const dir = s.direction === 'desc' ? -1 : 1;
      const av = (a as any)[s.active] ?? '';
      const bv = (b as any)[s.active] ?? '';
      return String(av).localeCompare(String(bv)) * dir;
    });
    const pageIndex = this.paginator?.pageIndex ?? 0;
    const pageSize = this.paginator?.pageSize ?? sorted.length;
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  });

  protected readonly displayedColumns = ['name', 'description', 'actions'] as const;

  trackById(_index: number, item: Organization): string { return item.id; }

  add(): void {
    this.dialog.open(OrganizationFormDialogComponent, { width: '480px' });
  }

  edit(org: Organization): void {
    this.dialog.open(OrganizationFormDialogComponent, { width: '480px', data: org });
  }

  onSort(sort: Sort) { this.sortState.set(sort); }
}
