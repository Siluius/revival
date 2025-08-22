import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { OrganizationsService } from '../../../shared/organizations/organizations.service';
import { Organization } from '../../../shared/organizations/organizations.interfaces';

@Component({
  selector: 'app-organization-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './organization-form-dialog.component.html'
})
export class OrganizationFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(OrganizationsService);
  private readonly dialogRef = inject(MatDialogRef<OrganizationFormDialogComponent>);
  protected readonly data = inject<Organization | undefined>(MAT_DIALOG_DATA, { optional: true });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: ['']
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({ name: this.data.name, description: this.data.description ?? '' });
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (this.data?.id) {
      await this.service.update(this.data.id, { name: value.name!, description: value.description ?? '' });
      this.dialogRef.close(this.data.id);
    } else {
      const id = await this.service.create({ name: value.name!, description: value.description ?? '' });
      this.dialogRef.close(id);
    }
  }
}