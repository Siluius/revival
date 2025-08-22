import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AttendantsService } from '../../../shared/attendants/attendants.service';
import { Attendant, PaymentStatus, Gender } from '../../../shared/attendants/attendants.interfaces';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';
import { AttendantFormDialogComponent } from './attendant-form-dialog.component';
import { FindByIdPipe } from '../../../shared/utils/find-by-id.pipe';
import { EventsService } from '../../../shared/events/events.service';
import { AppEvent } from '../../../shared/events/events.interfaces';
import { PaymentFormDialogComponent } from '../../payments/payment-form-dialog.component';

@Component({
  selector: 'app-attendants',
  standalone: true,
  imports: [CommonModule, RouterLink, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDialogModule, FindByIdPipe],
  templateUrl: './attendants.component.html'
})
export class AttendantsComponent {
  private readonly service = inject(AttendantsService);
  private readonly orgService = inject(OrganizationsService);
  private readonly eventsService = inject(EventsService);
  private readonly dialog = inject(MatDialog);

  protected readonly search = signal('');
  protected readonly paymentStatus = signal<PaymentStatus | 'all'>('all');
  protected readonly gender = signal<Gender | 'all'>('all');
  protected readonly organizationId = signal<string | 'all'>('all');
  protected readonly eventId = signal<string | 'all'>('all');

  protected readonly allAttendants = toSignal(this.service.getAll$(), { initialValue: [] as Attendant[] });
  protected readonly organizations = toSignal(this.orgService.getAll$(), { initialValue: [] as Organization[] });
  protected readonly events = toSignal(this.eventsService.getAll$(), { initialValue: [] as AppEvent[] });

  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const gender = this.gender();
    const payment = this.paymentStatus();
    const orgId = this.organizationId();
    const evtId = this.eventId();
    return this.allAttendants().filter(a => {
      const matchesTerm = !term || `${a.firstName} ${a.lastName}`.toLowerCase().includes(term) || (a.address ?? '').toLowerCase().includes(term);
      const matchesGender = gender === 'all' || a.gender === gender;
      const matchesOrg = orgId === 'all' || a.organizationId === orgId;
      const effectiveStatus: PaymentStatus | null = evtId === 'all' ? (a.paymentStatus ?? null) : (a.eventPayments?.[evtId]?.status ?? null);
      const matchesPayment = payment === 'all' || effectiveStatus === payment;
      return matchesTerm && matchesGender && matchesPayment && matchesOrg;
    });
  });

  protected readonly displayedColumns = ['name', 'gender', 'organization', 'paymentStatus', 'payments', 'actions'] as const;

  trackById(_index: number, item: Attendant): string { return item.id; }

  add(): void {
    this.dialog.open(AttendantFormDialogComponent, { width: '640px' });
  }

  edit(row: Attendant): void {
    this.dialog.open(AttendantFormDialogComponent, { width: '640px', data: row });
  }

  addPayment(row: Attendant): void {
    this.dialog.open(PaymentFormDialogComponent, { width: '560px', data: { attendant: row } });
  }

  viewPayments(row: Attendant): void {
    // navigation will be handled via routerLink in template
  }
}
