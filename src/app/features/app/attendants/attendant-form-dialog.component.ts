import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { AttendantsService } from '../../../shared/attendants/attendants.service';
import { Attendant, Gender } from '../../../shared/attendants/attendants.interfaces';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrganizationFormDialogComponent } from '../organizations/organization-form-dialog.component';

@Component({
  selector: 'app-attendant-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatIconModule],
  templateUrl: './attendant-form-dialog.component.html'
})
export class AttendantFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AttendantsService);
  private readonly orgService = inject(OrganizationsService);
  private readonly dialogRef = inject(MatDialogRef<AttendantFormDialogComponent>);
  private readonly dialog = inject(MatDialog);
  protected readonly data = inject<Attendant | undefined>(MAT_DIALOG_DATA, { optional: true });

  protected readonly organizations = toSignal(this.orgService.getAll$(), { initialValue: [] as Organization[] });

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    address: [''],
    dateOfBirth: [null as Date | null],
    gender: [null as Gender | null],
    organizationId: [null as string | null]
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({
        firstName: this.data.firstName,
        lastName: this.data.lastName,
        address: this.data.address ?? '',
        dateOfBirth: this.data.dateOfBirth ? new Date(this.data.dateOfBirth) : null,
        gender: this.data.gender ?? null,
        organizationId: this.data.organizationId ?? null
      });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload = {
      firstName: value.firstName!,
      lastName: value.lastName!,
      address: value.address ?? '',
      dateOfBirth: value.dateOfBirth ?? null,
      gender: value.gender ?? null,
      organizationId: value.organizationId ?? null
    };
    if (this.data?.id) {
      await this.service.update(this.data.id, payload);
    } else {
      await this.service.create(payload);
    }
    this.dialogRef.close(true);
  }

  addOrganization(): void {
    const ref = this.dialog.open(OrganizationFormDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((result?: string | boolean) => {
      if (typeof result === 'string' && result) {
        this.form.patchValue({ organizationId: result });
      }
    });
  }
}