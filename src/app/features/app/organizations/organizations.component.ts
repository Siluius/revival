import { Component, computed, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './organizations.component.html'
})
export class OrganizationsComponent {
  private readonly service = inject(OrganizationsService);
  private readonly dialog = inject(MatDialog);

  protected readonly search = signal('');
  protected readonly allOrganizations = toSignal(this.service.getAll$(), { initialValue: [] as Organization[] });
  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const list = this.allOrganizations();
    if (!term) return list;
    return list.filter(o => (o.name?.toLowerCase().includes(term) || (o.description ?? '').toLowerCase().includes(term)));
  });

  protected readonly displayedColumns = ['name', 'description', 'actions'] as const;

  trackById(_index: number, item: Organization): string { return item.id; }

  add(): void {
    this.dialog.open(OrganizationFormDialogComponent, { width: '480px' });
  }

  edit(org: Organization): void {
    this.dialog.open(OrganizationFormDialogComponent, { width: '480px', data: org });
  }
}