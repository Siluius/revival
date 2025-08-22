import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { AttendantsService } from '../../../shared/attendants/attendants.service';
import { Attendant, PaymentStatus, Gender } from '../../../shared/attendants/attendants.interfaces';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';
import { AttendantFormDialogComponent } from './attendant-form-dialog.component';
import { FindByIdPipe } from '../../../shared/utils/find-by-id.pipe';

@Component({
  selector: 'app-attendants',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDialogModule, FindByIdPipe],
  templateUrl: './attendants.component.html'
})
export class AttendantsComponent {
  private readonly service = inject(AttendantsService);
  private readonly orgService = inject(OrganizationsService);
  private readonly dialog = inject(MatDialog);

  protected readonly search = signal('');
  protected readonly paymentStatus = signal<PaymentStatus | 'all'>('all');
  protected readonly gender = signal<Gender | 'all'>('all');
  protected readonly organizationId = signal<string | 'all'>('all');

  protected readonly allAttendants = toSignal(this.service.getAll$(), { initialValue: [] as Attendant[] });
  protected readonly organizations = toSignal(this.orgService.getAll$(), { initialValue: [] as Organization[] });

  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const gender = this.gender();
    const payment = this.paymentStatus();
    const orgId = this.organizationId();
    return this.allAttendants().filter(a => {
      const matchesTerm = !term || `${a.firstName} ${a.lastName}`.toLowerCase().includes(term) || (a.address ?? '').toLowerCase().includes(term);
      const matchesGender = gender === 'all' || a.gender === gender;
      const matchesPayment = payment === 'all' || a.paymentStatus === payment;
      const matchesOrg = orgId === 'all' || a.organizationId === orgId;
      return matchesTerm && matchesGender && matchesPayment && matchesOrg;
    });
  });

  protected readonly displayedColumns = ['name', 'gender', 'organization', 'paymentStatus', 'actions'] as const;

  trackById(_index: number, item: Attendant): string { return item.id; }

  add(): void {
    this.dialog.open(AttendantFormDialogComponent, { width: '640px' });
  }

  edit(row: Attendant): void {
    this.dialog.open(AttendantFormDialogComponent, { width: '640px', data: row });
  }
}
